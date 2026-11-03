import { NextResponse } from "next/server";
import { removerConexao } from "@/lib/pagamentos/conexoes";
import { sincronizarPaginas } from "@/lib/pedidos/servidor";
import { usuarioAtual } from "@/lib/sessao";

export async function POST() {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  await removerConexao(usuario.uid);
  await sincronizarPaginas(usuario.uid);
  return NextResponse.json({ ok: true });
}
