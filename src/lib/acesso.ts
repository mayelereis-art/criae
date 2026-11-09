/** Rotas que quem ainda não pagou pode abrir: escolher o plano, cuidar da conta e ler a ajuda. */
export const ROTAS_SEM_PLANO = ["/assinatura", "/conta", "/ajuda"];

const data = (v: unknown) =>
  v instanceof Date ? v.getTime() : v && typeof (v as { toMillis?: unknown }).toMillis === "function" ? (v as { toMillis(): number }).toMillis() : null;

/**
 * Quem pode usar o Criaê: só quem pagou um plano (ou recebeu cortesia do administrador).
 * Pagamento atrasado continua com o painel aberto; a IA para depois da tolerância (motivoBloqueio).
 * Cancelada vale até o fim do período pago. A mesma regra está em firestore.rules (liberado()).
 */
export function acessoLiberado(assinatura: Record<string, unknown> | undefined | null, agora = Date.now()): boolean {
  if (!assinatura) return false;
  if (assinatura.cortesia === true) return true;
  if (assinatura.status === "ativa" || assinatura.status === "inadimplente") return true;
  if (assinatura.status === "cancelada") {
    const fim = data(assinatura.renovaEm);
    return !!fim && fim > agora;
  }
  return false;
}

export function rotaSemPlano(caminho: string) {
  return ROTAS_SEM_PLANO.some((r) => caminho === r || caminho.startsWith(r + "/"));
}
