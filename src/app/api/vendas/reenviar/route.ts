import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/firebase/admin";
import { entregar, hashToken, novoToken } from "@/lib/pedidos/servidor";
import { usuarioAtual } from "@/lib/sessao";

/** Reenvia o e-mail de entrega com um novo link. */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  const p = z.object({ pedidoId: z.string().max(40) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  const ref = dbAdmin().collection("pedidos").doc(p.data.pedidoId);
  const pedido = (await ref.get()).data();
  if (!pedido || pedido.vendedorId !== usuario.uid) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  if (pedido.status !== "pago") return NextResponse.json({ erro: "O pedido não está pago." }, { status: 422 });
  const token = novoToken();
  await ref.update({ tokensHash: FieldValue.arrayUnion(hashToken(token)) });
  await entregar(p.data.pedidoId, token);
  const depois = (await ref.get()).data();
  return depois?.emailErro ? NextResponse.json({ erro: "O e-mail não pôde ser enviado." }, { status: 502 }) : NextResponse.json({ ok: true });
}
