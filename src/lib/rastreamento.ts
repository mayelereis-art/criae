"use client";

/**
 * Origem dos visitantes e eventos do Pixel da Meta.
 * A origem (utm, referência) fica só no navegador e no cadastro, para saber qual divulgação trouxe cada conta.
 * O Pixel só carrega depois que a pessoa aceita os cookies de divulgação.
 */

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
const CHAVE_ORIGEM = "criae_origem";
const CHAVE_CONSENTIMENTO = "criae_cookies";

export type Origem = { fonte?: string; meio?: string; campanha?: string; conteudo?: string; ref?: string; pagina?: string; primeiraVisita?: string };

const corta = (v: string | null | undefined, n = 120) => (v ? v.trim().slice(0, n) : undefined);

function lerJson<T>(chave: string): T | null {
  try {
    const v = localStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

/** Guarda de onde a pessoa veio. Uma visita com utm nova substitui a anterior (último clique de campanha). */
export function capturarOrigem() {
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams;
    const atual = lerJson<Origem>(CHAVE_ORIGEM);
    const refHost = document.referrer ? new URL(document.referrer).hostname : "";
    const deFora = refHost && refHost !== window.location.hostname ? refHost : undefined;
    const temCampanha = p.has("utm_source") || p.has("fbclid") || p.has("ref");
    if (atual && !temCampanha) return;
    const nova: Origem = {
      fonte: corta(p.get("utm_source")) ?? (p.has("fbclid") ? "facebook" : undefined) ?? corta(p.get("ref")) ?? deFora ?? "direto",
      meio: corta(p.get("utm_medium")) ?? (p.has("fbclid") ? "pago-ou-social" : undefined),
      campanha: corta(p.get("utm_campaign")),
      conteudo: corta(p.get("utm_content")),
      ref: deFora,
      pagina: corta(url.pathname, 80),
      primeiraVisita: atual?.primeiraVisita ?? new Date().toISOString(),
    };
    localStorage.setItem(CHAVE_ORIGEM, JSON.stringify(Object.fromEntries(Object.entries(nova).filter(([, v]) => v))));
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): segue sem origem.
  }
}

export const lerOrigem = () => lerJson<Origem>(CHAVE_ORIGEM);

export type Consentimento = "aceito" | "recusado" | null;
export function lerConsentimento(): Consentimento {
  try {
    const v = localStorage.getItem(CHAVE_CONSENTIMENTO);
    return v === "aceito" || v === "recusado" ? v : null;
  } catch {
    return "recusado";
  }
}
export function salvarConsentimento(v: "aceito" | "recusado") {
  try {
    localStorage.setItem(CHAVE_CONSENTIMENTO, v);
  } catch {}
  window.dispatchEvent(new Event("criae-consentimento"));
}

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

/** Carrega o Pixel uma vez. Só é chamado com consentimento. */
export function carregarPixel() {
  if (!PIXEL_ID || window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  fbq("init", PIXEL_ID);
}

/** Evento padrão da Meta (PageView, CompleteRegistration, InitiateCheckout, Purchase). Sem consentimento, não faz nada. */
export function evento(nome: string, dados?: Record<string, unknown>, idEvento?: string) {
  if (!PIXEL_ID || lerConsentimento() !== "aceito") return;
  carregarPixel();
  window.fbq?.("track", nome, dados ?? {}, idEvento ? { eventID: idEvento } : undefined);
}
