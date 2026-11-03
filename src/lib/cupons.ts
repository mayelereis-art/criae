import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from "firebase/firestore";
import { db } from "./firebase/client";

export type Cupom = {
  id: string; produtoId: string | null; codigo: string; tipo: "percentual" | "valor"; valor: number;
  validoAte: Timestamp | null; usosMax: number | null; usos: number; ativo: boolean;
};

const colecao = collection(db, "cupons");

export function ouvirCupons(donoId: string, aoMudar: (l: Cupom[]) => void, aoErrar: (e: Error) => void) {
  const q = query(colecao, where("donoId", "==", donoId), orderBy("criadoEm", "desc"));
  return onSnapshot(q, (s) => aoMudar(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Cupom)), aoErrar);
}

/** valor: porcentagem (1–90) ou centavos, conforme o tipo. */
export const criarCupom = (donoId: string, c: { produtoId: string | null; codigo: string; tipo: Cupom["tipo"]; valor: number; usosMax: number | null; validoAte: Date | null }) =>
  addDoc(colecao, { donoId, ...c, codigo: c.codigo.toUpperCase(), usos: 0, ativo: true, criadoEm: serverTimestamp() });

export const alternarCupom = (id: string, ativo: boolean) => updateDoc(doc(colecao, id), { ativo });
export const excluirCupom = (id: string) => deleteDoc(doc(colecao, id));
