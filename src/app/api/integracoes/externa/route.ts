import { randomBytes, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { lerTokenExterno, guardarTokenExterno, removerTokenExterno } from "@/lib/pedidos/externos";
import { usuarioAtual } from "@/lib/sessao";

const plataforma = z.enum(["kiwify", "hotmart"]);
const entrada = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("salvar"), plataforma, token: z.string().trim().min(8, "O token parece incompleto.").max(200) }),
  z.object({ acao: z.literal("remover"), plataforma }),
  z.object({ acao: z.literal("testar"), plataforma }),
]);

/** Corpo fictício no formato de cada plataforma, para conferir o caminho completo até Minhas vendas. */
function corpoDeTeste(p: "kiwify" | "hotmart", nome: string, email: string) {
  const transacao = `TESTE-CRIAE-${randomBytes(6).toString("hex")}`;
  if (p === "kiwify")
    return { order_id: transacao, order_status: "paid", webhook_event_type: "order_approved", payment_method: "pix", Product: { product_id: "teste", product_name: "Venda de teste" }, Customer: { full_name: nome, email }, Commissions: { charge_amount: 100, currency: "BRL" }, TrackingParameters: { utm_source: "teste" } };
  return { id: transacao, event: "PURCHASE_APPROVED", version: "2.0.0", data: { product: { ucode: "teste", name: "Venda de teste" }, buyer: { name: nome, email }, purchase: { transaction: transacao, status: "APPROVED", full_price: { value: 1, currency_value: "BRL" }, payment: { type: "PIX" }, origin: { sck: "teste" } } } };
}

export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  const p = entrada.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: p.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const d = p.data;

  if (d.acao === "salvar") {
    await guardarTokenExterno(usuario.uid, d.plataforma, d.token);
    return NextResponse.json({ ok: true });
  }
  if (d.acao === "remover") {
    await removerTokenExterno(usuario.uid, d.plataforma);
    return NextResponse.json({ ok: true });
  }

  // Passa pelo mesmo endereço público que a plataforma usa, com a validação de verdade.
  const token = await lerTokenExterno(usuario.uid, d.plataforma);
  if (!token) return NextResponse.json({ erro: "Salve o token antes de testar." }, { status: 422 });
  const corpo = JSON.stringify(corpoDeTeste(d.plataforma, usuario.nome || "Comprador de teste", usuario.email));
  const base = `${process.env.NEXT_PUBLIC_URL_SITE}/api/webhooks/vendas/${d.plataforma}/${usuario.uid}`;
  const res = await fetch(d.plataforma === "kiwify" ? `${base}?signature=${createHmac("sha1", token).update(corpo).digest("hex")}` : base, {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", ...(d.plataforma === "hotmart" ? { "X-HOTMART-HOTTOK": token } : {}) },
    body: corpo,
  }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ erro: `O aviso de teste foi recusado (${res?.status ?? "sem resposta"}).` }, { status: 502 });
  return NextResponse.json({ ok: true });
}
