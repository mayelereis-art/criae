import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, where, type Timestamp } from "firebase/firestore";
import { db } from "./firebase/client";
import type { Oportunidade } from "./ia/esquemas";

export type OportunidadeSalva = { id: string; nicho: string; dados: Oportunidade; criadoEm: Timestamp | null };

const colecao = collection(db, "oportunidades");

export const salvarOportunidade = (donoId: string, nicho: string, dados: Oportunidade) =>
  addDoc(colecao, { donoId, nicho: nicho.slice(0, 140), dados, criadoEm: serverTimestamp() });

export const excluirOportunidade = (id: string) => deleteDoc(doc(colecao, id));

export function ouvirOportunidades(donoId: string, aoMudar: (l: OportunidadeSalva[]) => void, aoErrar: (e: Error) => void) {
  const q = query(colecao, where("donoId", "==", donoId), orderBy("criadoEm", "desc"));
  return onSnapshot(q, (s) => aoMudar(s.docs.map((d) => ({ id: d.id, ...d.data() }) as OportunidadeSalva)), aoErrar);
}
