import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/firebase/admin";
import { dentroDoLimite, ipDe } from "@/lib/limite";
import { tokenDoVendedor } from "@/lib/pagamentos/conexoes";
import { ErroGateway } from "@/lib/pagamentos/gateway";
import { mercadoPago } from "@/lib/pagamentos/mercadopago";
import { ErroCheckout, montarPedido, type PedidoMontado } from "@/lib/pedidos/montagem";
import { hashToken, novoToken, pdfFinal, tokenValido } from "@/lib/pedidos/servidor";

const entrada = z.union([
  z.object({
    slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
    nome: z.string().trim().min(2, "Informe seu nome.").max(120),
    email: z.string().trim().toLowerCase().email("E-mail inválido.").max(200),
    cupom: z.string().max(20).optional(),
    comBump: z.boolean().optional(),
    canal: z.string().max(60).optional(),
    aceite: z.literal(true, { message: "É preciso aceitar os termos para comprar." }),
  }),
  z.object({ upsellDe: z.string().max(40), token: z.string().max(100) }),
]);

/** Oferta pós-compra: mesmos dados do comprador, preço e arquivo vindos do banco. */
async function montarUpsell(pedidoId: string, token: string) {
  const db = dbAdmin();
  const anterior = (await db.collection("pedidos").doc(pedidoId).get()).data();
  if (!anterior || anterior.status !== "pago" || !tokenValido(token, anterior.tokensHash)) throw new ErroCheckout("Oferta indisponível.", 403);
  const u = (await db.collection("produtos").doc(anterior.produtoId).get()).data()?.oferta?.upsell;
  if (!u || anterior.itens.some((i: { produtoId: string }) => i.produtoId === u.produtoId)) throw new ErroCheckout("Oferta indisponível.");
  const dono = (await db.collection("produtos").doc(u.produtoId).get()).data()?.donoId;
  const caminho = dono === anterior.vendedorId ? await pdfFinal(db, anterior.vendedorId, u.produtoId) : null;
  if (!caminho) throw new ErroCheckout("Oferta indisponível.");
  const montado: PedidoMontado = {
    vendedorId: anterior.vendedorId,
    produtoId: u.produtoId,
    itens: [{ produtoId: u.produtoId, titulo: u.titulo, precoCentavos: u.precoCentavos, caminho, tipo: "upsell" }],
    subtotalCentavos: u.precoCentavos,
    descontoCentavos: 0,
    totalCentavos: u.precoCentavos,
    cupomId: null,
    cupomCodigo: null,
  };
  return { montado, comprador: anterior.comprador as { nome: string; email: string }, slug: anterior.slug as string, canal: "upsell" };
}

export async function POST(req: Request) {
  if (!dentroDoLimite(`checkout:${ipDe(req)}`, 10)) return NextResponse.json({ erro: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  const p = entrada.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: p.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });

  try {
    const db = dbAdmin();
    const d = p.data;
    const { montado, comprador, slug, canal } =
      "upsellDe" in d
        ? await montarUpsell(d.upsellDe, d.token)
        : { montado: await montarPedido(db, d.slug, d), comprador: { nome: d.nome, email: d.email }, slug: d.slug, canal: d.canal ?? "direto" };

    const tokenVendedor = await tokenDoVendedor(montado.vendedorId);
    if (!tokenVendedor) throw new ErroCheckout("As vendas deste produto ainda não estão abertas.");

    const tokenAcesso = novoToken();
    const ref = db.collection("pedidos").doc();
    await ref.set({
      ...montado, slug, comprador, canal, status: "pendente", downloads: 0, tokensHash: [hashToken(tokenAcesso)],
      criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(),
    });

    const site = process.env.NEXT_PUBLIC_URL_SITE ?? new URL(req.url).origin;
    const { urlPagamento } = await mercadoPago.criarCobranca(tokenVendedor, {
      referencia: ref.id,
      comprador,
      itens: montado.itens.map((i) => ({ id: i.produtoId, titulo: i.titulo, precoCentavos: i.precoCentavos })),
      urlRetorno: `${site}/pedido/${ref.id}?t=${tokenAcesso}`,
    });
    console.info(JSON.stringify({ evento: "checkout", pedidoId: ref.id, vendedorId: montado.vendedorId, totalCentavos: montado.totalCentavos }));
    return NextResponse.json({ urlPagamento });
  } catch (e) {
    if (e instanceof ErroCheckout) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error(JSON.stringify({ evento: "checkout", ok: false, erro: String(e) }));
    const msg = e instanceof ErroGateway ? "O pagamento não pôde ser iniciado agora. Tente de novo em instantes." : "Algo deu errado. Tente de novo.";
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
