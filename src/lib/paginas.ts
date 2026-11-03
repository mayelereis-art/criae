import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where, type Timestamp } from "firebase/firestore";
import { db } from "./firebase/client";
import type { Identidade } from "@/config/identidade";
import type { TextoPagina } from "./ia/esquemas";

export type ModeloPagina = "impacto" | "editorial" | "essencial";
export type SecaoPagina = "problema" | "paraQuem" | "beneficios" | "conteudo" | "oQueVoceRecebe" | "garantia" | "faq";

export const SECOES: Record<SecaoPagina, string> = {
  problema: "O problema", paraQuem: "Para quem é", beneficios: "Benefícios", conteudo: "O que tem dentro (sumário)",
  oQueVoceRecebe: "O que você recebe", garantia: "Garantia", faq: "Perguntas frequentes",
};

export type Pagina = {
  slug: string;
  donoId: string;
  produtoId: string;
  modelo: ModeloPagina;
  cores: { primaria: string; fundo: string; texto: string; destaque: string };
  fontes: { titulo: string; corpo: string };
  conteudo: TextoPagina & { capitulos: string[]; autor: string; tituloLivro: string; subtituloLivro: string };
  secoes: Record<SecaoPagina, boolean>;
  oferta: { precoCentavos: number; precoOriginalCentavos?: number | null; garantiaDias: number };
  /** Composição da capa (a arte não tem texto; título e subtítulo são sobrepostos). */
  capa: Identidade;
  capaUrl?: string;
  seo: { titulo: string; descricao: string; imagemUrl?: string };
  publicada: boolean;
  publicadaEm?: Timestamp | null;
  checkoutAtivo?: boolean;
  atualizadoEm?: Timestamp | null;
};

const colecao = collection(db, "paginas_vendas");

/** "Unhas Feitas em Casa: o Guia" → "unhas-feitas-em-casa-o-guia" */
export const criarSlug = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");

export const slugValido = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 60;

/** Livre = documento não existe. Página de outra pessoa (não publicada) dá "permission-denied": também conta como ocupado. */
export async function slugDisponivel(slug: string, meuProdutoId: string) {
  try {
    const s = await getDoc(doc(colecao, slug));
    return !s.exists() || s.data().produtoId === meuProdutoId;
  } catch {
    return false;
  }
}

export function ouvirPaginas(donoId: string, aoMudar: (l: Pagina[]) => void, aoErrar: (e: Error) => void) {
  const q = query(colecao, where("donoId", "==", donoId), orderBy("atualizadoEm", "desc"));
  return onSnapshot(q, (s) => aoMudar(s.docs.map((d) => d.data() as Pagina)), aoErrar);
}

export async function salvarPagina(p: Omit<Pagina, "atualizadoEm" | "checkoutAtivo" | "publicadaEm">, publicadaAntes: boolean) {
  const { slug, ...resto } = p;
  await setDoc(
    doc(colecao, slug),
    { slug, ...resto, ...(p.publicada && !publicadaAntes ? { publicadaEm: serverTimestamp() } : {}), atualizadoEm: serverTimestamp() },
    { merge: true },
  );
}

/** Trocar o endereço = nova página com o novo id e remoção da antiga. */
export async function trocarSlug(antigo: string, nova: Omit<Pagina, "atualizadoEm" | "checkoutAtivo" | "publicadaEm">) {
  await salvarPagina(nova, false);
  await deleteDoc(doc(colecao, antigo));
}
