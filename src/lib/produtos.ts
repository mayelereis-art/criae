import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where,
  writeBatch, type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase/client";
import type { ConfiguracaoProduto } from "./validacao/produto";
import type { Planejamento } from "./ia/esquemas";

export type StatusProduto = "rascunho" | "em_edicao" | "publicado";

export type Produto = {
  id: string;
  donoId: string;
  titulo: string;
  status: StatusProduto;
  /** Quantas etapas da Fábrica já foram concluídas (0 = nenhuma; 1 = configuração; 2 = planejamento; 3 = redação...). */
  etapa: number;
  configuracao: Partial<ConfiguracaoProduto>;
  planejamento?: Planejamento | null;
  planejamentoAprovado?: boolean;
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

export function ouvirProduto(id: string, aoMudar: (p: Produto | null) => void, aoErrar: (e: Error) => void) {
  return onSnapshot(doc(produtos, id), (s) => aoMudar(s.exists() ? ({ id: s.id, ...s.data() } as Produto) : null), aoErrar);
}

export async function salvarPlanejamento(id: string, planejamento: Planejamento, aprovado: boolean) {
  await updateDoc(doc(produtos, id), {
    planejamento,
    planejamentoAprovado: aprovado,
    titulo: planejamento.tituloComercial.slice(0, 120) || "Produto sem título",
    etapa: aprovado ? 2 : 1,
    status: "em_edicao",
    atualizadoEm: serverTimestamp(),
  });
}

export async function marcarEtapa(id: string, etapa: number) {
  await updateDoc(doc(produtos, id), { etapa, atualizadoEm: serverTimestamp() });
}

/** Exclui o produto e os capítulos dele. */
export async function excluirProduto(donoId: string, id: string) {
  const caps = await getDocs(query(capitulos, where("donoId", "==", donoId), where("produtoId", "==", id)));
  const lote = writeBatch(db);
  caps.forEach((c) => lote.delete(c.ref));
  await lote.commit();
  await deleteDoc(doc(produtos, id));
}

// ---------- Capítulos ----------

export type StatusCapitulo = "pendente" | "gerando" | "concluido" | "erro";
export type ProblemaRevisao = { tipo: string; descricao: string };
export type Capitulo = {
  id: string;
  donoId: string;
  produtoId: string;
  ordem: number;
  titulo: string;
  status: StatusCapitulo;
  conteudo?: string;
  resumo?: string;
  problemas?: ProblemaRevisao[];
  revisaoAplicada?: boolean;
  editadoManualmente?: boolean;
  erro?: string;
};

const capitulos = collection(db, "capitulos");
const idCapitulo = (produtoId: string, ordem: number) => `${produtoId}_${String(ordem).padStart(2, "0")}`;

export function ouvirCapitulos(donoId: string, produtoId: string, aoMudar: (l: Capitulo[]) => void, aoErrar: (e: Error) => void) {
  const q = query(capitulos, where("donoId", "==", donoId), where("produtoId", "==", produtoId), orderBy("ordem"));
  return onSnapshot(q, (s) => aoMudar(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Capitulo)), aoErrar);
}

/**
 * Sincroniza os capítulos com o planejamento aprovado: capítulo com mesmo lugar e mesmo título
 * mantém o texto já escrito; os demais voltam a "pendente"; sobras são excluídas.
 */
export async function prepararCapitulos(donoId: string, produtoId: string, plano: Planejamento) {
  const existentes = await getDocs(query(capitulos, where("donoId", "==", donoId), where("produtoId", "==", produtoId)));
  const porId = new Map(existentes.docs.map((d) => [d.id, d.data() as Capitulo]));
  const lote = writeBatch(db);
  const novos = new Set(plano.capitulos.map((_, ordem) => idCapitulo(produtoId, ordem)));
  existentes.forEach((c) => !novos.has(c.id) && lote.delete(c.ref));
  plano.capitulos.forEach((cap, ordem) => {
    const id = idCapitulo(produtoId, ordem);
    const titulo = cap.titulo.slice(0, 200);
    if (porId.get(id)?.titulo === titulo) return;
    lote.set(doc(capitulos, id), { donoId, produtoId, ordem, titulo, status: "pendente", atualizadoEm: serverTimestamp() });
  });
  await lote.commit();
}

export async function atualizarCapitulo(id: string, campos: Partial<Omit<Capitulo, "id" | "donoId" | "produtoId" | "ordem">>) {
  await updateDoc(doc(capitulos, id), { ...campos, atualizadoEm: serverTimestamp() });
}

/** Escuta em tempo real os produtos do dono, mais recentes primeiro. */
export function ouvirProdutos(donoId: string, aoMudar: (lista: Produto[]) => void, aoErrar: (e: Error) => void) {
  const q = query(produtos, where("donoId", "==", donoId), orderBy("atualizadoEm", "desc"));
  return onSnapshot(q, (s) => aoMudar(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Produto)), aoErrar);
}
