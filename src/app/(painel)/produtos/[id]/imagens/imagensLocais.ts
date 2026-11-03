"use client";

import { useEffect, useState } from "react";

/**
 * Imagens geradas que não puderam ir para o Storage (ex.: Storage ainda não ativado).
 * Ficam só na sessão do navegador (sessionStorage) para a pessoa não perder o que já gerou.
 */
export function useImagensLocais(produtoId: string) {
  const chave = `criae:imagens-locais:${produtoId}`;
  const [locais, setLocais] = useState<Record<string, string>>({});

  useEffect(() => {
    try { setLocais(JSON.parse(sessionStorage.getItem(chave) ?? "{}")); } catch { /* sem storage */ }
  }, [chave]);

  const guardarLocal = (vaga: string, dataUrl: string) =>
    setLocais((l) => {
      const novo = { ...l, [vaga]: dataUrl };
      try { sessionStorage.setItem(chave, JSON.stringify(novo)); } catch { /* cota cheia: fica só em memória */ }
      return novo;
    });

  return { locais, guardarLocal };
}
