import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/** Soma o uso real de uma operação, mesmo quando ela faz várias chamadas à IA em paralelo. */
export type Medicao = { entrada: number; saida: number; imagens: number; custoTextoUsd: number };
export const medidor = new AsyncLocalStorage<Medicao>();

export function medir(campos: Partial<Medicao>) {
  const m = medidor.getStore();
  if (!m) return;
  m.entrada += campos.entrada ?? 0;
  m.saida += campos.saida ?? 0;
  m.imagens += campos.imagens ?? 0;
  m.custoTextoUsd += campos.custoTextoUsd ?? 0;
}
