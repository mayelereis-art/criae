import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/sessao";

const LIMITE = 20 * 1024 * 1024;

/**
 * Entrega ao navegador uma imagem do próprio criador, para compor criativos no canvas e montar o ZIP.
 * POST: o endereço do Storage traz um token e não deve aparecer nos registros de acesso.
 */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  const corpo = (await req.json().catch(() => null)) as { url?: unknown } | null;
  let url: URL;
  try {
    url = new URL(String(corpo?.url));
  } catch {
    return NextResponse.json({ erro: "Endereço inválido." }, { status: 400 });
  }
  // Só o Storage deste projeto e só a pasta de quem pediu: nunca um endereço qualquer.
  const prefixo = `/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(`criadores/${usuario.uid}/`)}`;
  if (url.protocol !== "https:" || url.hostname !== "firebasestorage.googleapis.com" || !url.pathname.startsWith(prefixo))
    return NextResponse.json({ erro: "Imagem não permitida." }, { status: 403 });

  const res = await fetch(url, { redirect: "error", cache: "no-store" }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ erro: "Não foi possível ler a imagem." }, { status: 502 });
  const tipo = res.headers.get("content-type") ?? "";
  const dados = await res.arrayBuffer();
  if (!tipo.startsWith("image/") || dados.byteLength > LIMITE) return NextResponse.json({ erro: "Arquivo não permitido." }, { status: 415 });
  return new NextResponse(dados, { headers: { "Content-Type": tipo, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
