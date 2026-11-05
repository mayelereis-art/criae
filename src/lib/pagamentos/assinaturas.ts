import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import type { Plano, StatusAssinatura } from "@/config/planos";
import { lerPlanos, renovarCreditos } from "../creditos/servidor";
import { dbAdmin } from "../firebase/admin";
import { ErroGateway } from "./gateway";

// Assinatura da própria Criaê: cobrança recorrente na conta da plataforma (MP_ACCESS_TOKEN),
// separada das vendas dos criadores, que usam a conta de cada um.
const API = "https://api.mercadopago.com";

async function mp<T>(caminho: string, metodo = "GET", corpo?: unknown): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) throw new ErroGateway("MP_ACCESS_TOKEN não está configurada no servidor.", 503);
  const res = await fetch(`${API}${caminho}`, {
    method: metodo, cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    console.error(JSON.stringify({ evento: "mp-assinatura", caminho: caminho.split("/").slice(0, 2).join("/"), status: res.status, mensagem: String(dados.message ?? "").slice(0, 300) }));
    throw new ErroGateway("Não foi possível falar com o Mercado Pago agora. Tente de novo em alguns minutos.", 502);
  }
  return dados;
}

type Preapproval = { id: string; status: string; external_reference?: string; next_payment_date?: string; init_point?: string };
type Cobranca = { id: string | number; preapproval_id?: string; status?: string; transaction_amount?: number; external_reference?: string; payment?: { id?: string | number; status?: string } };

const referencia = (uid: string, planoId: string) => `${uid}:${planoId}`;
const lerReferencia = (r?: string) => {
  const [uid, planoId] = (r ?? "").split(":");
  return uid && planoId ? { uid, planoId } : null;
};

export async function iniciarAssinatura(uid: string, email: string, plano: Plano) {
  const site = process.env.NEXT_PUBLIC_URL_SITE ?? "";
  const r = await mp<Preapproval>("/preapproval", "POST", {
    reason: `Criaê: plano ${plano.nome}`,
    external_reference: referencia(uid, plano.id),
    payer_email: email,
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plano.precoCentavos / 100, currency_id: "BRL" },
    back_url: `${site}/assinatura?retorno=1`,
    status: "pending",
  });
  if (!r.init_point) throw new ErroGateway("O Mercado Pago não devolveu o link de pagamento.", 502);
  return r.init_point;
}

