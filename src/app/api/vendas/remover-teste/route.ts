import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/firebase/admin";
import { usuarioAtual } from "@/lib/sessao";

/** Apaga só venda de teste do próprio criador. Venda de verdade nunca sai do histórico. */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  const p = z.object({ pedidoId: z.string().max(60) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  const ref = dbAdmin().collection("pedidos").doc(p.data.pedidoId);
  const pedido = (await ref.get()).data();
  if (!pedido || pedido.vendedorId !== usuario.uid || pedido.status !== "teste") return NextResponse.json({ erro: "Venda de teste não encontrada." }, { status: 404 });
  await ref.delete();
  return NextResponse.json({ ok: true });
}
