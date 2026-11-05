import "server-only";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { CREDITOS_INICIAIS_PADRAO, PLANOS_PADRAO, custosPadrao, type Operacao, type Plano } from "@/config/planos";
import { dbAdmin } from "../firebase/admin";
import type { Medicao } from "../ia/medidor";

export class ErroCreditos extends Error {
  constructor(message: string, public status = 402) {
    super(message);
  }
}

export async function lerConfiguracao() {
  const d = (await dbAdmin().collection("configuracoes").doc("creditos").get()).data();
  return { custos: { ...custosPadrao(), ...(d?.custos ?? {}) } as Record<Operacao, number>, creditosIniciais: typeof d?.creditosIniciais === "number" ? d.creditosIniciais : CREDITOS_INICIAIS_PADRAO };
}

export async function lerPlanos(): Promise<Plano[]> {
  const s = await dbAdmin().collection("planos").get();
  const salvos = new Map(s.docs.map((d) => [d.id, { ...d.data(), id: d.id } as Plano]));
  return [...PLANOS_PADRAO.map((p) => salvos.get(p.id) ?? p), ...[...salvos.values()].filter((p) => !PLANOS_PADRAO.some((x) => x.id === p.id))].sort((a, b) => a.ordem - b.ordem);
}

const data = (v: unknown) => (v && typeof (v as { toMillis?: unknown }).toMillis === "function" ? (v as { toMillis(): number }).toMillis() : null);

/** A regra de quem pode usar a IA. Pura: leitura, vendas e páginas publicadas nunca dependem dela. */
export function motivoBloqueio(assinatura: Record<string, unknown> | undefined, plano: Plano | undefined, agora = Date.now()): string | null {
  const status = assinatura?.status;
  if (status === "inadimplente") {
    const desde = data(assinatura?.inadimplenteDesde) ?? agora;
    if (agora - desde > (plano?.diasTolerancia ?? 3) * 864e5) return "O pagamento da sua assinatura não foi confirmado. Atualize o pagamento para voltar a usar a IA.";
  }
  // Ativa com o período vencido além da tolerância: a renovação não foi confirmada nem por aviso nem pela conferência.
  if (status === "ativa") {
    const fim = data(assinatura?.renovaEm);
    if (fim && agora - fim > (plano?.diasTolerancia ?? 3) * 864e5) return "Não confirmamos a renovação da sua assinatura. Atualize o pagamento para voltar a usar a IA.";
  }
  if (status === "cancelada") {
    const fim = data(assinatura?.renovaEm);
    if (!fim || fim <= agora) return "Sua assinatura foi cancelada. Assine um plano para voltar a usar a IA.";
  }
  return null;
}

