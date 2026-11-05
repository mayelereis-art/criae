import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { OPERACOES } from "@/config/planos";
import { adminAtual } from "@/lib/admin";
import { ajustarCreditos, lerConfiguracao, lerPlanos } from "@/lib/creditos/servidor";
import { dbAdmin } from "@/lib/firebase/admin";

const nao = () => NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
const emMs = (v: unknown) => (v && typeof (v as { toMillis?: unknown }).toMillis === "function" ? (v as { toMillis(): number }).toMillis() : null);

/** Tudo do painel, a partir do banco: nenhum número aqui é estimado. */
export async function GET() {
  const admin = await adminAtual();
  if (!admin) return nao();
  const db = dbAdmin();
  const trintaDias = new Date(Date.now() - 30 * 864e5);
  const [contas, creditos, assinaturas, movimentos, pagamentos, planos, config] = await Promise.all([
    db.collection("usuarios").limit(500).get(),
    db.collection("creditos").get(),
    db.collection("assinaturas").get(),
    db.collection("movimentos_creditos").where("criadoEm", ">=", trintaDias).get(),
    db.collection("pagamentos_assinatura").where("criadoEm", ">=", trintaDias).get(),
    lerPlanos(),
    lerConfiguracao(),
  ]);
  const saldoDe = new Map(creditos.docs.map((d) => [d.id, d.data()]));
  const assinaturaDe = new Map(assinaturas.docs.map((d) => [d.id, d.data()]));

  const usados = new Map<string, number>();
  const porOperacao = new Map<string, { chamadas: number; creditos: number; entrada: number; saida: number; imagens: number; custoTextoUsd: number }>();
  for (const m of movimentos.docs.map((d) => d.data())) {
    if (m.tipo !== "debito") continue;
    usados.set(m.donoId, (usados.get(m.donoId) ?? 0) - m.creditos);
    const o = porOperacao.get(m.operacao) ?? { chamadas: 0, creditos: 0, entrada: 0, saida: 0, imagens: 0, custoTextoUsd: 0 };
    o.chamadas++; o.creditos -= m.creditos; o.entrada += m.entrada ?? 0; o.saida += m.saida ?? 0; o.imagens += m.imagens ?? 0; o.custoTextoUsd += m.custoTextoUsd ?? 0;
    porOperacao.set(m.operacao, o);
  }

  const usuarios = contas.docs.map((d) => {
    const u = d.data();
    const a = assinaturaDe.get(d.id);
    const c = saldoDe.get(d.id);
    return {
      uid: d.id, email: u.email ?? "", nome: u.nome ?? "", criadoEm: emMs(u.criadoEm),
      saldo: c?.saldo ?? null, bloqueado: !!c?.bloqueado, usados30d: usados.get(d.id) ?? 0,
      planoId: a?.planoId ?? null, status: a?.status ?? null, renovaEm: emMs(a?.renovaEm),
    };
  });
  const precoDe = new Map(planos.map((p) => [p.id, p.precoCentavos]));
  const ativas = assinaturas.docs.map((d) => d.data()).filter((a) => a.status === "ativa");
  const pagos = pagamentos.docs.map((d) => d.data()).filter((p) => p.status === "pago");

  return NextResponse.json({
    resumo: {
      usuarios: contas.size, assinaturasAtivas: ativas.length,
      inadimplentes: assinaturas.docs.filter((d) => d.data().status === "inadimplente").length,
      receitaRecorrenteCentavos: ativas.reduce((s, a) => s + (precoDe.get(a.planoId) ?? 0), 0),
      recebido30dCentavos: pagos.reduce((s, p) => s + (p.valorCentavos ?? 0), 0),
      limiteListaAtingido: contas.size >= 500,
    },
    usuarios, planos, config,
    consumo: [...porOperacao.entries()].map(([operacao, v]) => ({ operacao, nome: OPERACOES[operacao as keyof typeof OPERACOES]?.nome ?? operacao, ...v })).sort((a, b) => b.creditos - a.creditos),
  });
}

const plano = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,30}$/, "Identificador inválido."), nome: z.string().trim().min(2).max(40), descricao: z.string().trim().max(200),
  precoCentavos: z.number().int().min(100, "Preço mínimo de R$ 1,00.").max(10_000_000), creditosMes: z.number().int().min(0).max(1_000_000),
  maxProdutos: z.number().int().min(1).max(100_000), diasTolerancia: z.number().int().min(0).max(30), ativo: z.boolean(), ordem: z.number().int().min(0).max(100),
});
const acoes = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("plano"), plano }),
  z.object({ acao: z.literal("config"), custos: z.record(z.string(), z.number().int().min(0).max(10_000)), creditosIniciais: z.number().int().min(0).max(100_000) }),
  z.object({ acao: z.literal("ajustar"), uid: z.string().max(128), delta: z.number().int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, "Informe um valor diferente de zero."), motivo: z.string().trim().min(3, "Informe o motivo.").max(200) }),
  z.object({ acao: z.literal("suspender"), uid: z.string().max(128), bloqueado: z.boolean() }),
]);

export async function POST(req: Request) {
  const admin = await adminAtual();
  if (!admin) return nao();
  const p = acoes.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: p.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const d = p.data;
  const db = dbAdmin();
  if (d.acao === "plano") await db.collection("planos").doc(d.plano.id).set(d.plano);
  if (d.acao === "config") {
    const custos = Object.fromEntries(Object.entries(d.custos).filter(([k]) => k in OPERACOES));
    await db.collection("configuracoes").doc("creditos").set({ custos, creditosIniciais: d.creditosIniciais }, { merge: true });
  }
  if (d.acao === "ajustar") await ajustarCreditos(d.uid, d.delta, d.motivo, admin.uid);
  if (d.acao === "suspender") await db.collection("creditos").doc(d.uid).set({ bloqueado: d.bloqueado }, { merge: true });
  await db.collection("logs").add({ evento: "admin", acao: d.acao, adminUid: admin.uid, alvo: "uid" in d ? d.uid : d.acao === "plano" ? d.plano.id : null, criadoEm: FieldValue.serverTimestamp() });
  return NextResponse.json({ ok: true });
}
