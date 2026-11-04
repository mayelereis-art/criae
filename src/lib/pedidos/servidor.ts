import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { dbAdmin } from "../firebase/admin";
import type { PagamentoGateway } from "../pagamentos/gateway";
import { enviarEntrega } from "./email";

export type StatusPedido = "pendente" | "pago" | "recusado" | "reembolsado" | "contestado" | "cancelado";
export type ItemPedido = { produtoId: string; titulo: string; precoCentavos: number; caminho: string; tipo: "principal" | "bump" | "upsell" };

export const MAX_DOWNLOADS = 15;

export const novoToken = () => randomBytes(32).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Confere o token contra os hashes guardados, em tempo constante. */
export function tokenValido(token: string | null, hashes: string[] | undefined) {
  if (!token || !hashes?.length) return false;
  const h = Buffer.from(hashToken(token));
  return hashes.some((x) => {
    const b = Buffer.from(x);
    return b.length === h.length && timingSafeEqual(b, h);
  });
}

/** Versão final mais recente do PDF (nunca rascunho). É ela que vai para o comprador. */
export async function pdfFinal(db: Firestore, donoId: string, produtoId: string): Promise<string | null> {
  const q = await db.collection("arquivos").where("donoId", "==", donoId).where("produtoId", "==", produtoId).orderBy("versao", "desc").limit(10).get();
  const final = q.docs.find((d) => d.data().rascunho === false);
  return final ? (final.data().caminho as string) : null;
}

/** Liga o botão de compra só quando há vendedor conectado E PDF final daquele produto. */
export async function sincronizarPaginas(uid: string) {
  const db = dbAdmin();
  const conectado = (await db.collection("conexoes_mp").doc(uid).get()).exists;
  const paginas = await db.collection("paginas_vendas").where("donoId", "==", uid).get();
  await Promise.all(paginas.docs.map(async (p) => {
    const externa = p.data().venda?.plataforma && p.data().venda.plataforma !== "mercadopago";
    const ativo = !externa && conectado && !!(await pdfFinal(db, uid, p.data().produtoId));
    if (p.data().checkoutAtivo !== ativo) await p.ref.update({ checkoutAtivo: ativo });
  }));
}

const STATUS_DO_GATEWAY: Record<PagamentoGateway["status"], StatusPedido> = {
  aprovado: "pago", pendente: "pendente", recusado: "recusado", reembolsado: "reembolsado", contestado: "contestado", cancelado: "cancelado",
};

/**
 * Único lugar que muda o status de um pedido, sempre a partir de um pagamento consultado no gateway.
 * Idempotente: o mesmo aviso pode chegar várias vezes. A entrega só dispara na primeira passagem para "pago".
 */
export async function aplicarPagamento(pagamento: PagamentoGateway, vendedorId: string) {
  const db = dbAdmin();
  if (!pagamento.referencia) return "sem-referencia";
  const ref = db.collection("pedidos").doc(pagamento.referencia);
  const tokenEntrega = novoToken();

  const resultado = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists) return "pedido-inexistente";
    const p = s.data()!;
    if (p.vendedorId !== vendedorId) return "vendedor-divergente";
    const novo = STATUS_DO_GATEWAY[pagamento.status];
    // Valor pago menor que o pedido nunca libera o produto.
    if (novo === "pago" && pagamento.valorCentavos < p.totalCentavos) return "valor-divergente";
    // Pago não volta a pendente/recusado por um aviso atrasado; só reembolso ou contestação mudam.
    if (p.status === "pago" && !["reembolsado", "contestado"].includes(novo)) return "sem-mudanca";
    if (["reembolsado", "contestado"].includes(p.status) && novo !== "reembolsado" && novo !== "contestado") return "sem-mudanca";
    if (p.status === novo) return "sem-mudanca";

    const dados: Record<string, unknown> = { status: novo, pagamentoId: pagamento.id, metodo: pagamento.metodo, atualizadoEm: FieldValue.serverTimestamp() };
    if (novo === "pago") {
      dados.pagoEm = FieldValue.serverTimestamp();
      dados.tokensHash = FieldValue.arrayUnion(hashToken(tokenEntrega));
      if (p.cupomId) tx.update(db.collection("cupons").doc(p.cupomId), { usos: FieldValue.increment(1) });
    }
    tx.update(ref, dados);
    tx.set(db.collection("pagamentos").doc(pagamento.id), {
      pedidoId: ref.id, vendedorId, status: pagamento.statusOriginal, metodo: pagamento.metodo, valorCentavos: pagamento.valorCentavos, atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return novo === "pago" ? "liberar" : "atualizado";
  });

  if (resultado === "liberar") await entregar(ref.id, tokenEntrega);
  return resultado;
}

/** Envia o e-mail com o link. Falha de e-mail não desfaz a venda: fica registrada e o vendedor pode reenviar. */
export async function entregar(pedidoId: string, token: string) {
  const ref = dbAdmin().collection("pedidos").doc(pedidoId);
  const p = (await ref.get()).data()!;
  try {
    await enviarEntrega({ para: p.comprador.email, nome: p.comprador.nome, itens: p.itens, link: `${process.env.NEXT_PUBLIC_URL_SITE}/pedido/${pedidoId}?t=${token}` });
    await ref.update({ emailEnviadoEm: FieldValue.serverTimestamp(), emailErro: FieldValue.delete() });
  } catch (e) {
    console.error(JSON.stringify({ evento: "email-entrega", pedidoId, ok: false, erro: String(e) }));
    await ref.update({ emailErro: String(e).slice(0, 300) });
  }
}
