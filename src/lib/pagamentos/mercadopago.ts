import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ErroGateway, type Credenciais, type Gateway, type PagamentoGateway, type StatusGateway } from "./gateway";

const API = "https://api.mercadopago.com";
const site = () => process.env.NEXT_PUBLIC_URL_SITE ?? "";
const redirectUri = () => `${site()}/api/mercadopago/retorno`;

function exigir(nome: string) {
  // trim: chave colada no terminal pode trazer tabulação ou espaço junto.
  const v = process.env[nome]?.trim();
  if (!v) throw new ErroGateway(`${nome} não está configurada no servidor.`, 503);
  return v;
}

async function chamar<T>(caminho: string, opcoes: { token?: string; corpo?: unknown; idempotencia?: string; metodo?: string }): Promise<{ status: number; dados: T }> {
  const res = await fetch(`${API}${caminho}`, {
    method: opcoes.metodo ?? (opcoes.corpo ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
      ...(opcoes.idempotencia ? { "X-Idempotency-Key": opcoes.idempotencia } : {}),
    },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    cache: "no-store",
  });
  return { status: res.status, dados: (await res.json().catch(() => ({}))) as T };
}

type RespostaToken = { access_token?: string; refresh_token?: string; user_id?: number; expires_in?: number; message?: string; error?: string };

function credenciais(r: { status: number; dados: RespostaToken }): Credenciais {
  const d = r.dados;
  if (r.status >= 400 || !d.access_token || !d.user_id)
    throw new ErroGateway(`Mercado Pago recusou a autorização (${r.status}: ${d.error ?? d.message ?? "sem detalhe"}).`);
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token ?? "",
    contaId: String(d.user_id),
    expiraEm: Date.now() + (d.expires_in ?? 15552000) * 1000,
  };
}

function mapearStatus(s: string): StatusGateway {
  switch (s) {
    case "approved": return "aprovado";
    case "refunded": return "reembolsado";
    case "charged_back": return "contestado";
    case "rejected": return "recusado";
    case "cancelled": return "cancelado";
    default: return "pendente"; // pending, in_process, in_mediation, authorized
  }
}

/** Compara em tempo constante; hash de tamanho diferente já é inválido. */
function iguais(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const mercadoPago: Gateway = {
  urlAutorizacao(estado) {
    const q = new URLSearchParams({ client_id: exigir("MP_CLIENT_ID"), response_type: "code", platform_id: "mp", state: estado, redirect_uri: redirectUri() });
    return `https://auth.mercadopago.com.br/authorization?${q}`;
  },

  async trocarCodigo(codigo) {
    return credenciais(await chamar<RespostaToken>("/oauth/token", {
      corpo: {
        client_id: exigir("MP_CLIENT_ID"), client_secret: exigir("MP_CLIENT_SECRET"), grant_type: "authorization_code",
        code: codigo, redirect_uri: redirectUri(),
        // Com "true" o vendedor conectado opera só em modo de teste: nenhum dinheiro de verdade circula.
        test_token: process.env.MP_OAUTH_TESTE === "true",
      },
    }));
  },

  async renovar(refreshToken) {
    return credenciais(await chamar<RespostaToken>("/oauth/token", {
      corpo: { client_id: exigir("MP_CLIENT_ID"), client_secret: exigir("MP_CLIENT_SECRET"), grant_type: "refresh_token", refresh_token: refreshToken },
    }));
  },

  async criarCobranca(token, c) {
    const r = await chamar<{ init_point?: string; message?: string }>("/checkout/preferences", {
      token,
      idempotencia: c.referencia,
      corpo: {
        items: c.itens.map((i) => ({ id: i.id, title: i.titulo.slice(0, 250), quantity: 1, currency_id: "BRL", unit_price: i.precoCentavos / 100 })),
        payer: { name: c.comprador.nome, email: c.comprador.email },
        external_reference: c.referencia,
        back_urls: { success: c.urlRetorno, pending: c.urlRetorno, failure: c.urlRetorno },
        auto_return: "approved",
        // Só Pix e cartão: boleto demora dias e não combina com entrega imediata.
        payment_methods: { excluded_payment_types: [{ id: "ticket" }] },
      },
    });
    if (r.status >= 400 || !r.dados.init_point) throw new ErroGateway(`Não foi possível iniciar o pagamento (${r.status}: ${r.dados.message ?? "sem detalhe"}).`);
    return { urlPagamento: r.dados.init_point };
  },

  async consultarPagamento(token, id): Promise<PagamentoGateway | null> {
    const r = await chamar<{ id?: number; status?: string; external_reference?: string; payment_type_id?: string; transaction_amount?: number }>(`/v1/payments/${encodeURIComponent(id)}`, { token });
    if (r.status === 404) return null;
    if (r.status >= 400 || !r.dados.status) throw new ErroGateway(`Falha ao consultar o pagamento (${r.status}).`);
    return {
      id: String(r.dados.id),
      referencia: r.dados.external_reference ?? null,
      status: mapearStatus(r.dados.status),
      statusOriginal: r.dados.status,
      metodo: r.dados.payment_type_id ?? null,
      valorCentavos: Math.round((r.dados.transaction_amount ?? 0) * 100),
    };
  },

  async reembolsar(token, id, chave) {
    const r = await chamar<{ message?: string }>(`/v1/payments/${encodeURIComponent(id)}/refunds`, { token, corpo: {}, idempotencia: chave });
    if (r.status >= 400) throw new ErroGateway(`O Mercado Pago recusou o reembolso (${r.status}: ${r.dados.message ?? "sem detalhe"}).`, 422);
  },

  /** x-signature = "ts=...,v1=...". v1 é o HMAC-SHA256 em hexa de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;". */
  validarAssinatura({ assinatura, requestId, idDado }) {
    if (!assinatura) return false;
    const partes = Object.fromEntries(assinatura.split(",").map((p) => p.trim().split("=", 2)));
    if (!partes.ts || !partes.v1) return false;
    let manifesto = "";
    if (idDado) manifesto += `id:${/[a-z]/i.test(idDado) ? idDado.toLowerCase() : idDado};`;
    if (requestId) manifesto += `request-id:${requestId};`;
    manifesto += `ts:${partes.ts};`;
    const esperado = createHmac("sha256", exigir("MP_WEBHOOK_SECRET")).update(manifesto).digest("hex");
    return iguais(esperado, partes.v1);
  },
};
