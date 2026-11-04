import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/client";
import type { ConceitoCriativo } from "../ia/esquemas";

export type FormatoCriativo = "quadrado" | "retrato" | "story";
export const MEDIDAS: Record<FormatoCriativo, { largura: number; altura: number; rotulo: string }> = {
  quadrado: { largura: 1080, altura: 1080, rotulo: "1080×1080" },
  retrato: { largura: 1080, altura: 1350, rotulo: "1080×1350" },
  story: { largura: 1080, altura: 1920, rotulo: "1080×1920" },
};

export type Criativo = ConceitoCriativo & {
  id: string; donoId: string; produtoId: string; status: "pendente" | "pronto" | "erro";
  urlFundo: string | null; caminhoFundo: string | null; urlFinal: string | null; caminhoFinal: string | null;
  criadoEm: Timestamp | null;
};

const colecao = collection(db, "criativos");

export function ouvirCriativos(donoId: string, produtoId: string, aoMudar: (l: Criativo[]) => void, aoErrar: (e: Error) => void) {
  const q = query(colecao, where("donoId", "==", donoId), where("produtoId", "==", produtoId), orderBy("criadoEm", "asc"));
  return onSnapshot(q, (s) => aoMudar(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Criativo)), aoErrar);
}

/** Guarda os textos antes das artes: se uma imagem falhar, a peça continua lá para tentar de novo. */
export async function criarPendente(donoId: string, produtoId: string, c: ConceitoCriativo): Promise<Criativo> {
  const dados = {
    ...c, donoId, produtoId, status: "pendente" as const,
    urlFundo: null, caminhoFundo: null, urlFinal: null, caminhoFinal: null,
  };
  const r = await addDoc(colecao, { ...dados, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
  return { ...dados, id: r.id, criadoEm: null };
}

export const atualizarCriativo = (id: string, campos: Record<string, unknown>) =>
  updateDoc(doc(colecao, id), { ...campos, atualizadoEm: serverTimestamp() });

async function subir(caminho: string, dados: Blob) {
  const arquivo = ref(storage, caminho);
  await uploadBytes(arquivo, dados, { contentType: "image/jpeg" });
  return getDownloadURL(arquivo);
}

const apagarArquivo = (caminho: string | null) => (caminho ? deleteObject(ref(storage, caminho)).catch(() => {}) : Promise.resolve());

export async function guardarFundo(c: Criativo, dados: Blob) {
  const caminho = `criadores/${c.donoId}/produtos/${c.produtoId}/criativos/${c.id}-fundo-${Date.now()}.jpg`;
  const url = await subir(caminho, dados);
  await apagarArquivo(c.caminhoFundo);
  return { urlFundo: url, caminhoFundo: caminho };
}

export async function guardarFinal(c: Criativo, dados: Blob) {
  const caminho = `criadores/${c.donoId}/produtos/${c.produtoId}/criativos/${c.id}-final-${Date.now()}.jpg`;
  const url = await subir(caminho, dados);
  await apagarArquivo(c.caminhoFinal);
  return { urlFinal: url, caminhoFinal: caminho };
}

export async function excluirCriativo(c: Criativo) {
  await deleteDoc(doc(colecao, c.id));
  await Promise.all([apagarArquivo(c.caminhoFundo), apagarArquivo(c.caminhoFinal)]);
}

export async function lerImagemPropria(url: string) {
  const res = await fetch("/api/imagem-propria", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
  if (!res.ok) throw new Error("Não foi possível abrir a imagem salva.");
  return res.blob();
}