/** Debita antes de chamar a IA, numa transação: duas abas ao mesmo tempo não gastam o mesmo crédito. */
export async function reservarCreditos(uid: string, operacao: Operacao) {
  const db = dbAdmin();
  const [{ custos, creditosIniciais }, planos] = await Promise.all([lerConfiguracao(), lerPlanos()]);
  const custo = custos[operacao] ?? 0;
  const refCreditos = db.collection("creditos").doc(uid);
  const refAssinatura = db.collection("assinaturas").doc(uid);
  const refMovimento = db.collection("movimentos_creditos").doc();

  if (operacao === "planejamento") {
    const assinatura = (await refAssinatura.get()).data();
    const plano = planos.find((p) => p.id === assinatura?.planoId);
    const limite = plano && assinatura?.status !== "pendente" ? plano.maxProdutos : 1;
    const total = (await db.collection("produtos").where("donoId", "==", uid).count().get()).data().count;
    if (total > limite) throw new ErroCreditos(`Seu plano permite ${limite} ${limite === 1 ? "produto" : "produtos"} com IA. Mude de plano para criar mais.`);
  }

  await db.runTransaction(async (tx) => {
    const [sC, sA] = await Promise.all([tx.get(refCreditos), tx.get(refAssinatura)]);
    const assinatura = sA.data();
    const plano = planos.find((p) => p.id === assinatura?.planoId);
    const dados = sC.data();
    if (dados?.bloqueado) throw new ErroCreditos("Esta conta está suspensa. Fale com o suporte.", 403);
    const motivo = motivoBloqueio(assinatura, plano);
    if (motivo) throw new ErroCreditos(motivo);

    let saldo: number = dados?.saldo ?? 0;
    if (!sC.exists) {
      saldo = creditosIniciais;
      movimentar(tx, uid, "inicial", creditosIniciais, saldo);
    }
    if (saldo < custo) throw new ErroCreditos(`Esta ação usa ${custo} ${custo === 1 ? "crédito" : "créditos"} e você tem ${saldo}. ${plano ? "Seus créditos renovam na próxima cobrança, ou você pode mudar de plano." : "Assine um plano para continuar."}`);
    const novo = saldo - custo;
    tx.set(refCreditos, { saldo: novo, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(refMovimento, { donoId: uid, tipo: "debito", operacao, creditos: -custo, saldoApos: novo, entrada: 0, saida: 0, imagens: 0, criadoEm: FieldValue.serverTimestamp() });
  });
  return { movimentoId: refMovimento.id, custo };
}

function movimentar(tx: Transaction, uid: string, tipo: string, creditos: number, saldoApos: number, extra: Record<string, unknown> = {}, id?: string) {
  const col = dbAdmin().collection("movimentos_creditos");
  tx.set(id ? col.doc(id) : col.doc(), { donoId: uid, tipo, creditos, saldoApos, ...extra, criadoEm: FieldValue.serverTimestamp() });
}

/** Falhou a geração: o crédito volta. */
export async function estornarCreditos(uid: string, operacao: Operacao, reserva: { movimentoId: string; custo: number }) {
  if (!reserva.custo) return;
  const db = dbAdmin();
  const ref = db.collection("creditos").doc(uid);
  await db.runTransaction(async (tx) => {
    const saldo: number = (await tx.get(ref)).data()?.saldo ?? 0;
    const novo = saldo + reserva.custo;
    tx.set(ref, { saldo: novo, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    movimentar(tx, uid, "estorno", reserva.custo, novo, { operacao }, `estorno_${reserva.movimentoId}`);
  });
}

export const registrarUso = (movimentoId: string, m: Medicao, ms: number) =>
  dbAdmin().collection("movimentos_creditos").doc(movimentoId).update({ entrada: m.entrada, saida: m.saida, imagens: m.imagens, custoTextoUsd: m.custoTextoUsd, ms });

/** Ajuste manual, sempre com registro de quem fez e por quê. */
export async function ajustarCreditos(uid: string, delta: number, motivo: string, adminUid: string) {
  const db = dbAdmin();
  const ref = db.collection("creditos").doc(uid);
  return db.runTransaction(async (tx) => {
    const saldo: number = (await tx.get(ref)).data()?.saldo ?? 0;
    const novo = Math.max(0, saldo + delta);
    tx.set(ref, { saldo: novo, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    movimentar(tx, uid, "ajuste", novo - saldo, novo, { motivo, adminUid });
    return novo;
  });
}

/** Renova o saldo do mês. O id vem do pagamento: aviso repetido não credita duas vezes. Crédito do mês anterior não acumula. */
export async function renovarCreditos(uid: string, plano: Plano, pagamentoId: string) {
  const db = dbAdmin();
  const refMov = db.collection("movimentos_creditos").doc(`renovacao_${pagamentoId}`);
  const ref = db.collection("creditos").doc(uid);
  return db.runTransaction(async (tx) => {
    if ((await tx.get(refMov)).exists) return false;
    tx.set(ref, { saldo: plano.creditosMes, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    movimentar(tx, uid, "renovacao", plano.creditosMes, plano.creditosMes, { planoId: plano.id }, refMov.id);
    return true;
  });
}
