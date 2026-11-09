import { arrayRemove, arrayUnion, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase/client";
import type { Campanha, Comunidades } from "./ia/esquemas";

export type DocCampanha = { donoId: string; produtoId: string; dados: Campanha; dataInicio: string; feitos: string[] };

const colecao = collection(db, "campanhas");

export function ouvirCampanha(produtoId: string, aoMudar: (c: DocCampanha | null) => void, aoErrar: (e: Error) => void) {
  return onSnapshot(doc(colecao, produtoId), (s) => aoMudar(s.exists() ? (s.data() as DocCampanha) : null), aoErrar);
}

/** Uma campanha por produto: gerar de novo substitui a anterior e zera o que foi marcado como feito. */
export const salvarCampanha = (donoId: string, produtoId: string, dados: Campanha, dataInicio: string) =>
  setDoc(doc(colecao, produtoId), { donoId, produtoId, dados, dataInicio, feitos: [], atualizadoEm: serverTimestamp() });

export const mudarInicio = (produtoId: string, dataInicio: string) =>
  updateDoc(doc(colecao, produtoId), { dataInicio, atualizadoEm: serverTimestamp() });

/** Campanha antiga, gerada antes dos grupos: acrescenta só essa parte. */
export const salvarComunidades = (produtoId: string, comunidades: Comunidades) =>
  updateDoc(doc(colecao, produtoId), { "dados.comunidades": comunidades, atualizadoEm: serverTimestamp() });

export const marcarFeito = (produtoId: string, chave: string, feito: boolean) =>
  updateDoc(doc(colecao, produtoId), { feitos: feito ? arrayUnion(chave) : arrayRemove(chave), atualizadoEm: serverTimestamp() });

/** Troca [LINK] pelo endereço real, com a origem para as métricas da venda. Sem página publicada, o marcador fica visível. */
export function comLink(texto: string, urlPagina: string | null, canal: string) {
  if (!urlPagina) return texto;
  return texto.replaceAll("[LINK]", `${urlPagina}?utm_source=${canal}`);
}

/** Data do item do calendário: o dia 1 é a data de início. */
export function dataDoDia(inicio: string, dia: number) {
  const [a, m, d] = inicio.split("-").map(Number);
  return new Date(a, m - 1, d + dia - 1);
}
