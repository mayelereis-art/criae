/** Chamada às rotas /api/ia/* a partir do navegador. Lança Error com a mensagem em português da rota. */
export async function chamarIA<T>(rota: "nicho" | "configuracao" | "planejamento" | "capitulo", corpo: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/ia/${rota}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  } catch {
    throw new Error("Sem conexão com o servidor. Verifique sua internet.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.erro ?? "Erro ao gerar. Tente de novo.");
  return json as T;
}
