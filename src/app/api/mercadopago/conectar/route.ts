import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { mercadoPago } from "@/lib/pagamentos/mercadopago";
import { usuarioAtual } from "@/lib/sessao";

/** Leva o criador ao Mercado Pago. O "state" no cookie impede conectar uma conta na sessão de outra pessoa. */
export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_URL_SITE ?? new URL(req.url).origin;
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.redirect(`${site}/entrar?volta=/integracoes`);
  try {
    const estado = randomBytes(24).toString("base64url");
    const res = NextResponse.redirect(mercadoPago.urlAutorizacao(estado));
    res.cookies.set("mp_estado", estado, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return res;
  } catch (e) {
    console.error(JSON.stringify({ evento: "mp-conectar", ok: false, erro: String(e) }));
    return NextResponse.redirect(`${site}/integracoes?mp=erro`);
  }
}
