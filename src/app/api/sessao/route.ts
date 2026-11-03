import { NextResponse } from "next/server";
import { z } from "zod";
import { authAdmin } from "@/lib/firebase/admin";
import { COOKIE_SESSAO } from "@/lib/sessao";

const corpo = z.object({ token: z.string().min(100).max(4096) });

/** O cliente envia o ID token sempre que ele muda (login e renovação a cada hora). */
export async function POST(req: Request) {
  const parse = corpo.safeParse(await req.json().catch(() => null));
  if (!parse.success) return NextResponse.json({ erro: "Token ausente" }, { status: 400 });
  try {
    const t = await authAdmin.verifyIdToken(parse.data.token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_SESSAO, parse.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(0, t.exp - Math.floor(Date.now() / 1000)),
    });
    return res;
  } catch {
    return NextResponse.json({ erro: "Token inválido" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_SESSAO);
  return res;
}
