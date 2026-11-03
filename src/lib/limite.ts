import "server-only";

// Freio simples para rotas públicas, por instância do servidor.
const janelas = new Map<string, number[]>();

export function dentroDoLimite(chave: string, maximo: number, janelaMs = 60_000) {
  const agora = Date.now();
  const recentes = (janelas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (recentes.length >= maximo) return false;
  recentes.push(agora);
  janelas.set(chave, recentes);
  return true;
}

export const ipDe = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
