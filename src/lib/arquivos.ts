import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, type Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase/client";

export type VersaoPdf = { id: string; versao: number; url: string; paginas: number; bytes: number; rascunho: boolean; criadoEm: Timestamp | null };

const colecao = collection(db, "arquivos");

export function ouvirVersoes(donoId: string, produtoId: string, aoMudar: (l: VersaoPdf[]) => void, aoErrar: (e: Error) => void) {
  const q = query(colecao, where("donoId", "==", donoId), where("produtoId", "==", produtoId), orderBy("versao", "desc"));
  return onSnapshot(q, (s) => aoMudar(s.docs.map((d) => ({ id: d.id, ...d.data() }) as VersaoPdf)), aoErrar);
}

/** Guarda uma versão do PDF no Storage do criador (base para a entrega ao comprador na Etapa 5). */
export async function salvarVersao(donoId: string, produtoId: string, versao: number, pdf: Blob, paginas: number, rascunho: boolean) {
  const caminho = `criadores/${donoId}/produtos/${produtoId}/pdf/versao-${versao}.pdf`;
  const arquivo = ref(storage, caminho);
  try {
    await uploadBytes(arquivo, pdf, { contentType: "application/pdf" });
  } catch {
    throw new Error("Não foi possível salvar a versão: o armazenamento de arquivos (Firebase Storage) ainda não está ativo neste projeto. O download funciona normalmente.");
  }
  const url = await getDownloadURL(arquivo);
  await addDoc(colecao, { donoId, produtoId, versao, url, caminho, paginas, bytes: pdf.size, rascunho, criadoEm: serverTimestamp() });
}
