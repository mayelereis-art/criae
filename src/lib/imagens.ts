import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, where, type Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { db, storage } from "./firebase/client";

export type TipoImagem = "capa" | "capitulo";
export type Imagem = { id: string; produtoId: string; tipo: TipoImagem; ordem: number; url: string; caminho: string; prompt: string; criadoEm: Timestamp | null };

const colecao = collection(db, "imagens");

/** A imagem mais recente de cada (tipo, ordem) é a que vale; as antigas ficam como histórico. */
export function ouvirImagens(donoId: string, produtoId: string, aoMudar: (l: Imagem[]) => void, aoErrar: (e: Error) => void) {
  const q = query(colecao, where("donoId", "==", donoId), where("produtoId", "==", produtoId), orderBy("criadoEm", "desc"));
  return onSnapshot(q, (s) => aoMudar(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Imagem)), aoErrar);
}

export function imagemAtual(lista: Imagem[], tipo: TipoImagem, ordem = 0) {
  return lista.find((i) => i.tipo === tipo && i.ordem === ordem);
}

/** Sobe a imagem gerada (base64) para o Storage do criador e registra no Firestore. */
export async function guardarImagem(donoId: string, produtoId: string, tipo: TipoImagem, ordem: number, base64: string, prompt: string) {
  const caminho = `criadores/${donoId}/produtos/${produtoId}/imagens/${tipo}-${ordem}-${Date.now()}.jpg`;
  const arquivo = ref(storage, caminho);
  try {
    await uploadString(arquivo, base64, "base64", { contentType: "image/jpeg" });
  } catch (e) {
    const codigo = (e as { code?: string }).code ?? "";
    if (codigo.includes("storage/unknown") || codigo.includes("bucket-not-found") || codigo.includes("project-not-found") || codigo.includes("retry-limit-exceeded"))
      throw new Error("O armazenamento de arquivos (Firebase Storage) ainda não foi ativado neste projeto.");
    throw new Error("Não foi possível salvar a imagem.");
  }
  const url = await getDownloadURL(arquivo);
  await addDoc(colecao, { donoId, produtoId, tipo, ordem, url, caminho, prompt: prompt.slice(0, 4000), criadoEm: serverTimestamp() });
  return url;
}

export const esquecerImagem = (id: string) => deleteDoc(doc(colecao, id));
