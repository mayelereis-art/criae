import { NextResponse } from "next/server";
import { sincronizarPaginas } from "@/lib/pedidos/servidor";
import { usuarioAtual } from "@/lib/sessao";

/** Recalcula o botão de compra das páginas do criador (depois de publicar ou salvar uma versão do PDF). */
export async function POST() {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  await sincronizarPaginas(usuario.uid);
  return NextResponse.json({ ok: true });
}
