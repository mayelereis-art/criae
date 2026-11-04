// Regras puras, usadas na tela e no servidor. Sem Firebase: o checkout importa daqui.

export type Promocao = { precoCentavos: number; terminaEm: number };

/** A oferta só vale até o prazo. Depois disso o preço volta ao normal na página e no checkout. */
export function promoAtiva(promo: Promocao | null | undefined, agora = Date.now()) {
  return !!promo && promo.terminaEm > agora;
}

export type PlataformaVenda = "mercadopago" | "kiwify" | "hotmart";
export const NOMES_PLATAFORMA: Record<PlataformaVenda, string> = { mercadopago: "Mercado Pago", kiwify: "Kiwify", hotmart: "Hotmart" };

const DOMINIOS: Record<"kiwify" | "hotmart", RegExp> = {
  kiwify: /^(pay\.kiwify\.com\.br|([a-z0-9-]+\.)?kiwify\.app)$/,
  hotmart: /^(pay\.hotmart\.com|go\.hotmart\.com|hotm\.art)$/,
};

/** Só aceita o checkout da plataforma escolhida: a página nunca manda o comprador para um endereço qualquer. */
export function linkDaPlataforma(plataforma: "kiwify" | "hotmart", link: string) {
  try {
    const u = new URL(link.trim());
    return u.protocol === "https:" && DOMINIOS[plataforma].test(u.hostname);
  } catch {
    return false;
  }
}
