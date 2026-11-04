import { collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase/client";
import type { SugestaoPreco } from "./ia/esquemas";
import type { Promocao } from "./promocao";

export type ProdutoAdicional = { produtoId: string; titulo: string; precoCentavos: number; chamada: string };

export type Oferta = {
  precoCentavos: number;
  /** Preço "de" riscado: só se for um preço que o produto realmente teve ou terá (não inventar desconto). */
  precoOriginalCentavos?: number;
  garantiaDias: number;
  /** Oferta com prazo: quando termina, o preço volta a precoCentavos na página e no checkout. */
  promo?: Promocao | null;
  sugestoes?: SugestaoPreco;
  orderBump?: ProdutoAdicional;
  upsell?: ProdutoAdicional;
};

/** Salva a oferta. A etapa só avança quando o PDF final já existe (etapa 6). */
export async function salvarOferta(produtoId: string, oferta: Oferta, etapaAtual: number) {
  await updateDoc(doc(collection(db, "produtos"), produtoId), {
    oferta,
    etapa: etapaAtual >= 6 ? Math.max(etapaAtual, 7) : etapaAtual,
    atualizadoEm: serverTimestamp(),
  });
}

/** Converte "29,90" ou "29.90" em centavos. Retorna null se não for um valor válido. */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}
