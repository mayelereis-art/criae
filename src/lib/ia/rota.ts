import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { usuarioAtual, type UsuarioSessao } from "../sessao";
import { ErroIA } from "./claude";

// Limite simples por usuário enquanto o sistema de créditos (Etapa 7) não existe.
// Em memória: vale por instância do servidor, só freia abuso grosseiro.
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

/** Envelope comum das rotas de IA: sessão, limite, validação de entrada, erros e log. */
export async function rotaIA<E extends z.ZodType, R>(
  req: Request,
  operacao: string,
  entrada: E,
  executar: (dados: z.infer<E>, usuario: UsuarioSessao) => Promise<R>,
) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  if (!dentroDoLimite(usuario.uid))
    return NextResponse.json({ erro: "Limite de gerações por hora atingido. Tente mais tarde." }, { status: 429 });

  const parse = entrada.safeParse(await req.json().catch(() => null));
  if (!parse.success) return NextResponse.json({ erro: parse.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });

  const inicio = Date.now();
  try {
    const resultado = await executar(parse.data, usuario);
    console.info(JSON.stringify({ evento: "ia", operacao, uid: usuario.uid, ok: true, ms: Date.now() - inicio }));
    return NextResponse.json(resultado);
  } catch (e) {
    const status = e instanceof ErroIA ? e.status : 500;
    console.error(JSON.stringify({ evento: "ia", operacao, uid: usuario.uid, ok: false, ms: Date.now() - inicio, erro: String(e) }));
    return NextResponse.json({ erro: e instanceof ErroIA ? e.message : "Erro inesperado ao gerar. Tente de novo." }, { status });
  }
}