/** Cancela a cobrança futura. O acesso continua até o fim do período já pago. */
export async function cancelarAssinatura(uid: string) {
  const ref = dbAdmin().collection("assinaturas").doc(uid);
  const a = (await ref.get()).data();
  if (!a?.gatewayId) throw new ErroGateway("Não há assinatura para cancelar.", 422);
  await mp(`/preapproval/${encodeURIComponent(a.gatewayId)}`, "PUT", { status: "cancelled" });
  await ref.set({ status: "cancelada" satisfies StatusAssinatura, canceladaEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
}

const STATUS_PREAPPROVAL: Record<string, StatusAssinatura> = { pending: "pendente", authorized: "ativa", paused: "inadimplente", cancelled: "cancelada" };

/** Sempre lê de novo no Mercado Pago: o aviso só diz que algo mudou. */
export async function processarAvisoAssinatura(id: string) {
  const p = await mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
  const ref_ = lerReferencia(p.external_reference);
  if (!ref_) return "sem-referencia";
  const status = STATUS_PREAPPROVAL[p.status];
  if (!status) return "status-desconhecido";

  const doc = dbAdmin().collection("assinaturas").doc(ref_.uid);
  const atual = (await doc.get()).data();
  if (atual?.tipo === "vitalicio") return "conta-vitalicia";
  // Aviso de uma assinatura antiga não pode derrubar a atual.
  if (atual?.gatewayId && atual.gatewayId !== p.id && status !== "ativa") return "assinatura-antiga";
  // Mudou de plano: a nova entrou em vigor, então a antiga para de cobrar.
  if (status === "ativa" && atual?.gatewayId && atual.gatewayId !== p.id && atual.status !== "cancelada")
    await mp(`/preapproval/${encodeURIComponent(atual.gatewayId)}`, "PUT", { status: "cancelled" }).catch(() => {});
  await doc.set({
    planoId: ref_.planoId, gatewayId: p.id, status,
    ...(p.next_payment_date ? { renovaEm: new Date(p.next_payment_date) } : {}),
    ...(status === "ativa" ? { inadimplenteDesde: FieldValue.delete() } : {}),
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return status;
}

export async function processarAvisoCobranca(id: string) {
  const c = await mp<Cobranca>(`/authorized_payments/${encodeURIComponent(id)}`);
  if (!c.preapproval_id) return "sem-assinatura";
  const p = await mp<Preapproval>(`/preapproval/${encodeURIComponent(c.preapproval_id)}`);
  const ref_ = lerReferencia(p.external_reference);
  if (!ref_) return "sem-referencia";
  const db = dbAdmin();
  const statusPagamento = c.payment?.status ?? "";
  const aprovado = statusPagamento === "approved";
  const recusado = statusPagamento === "rejected" || c.status === "recycling";

  await db.collection("pagamentos_assinatura").doc(String(c.id)).set({
    donoId: ref_.uid, planoId: ref_.planoId, valorCentavos: Math.round((c.transaction_amount ?? 0) * 100),
    status: aprovado ? "pago" : recusado ? "recusado" : "pendente", gatewayId: String(c.id), criadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });

  const doc = db.collection("assinaturas").doc(ref_.uid);
  if ((await doc.get()).data()?.tipo === "vitalicio") return "conta-vitalicia";
  if (aprovado) {
    const plano = (await lerPlanos()).find((x) => x.id === ref_.planoId);
    if (plano) await renovarCreditos(ref_.uid, plano, String(c.id));
    await doc.set({
      planoId: ref_.planoId, gatewayId: p.id, status: "ativa" satisfies StatusAssinatura, inadimplenteDesde: FieldValue.delete(),
      ...(p.next_payment_date ? { renovaEm: new Date(p.next_payment_date) } : {}), atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return "pago";
  }
  if (recusado) {
    const atual = (await doc.get()).data();
    if (atual?.status === "ativa") await doc.set({ status: "inadimplente" satisfies StatusAssinatura, inadimplenteDesde: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    return "recusado";
  }
  return "pendente";
}

/**
 * Confere direto no Mercado Pago, sem depender do aviso: um aviso perdido não pode deixar quem pagou sem plano.
 * Usa as mesmas funções dos avisos, que já são idempotentes e relêem tudo na API.
 */
export async function sincronizarAssinatura(uid: string) {
  const planos = await lerPlanos();
  const vistas = new Set<string>();
  let retornadas = 0;
  for (const plano of planos) {
    const ref_ = referencia(uid, plano.id);
    if (plano.tipo === "vitalicio") {
      const pagos = await mp<{ results?: { id: string | number; external_reference?: string }[] }>(`/v1/payments/search?${new URLSearchParams({ external_reference: ref_, limit: "20" })}`);
      for (const p of (pagos.results ?? []).filter((x) => x.external_reference === ref_)) {
        retornadas++;
        if ((await processarPagamentoPlano(String(p.id))) === "pago") vistas.add(String(p.id));
      }
      continue;
    }
    const q = new URLSearchParams({ external_reference: ref_, limit: "50" });
    const { results = [] } = await mp<{ results?: Preapproval[] }>(`/preapproval/search?${q}`);
    retornadas += results.length;
    // Só o que é desta pessoa e deste plano: nunca confiar só no filtro da busca.
    for (const p of results.filter((x) => x.status === "authorized" && x.external_reference === ref_ && !vistas.has(x.id))) {
      vistas.add(p.id);
      await processarAvisoAssinatura(p.id);
      const cobrancas = await mp<{ results?: { id: string | number }[] }>(`/authorized_payments/search?preapproval_id=${encodeURIComponent(p.id)}`);
      for (const c of cobrancas.results ?? []) await processarAvisoCobranca(String(c.id));
    }
  }
  console.info(JSON.stringify({ evento: "sincronizar-assinatura", uid, retornadas, deste: vistas.size }));
  return vistas.size;
}

/** Vitalício: pagamento único pelo checkout, na conta da plataforma. */
export async function iniciarVitalicio(uid: string, plano: Plano) {
  const site = process.env.NEXT_PUBLIC_URL_SITE ?? "";
  const volta = `${site}/assinatura?retorno=1`;
  const r = await mp<{ init_point?: string }>("/checkout/preferences", "POST", {
    items: [{ id: plano.id, title: `Criaê: acesso ${plano.nome}`, quantity: 1, currency_id: "BRL", unit_price: plano.precoCentavos / 100 }],
    external_reference: referencia(uid, plano.id),
    back_urls: { success: volta, pending: volta, failure: volta },
    auto_return: "approved",
  });
  if (!r.init_point) throw new ErroGateway("O Mercado Pago não devolveu o link de pagamento.", 502);
  return r.init_point;
}

const umMesDepois = (d = new Date()) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1);
  return x;
};

/**
 * Lê o pagamento na conta da plataforma. Só age em referência "uid:plano" de plano vitalício; qualquer outro
 * pagamento é ignorado. Reembolso ou contestação encerram o acesso.
 */
export async function processarPagamentoPlano(id: string) {
  let p: { id: string | number; status?: string; external_reference?: string; transaction_amount?: number };
  try {
    p = await mp(`/v1/payments/${encodeURIComponent(id)}`);
  } catch {
    return "nao-encontrado";
  }
  const ref_ = lerReferencia(p.external_reference);
  const plano = ref_ && (await lerPlanos()).find((x) => x.id === ref_.planoId && x.tipo === "vitalicio");
  if (!ref_ || !plano) return "sem-referencia";

  const db = dbAdmin();
  const doc = db.collection("assinaturas").doc(ref_.uid);
  const registro = db.collection("pagamentos_assinatura").doc(String(p.id));
  const valorCentavos = Math.round((p.transaction_amount ?? 0) * 100);

  if (p.status === "refunded" || p.status === "charged_back") {
    await registro.set({ donoId: ref_.uid, planoId: plano.id, valorCentavos, status: "reembolsado", gatewayId: String(p.id), criadoEm: FieldValue.serverTimestamp() }, { merge: true });
    const atual = (await doc.get()).data();
    if (atual?.tipo === "vitalicio" && atual.pagamentoId === String(p.id)) await doc.set({ status: "cancelada" satisfies StatusAssinatura, renovaEm: FieldValue.delete(), atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    return "reembolsado";
  }
  if (p.status !== "approved") return "pendente";
  const jaPago = (await registro.get()).data()?.status === "pago";
  if (jaPago) return "pago";
  // Valor menor que o do plano nunca libera o acesso.
  if (valorCentavos < plano.precoCentavos) return "valor-divergente";

  const atual = (await doc.get()).data();
  if (atual?.gatewayId && atual.tipo !== "vitalicio" && atual.status !== "cancelada")
    await mp(`/preapproval/${encodeURIComponent(atual.gatewayId)}`, "PUT", { status: "cancelled" }).catch(() => {});
  await registro.set({ donoId: ref_.uid, planoId: plano.id, valorCentavos, status: "pago", gatewayId: String(p.id), criadoEm: FieldValue.serverTimestamp() }, { merge: true });
  await renovarCreditos(ref_.uid, plano, String(p.id));
  await doc.set({
    planoId: plano.id, tipo: "vitalicio", status: "ativa" satisfies StatusAssinatura, pagamentoId: String(p.id), gatewayId: FieldValue.delete(),
    renovaEm: FieldValue.delete(), inadimplenteDesde: FieldValue.delete(), proximaRecargaEm: umMesDepois(), atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return "pago";
}

/** Sem cobrança mensal, não há aviso: a recarga do vitalício acontece no primeiro uso depois de vencer o mês. */
export async function recarregarVitalicio(uid: string) {
  const doc = dbAdmin().collection("assinaturas").doc(uid);
  const a = (await doc.get()).data();
  const vence = a?.proximaRecargaEm?.toDate?.() as Date | undefined;
  if (a?.tipo !== "vitalicio" || a.status !== "ativa" || !vence || vence.getTime() > Date.now()) return;
  const plano = (await lerPlanos()).find((x) => x.id === a.planoId);
  if (!plano) return;
  // O id leva o vencimento: duas chamadas ao mesmo tempo não creditam duas vezes.
  await renovarCreditos(uid, plano, `vitalicio_${uid}_${vence.getTime()}`);
  let proxima = vence;
  while (proxima.getTime() <= Date.now()) proxima = umMesDepois(proxima);
  await doc.set({ proximaRecargaEm: proxima, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
}
