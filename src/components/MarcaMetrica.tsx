"use client";

import { useEffect } from "react";

const CHAVE_CANAL = "criae:canal";

/** Canal de origem (utm_source) visto na página de vendas, para atribuir a venda. */
export function canalGuardado() {
  try {
    return sessionStorage.getItem(CHAVE_CANAL) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Conta uma visita ou um clique no checkout. Falha silenciosa: métrica nunca atrapalha a compra. */
export function MarcaMetrica({ slug, tipo }: { slug: string; tipo: "visualizacoes" | "cliques" }) {
  useEffect(() => {
    const utm = new URLSearchParams(window.location.search).get("utm_source");
    try {
      if (utm) sessionStorage.setItem(CHAVE_CANAL, utm.slice(0, 40));
    } catch { /* sem storage */ }
    const canal = (utm ?? canalGuardado())?.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || undefined;
    fetch("/api/metricas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, tipo, canal }), keepalive: true }).catch(() => {});
  }, [slug, tipo]);
  return null;
}
