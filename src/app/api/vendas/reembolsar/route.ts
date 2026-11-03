import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/firebase/admin";
import { tokenDoVendedor } from "@/lib/pagamentos/conexoes";
import { ErroGateway } from "@/lib/pagamentos/gateway";
import { mercadoPago } from "@/lib/pagamentos/mercadopago";
import { aplicarPagamento } from "@/lib/pedidos/servidor";
import { usuarioAtual } from "@/lib/sessao";

/** Reembolso integral pedido pelo vendedor. O acesso é revogado quando o gateway confirma. */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  const p = z.object({ pedidoId: z.string().max(40) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  const pedido = (await dbAdmin().collection("pedidos").doc(p.data.pedidoId).get()).data();
  if (!pedido || pedido.vendedorId !== usuario.uid) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  if (pedido.status !== "pago" || !pedido.pagamentoId) return NextResponse.json({ erro: "Só pedidos pagos podem ser reembolsados." }, { status: 422 });
  try {
    const token = await tokenDoVendedor(usuario.uid);
    if (!token) return NextResponse.json({ erro: "Conecte o Mercado Pago de novo para reembolsar." }, { status: 422 });
    await mercadoPago.reembolsar(token, pedido.pagamentoId, `reembolso-${p.data.pedidoId}`);
    const pagamento = await mercadoPago.consultarPagamento(token, pedido.pagamentoId);
    if (pagamento) await aplicarPagamento(pagamento, usuario.uid);
    console.info(JSON.stringify({ evento: "reembolso", pedidoId: p.data.pedidoId, uid: usuario.uid }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(JSON.stringify({ evento: "reembolso", pedidoId: p.data.pedidoId, ok: false, erro: String(e) }));
    return NextResponse.json({ erro: e instanceof ErroGateway ? e.message : "Não foi possível reembolsar agora." }, { status: 502 });
  }
}
