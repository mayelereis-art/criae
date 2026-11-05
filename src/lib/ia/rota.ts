import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { usuarioAtual, type UsuarioSessao } from "../sessao";
import type { Operacao } from "@/config/planos";
import { ErroCreditos, estornarCreditos, registrarUso, reservarCreditos } from "../creditos/servidor";
import { dbAdmin } from "../firebase/admin";
import { recarregarVitalicio, sincronizarAssinatura } from "../pagamentos/assinaturas";
import { ErroIA } from "./claude";
import { medidor, type Medicao } from "./medidor";

// Freio contra abuso, além dos créditos. Em memória: vale por instância do servidor.
const JANELA_MS = 60 * 60 * 1000;
const MAX_POR_JANELA = 60;
const chamadas = new Map<string, number[]>();

function dentroDoLimite(uid: string) {
  const agora = Date.now();
  const recentes = (chamadas.get(uid) ?? []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= MAX_POR_JANELA) return false;
  recentes.push(agora);
  chamadas.set(uid, recentes);
  return true;
}

/** Envelope comum das rotas de IA: sessão, limite, validação de entrada, créditos, erros e log. */
export async function rotaIA<E extends z.ZodType, R>(
  req: Request,
  operacaoDoPedido: Operacao | ((dados: z.infer<E>) => Operacao),
  entrada: E,
  executar: (dados: z.infer<E>, usuario: UsuarioSessao) => Promise<R>,
) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  if (!dentroDoLimite(usuario.uid))
    return NextResponse.json({ erro: "Limite de gerações por hora atingido. Tente mais tarde." }, { status: 429 });

  const parse = entrada.safeParse(await req.json().catch(() => null));
  if (!parse.success) return NextResponse.json({ erro: parse.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });

  const operacao = typeof operacaoDoPedido === "function" ? operacaoDoPedido(parse.data) : operacaoDoPedido;
  const inicio = Date.now();
  let reserva: Awaited<ReturnType<typeof reservarCreditos>>;
  try {
    await recarregarVitalicio(usuario.uid).catch((e) => console.error(JSON.stringify({ evento: "recarga-vitalicio", ok: false, erro: String(e).slice(0, 200) })));
    // Venceu o período: confere a renovação no Mercado Pago, caso o aviso não tenha chegado.
    const assinatura = (await dbAdmin().collection("assinaturas").doc(usuario.uid).get()).data();
    if (assinatura?.status === "ativa" && assinatura.renovaEm?.toMillis() <= Date.now()) await sincronizarAssinatura(usuario.uid).catch((e) => console.error(JSON.stringify({ evento: "sincronizar-assinatura", ok: false, erro: String(e).slice(0, 200) })));
    reserva = await reservarCreditos(usuario.uid, operacao);
  } catch (e) {
    if (e instanceof ErroCreditos) return NextResponse.json({ erro: e.message, codigo: "creditos" }, { status: e.status });
    console.error(JSON.stringify({ evento: "creditos", operacao, uid: usuario.uid, ok: false, erro: String(e).slice(0, 300) }));
    return NextResponse.json({ erro: "Não foi possível conferir seus créditos. Tente de novo." }, { status: 500 });
  }

  const medicao: Medicao = { entrada: 0, saida: 0, imagens: 0, custoTextoUsd: 0 };
  try {
    const resultado = await medidor.run(medicao, () => executar(parse.data, usuario));
    const ms = Date.now() - inicio;
    await registrarUso(reserva.movimentoId, medicao, ms).catch(() => {});
    console.info(JSON.stringify({ evento: "ia", operacao, uid: usuario.uid, ok: true, ms, creditos: reserva.custo, ...medicao }));
    return NextResponse.json(resultado);
  } catch (e) {
    // Falhou: o crédito volta.
    await estornarCreditos(usuario.uid, operacao, reserva).catch((x) => console.error(JSON.stringify({ evento: "estorno", uid: usuario.uid, ok: false, erro: String(x).slice(0, 200) })));
    const status = e instanceof ErroIA ? e.status : 500;
    console.error(JSON.stringify({ evento: "ia", operacao, uid: usuario.uid, ok: false, ms: Date.now() - inicio, erro: String(e) }));
    return NextResponse.json({ erro: e instanceof ErroIA ? e.message : "Erro inesperado ao gerar. Tente de novo." }, { status });
  }
}
