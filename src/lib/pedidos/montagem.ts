import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { ItemPedido } from "./servidor";
import { pdfFinal } from "./servidor";
import { promoAtiva } from "../promocao";

export class ErroCheckout extends Error {
  constructor(message: string, public status = 422) {
    super(message);
  }
}

export type PedidoMontado = {
  vendedorId: string;
  produtoId: string;
  itens: ItemPedido[];
  subtotalCentavos: number;
  descontoCentavos: number;
  totalCentavos: number;
  cupomId: string | null;
  cupomCodigo: string | null;
};

const MINIMO_CENTAVOS = 100;

/** Desconto em centavos, nunca maior que o preço. Puro: fácil de conferir. */
export function calcularDesconto(precoCentavos: number, tipo: "percentual" | "valor", valor: number) {
  const d = tipo === "percentual" ? Math.round((precoCentavos * valor) / 100) : valor;
  return Math.min(d, precoCentavos);
}

/**
 * Monta o pedido SEMPRE a partir do banco: nada de preço, desconto ou arquivo vem do navegador.
 * Usado tanto na cotação da tela quanto na criação do pedido, para os dois darem o mesmo total.
 */
export async function montarPedido(db: Firestore, slug: string, opcoes: { cupom?: string; comBump?: boolean }): Promise<PedidoMontado> {
  const pagina = (await db.collection("paginas_vendas").doc(slug).get()).data();
  if (!pagina?.publicada) throw new ErroCheckout("Esta página não está disponível.", 404);
  if (pagina.venda?.plataforma && pagina.venda.plataforma !== "mercadopago") throw new ErroCheckout("Este produto é vendido em outra plataforma.");
  if (!pagina.checkoutAtivo) throw new ErroCheckout("As vendas deste produto ainda não estão abertas.");

  const vendedorId: string = pagina.donoId;
  const produtoId: string = pagina.produtoId;
  const produto = (await db.collection("produtos").doc(produtoId).get()).data();
  const oferta = produto?.oferta;
  if (!oferta) throw new ErroCheckout("Este produto está sem preço definido.");
  const caminho = await pdfFinal(db, vendedorId, produtoId);
  if (!caminho) throw new ErroCheckout("O arquivo deste produto ainda não está pronto.");

  const precoBase: number = promoAtiva(oferta.promo) ? oferta.promo.precoCentavos : oferta.precoCentavos;
  let descontoCentavos = 0;
  let cupomId: string | null = null;
  let cupomCodigo: string | null = null;
  if (opcoes.cupom?.trim()) {
    const codigo = opcoes.cupom.trim().toUpperCase();
    const q = await db.collection("cupons").where("donoId", "==", vendedorId).where("codigo", "==", codigo).limit(5).get();
    const c = q.docs.find((d) => [produtoId, null].includes(d.data().produtoId));
    const dados = c?.data();
    const vencido = dados?.validoAte && dados.validoAte.toDate() < new Date();
    const esgotado = dados?.usosMax && dados.usos >= dados.usosMax;
    if (!c || !dados?.ativo || vencido || esgotado) throw new ErroCheckout("Cupom inválido ou expirado.");
    descontoCentavos = calcularDesconto(precoBase, dados.tipo, dados.valor);
    cupomId = c.id;
    cupomCodigo = codigo;
  }

  const precoPrincipal = precoBase - descontoCentavos;
  if (precoPrincipal < MINIMO_CENTAVOS) throw new ErroCheckout("O desconto deixa o valor abaixo do mínimo de R$ 1,00.");
  const itens: ItemPedido[] = [{ produtoId, titulo: produto.titulo, precoCentavos: precoPrincipal, caminho, tipo: "principal" }];

  if (opcoes.comBump && oferta.orderBump) {
    const b = oferta.orderBump;
    const dono = (await db.collection("produtos").doc(b.produtoId).get()).data()?.donoId;
    const caminhoBump = dono === vendedorId ? await pdfFinal(db, vendedorId, b.produtoId) : null;
    if (caminhoBump) itens.push({ produtoId: b.produtoId, titulo: b.titulo, precoCentavos: b.precoCentavos, caminho: caminhoBump, tipo: "bump" });
  }

  const totalCentavos = itens.reduce((s, i) => s + i.precoCentavos, 0);
  return { vendedorId, produtoId, itens, subtotalCentavos: totalCentavos + descontoCentavos, descontoCentavos, totalCentavos, cupomId, cupomCodigo };
}
