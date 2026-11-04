import { createHmac, timingSafeEqual } from "node:crypto";

// Leitura dos avisos de venda da Kiwify e da Hotmart. Funções puras, sem banco.
// Hotmart: developers.hotmart.com/docs/pt-BR/2.0.0/webhook/purchase-webhook
// Kiwify: docs.kiwify.com.br/api-reference/webhooks/receiving. A documentação não publica o corpo completo
// do aviso, por isso os dados vêm com os dois nomes conhecidos e o valor ausente fica registrado como zero.

export type PlataformaExterna = "kiwify" | "hotmart";
export type StatusVenda = "pago" | "pendente" | "recusado" | "reembolsado" | "contestado" | "cancelado";

export type VendaExterna = {
  transacao: string;
  status: StatusVenda;
  valorCentavos: number;
  moeda: string;
  produtoExternoId: string;
  produtoNome: string;
  comprador: { nome: string; email: string };
  canal: string | null;
  metodo: string | null;
};

type Objeto = Record<string, unknown>;
const obj = (v: unknown): Objeto => (v && typeof v === "object" && !Array.isArray(v) ? (v as Objeto) : {});
const texto = (v: unknown, max = 200) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");
const numero = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const limparCanal = (v: unknown) => texto(v, 40).replace(/[^a-z0-9_-]/gi, "") || null;

function iguais(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** HMAC-SHA1 em hexadecimal do corpo exato recebido, com o token como chave. O token nunca viaja no aviso. */
export function assinaturaKiwifyValida(corpoBruto: string, assinatura: string | null, token: string) {
  if (!assinatura) return false;
  return iguais(createHmac("sha1", token).update(corpoBruto).digest("hex"), assinatura.trim().toLowerCase());
}

export const hottokValido = (recebido: string | null, token: string) => !!recebido && iguais(recebido.trim(), token);

const STATUS_KIWIFY: Record<string, StatusVenda> = {
  paid: "pago", approved: "pago", waiting_payment: "pendente", refused: "recusado", refunded: "reembolsado", chargedback: "contestado",
};

/** null = aviso que não é de venda (carrinho abandonado, eventos de assinatura). */
export function lerKiwify(corpo: unknown): VendaExterna | null {
  const d = obj(corpo);
  const transacao = texto(d.order_id ?? d.id, 100);
  const tipo = texto(d.webhook_event_type);
  if (!transacao || tipo.startsWith("subscription_")) return null;
  const status = STATUS_KIWIFY[texto(d.order_status ?? d.status)];
  if (!status) return null;

  const produto = { ...obj(d.product), ...obj(d.Product) };
  const cliente = { ...obj(d.customer), ...obj(d.Customer) };
  const valores = { ...obj(d.payment), ...obj(d.Commissions) };
  const origem = { ...obj(d.tracking), ...obj(d.TrackingParameters) };
  return {
    transacao, status,
    // A Kiwify envia inteiros, em centavos nos exemplos publicados.
    valorCentavos: Math.round(numero(valores.charge_amount)),
    moeda: texto(valores.charge_currency ?? valores.currency, 3).toUpperCase() || "BRL",
    produtoExternoId: texto(produto.product_id ?? produto.id, 100),
    produtoNome: texto(produto.product_name ?? produto.name) || "Produto na Kiwify",
    comprador: { nome: texto(cliente.full_name ?? cliente.name) || "Comprador", email: texto(cliente.email) },
    canal: limparCanal(origem.utm_source) ?? limparCanal(origem.src),
    metodo: texto(d.payment_method, 40) || null,
  };
}

const STATUS_HOTMART: Record<string, StatusVenda> = {
  PURCHASE_APPROVED: "pago", PURCHASE_COMPLETE: "pago", PURCHASE_BILLET_PRINTED: "pendente", PURCHASE_DELAYED: "pendente",
  PURCHASE_CANCELED: "cancelado", PURCHASE_EXPIRED: "cancelado", PURCHASE_REFUNDED: "reembolsado", PURCHASE_CHARGEBACK: "contestado", PURCHASE_PROTEST: "contestado",
};

export function lerHotmart(corpo: unknown): VendaExterna | null {
  const d = obj(corpo);
  const status = STATUS_HOTMART[texto(d.event)];
  const dados = obj(d.data);
  const compra = obj(dados.purchase);
  const transacao = texto(compra.transaction, 100);
  if (!status || !transacao) return null;

  const preco = { ...obj(compra.price), ...obj(compra.full_price) };
  const produto = obj(dados.product);
  const comprador = obj(dados.buyer);
  const origem = obj(compra.origin);
  return {
    transacao, status,
    valorCentavos: Math.round(numero(preco.value) * 100), // a Hotmart envia em reais, com decimais
    moeda: texto(preco.currency_value, 3).toUpperCase() || "BRL",
    produtoExternoId: texto(produto.ucode ?? produto.id, 100),
    produtoNome: texto(produto.name) || "Produto na Hotmart",
    comprador: { nome: texto(comprador.name) || "Comprador", email: texto(comprador.email) },
    canal: limparCanal(origem.sck) ?? limparCanal(origem.src),
    metodo: texto(obj(compra.payment).type, 40) || null,
  };
}

/** Status final não volta atrás, e aviso atrasado não desfaz uma venda paga. */
export function proximoStatus(atual: string | undefined, novo: StatusVenda): StatusVenda | null {
  if (atual === novo) return null;
  if (atual === "reembolsado" || atual === "contestado") return novo === "reembolsado" || novo === "contestado" ? novo : null;
  if (atual === "pago" && novo !== "reembolsado" && novo !== "contestado") return null;
  return novo;
}
