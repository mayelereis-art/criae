import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase/client";
import type { ConfiguracaoProduto } from "./validacao/produto";

export type StatusProduto = "rascunho" | "em_edicao" | "publicado";

export type Produto = {
  id: string;
  donoId: string;
  titulo: string;
  status: StatusProduto;
  /** Última etapa concluída da Fábrica (0 = configuração ... 6 = preço). */
  etapa: number;
  configuracao: Partial<ConfiguracaoProduto>;
  criadoEm: Timestamp | null;
  atualizadoEm: Timestamp | null;
};

const produtos = collection(db, "produtos");
const tituloDe = (c: Partial<ConfiguracaoProduto>) => (c.tituloProvisorio || c.tema || "Produto sem título").slice(0, 120);

export async function criarProduto(donoId: string, configuracao: Partial<ConfiguracaoProduto>) {
  const ref = await addDoc(produtos, {
    donoId,
    titulo: tituloDe(configuracao),
    status: "rascunho",
    etapa: 0,
    configuracao,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function salvarConfiguracao(id: string, configuracao: Partial<ConfiguracaoProduto>, etapa?: number) {
  await updateDoc(doc(produtos, id), {
    configuracao,
    titulo: tituloDe(configuracao),
    ...(etapa !== undefined && { etapa, status: etapa > 0 ? "em_edicao" : "rascunho" }),
    atualizadoEm: serverTimestamp(),
  });
}

export async function lerProduto(id: string): Promise<Produto | null> {
  const s = await getDoc(doc(produtos, id));
  return s.exists() ? ({ id: s.id, ...s.data() } as Produto) : null;
}

export const excluirProduto = (id: string) => deleteDoc(doc(produtos, id));

/** Escuta em tempo real os produtos do dono, mais recentes primeiro. */
export function ouvirProdutos(donoId: string, aoMudar: (lista: Produto[]) => void, aoErrar: (e: Error) => void) {
  const q = query(produtos, where("donoId", "==", donoId), orderBy("atualizadoEm", "desc"));
  return onSnapshot(q, (s) => aoMudar(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Produto)), aoErrar);
}
