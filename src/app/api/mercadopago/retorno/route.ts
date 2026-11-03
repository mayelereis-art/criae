import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { guardarConexao } from "@/lib/pagamentos/conexoes";
import { mercadoPago } from "@/lib/pagamentos/mercadopago";
import { sincronizarPaginas } from "@/lib/pedidos/servidor";
import { usuarioAtual } from "@/lib/sessao";

/** Volta do Mercado Pago com o código de autorização do criador. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const site = process.env.NEXT_PUBLIC_URL_SITE ?? url.origin;
  const voltar = (s: string) => {
    const res = NextResponse.redirect(`${site}/integracoes?mp=${s}`);
    res.cookies.delete("mp_estado");
    return res;
  };
  const usuario = await usuarioAtual();
  const estado = (await cookies()).get("mp_estado")?.value;
  const codigo = url.searchParams.get("code");
  if (!usuario || !estado || estado !== url.searchParams.get("state")) return voltar("estado");
  if (!codigo) return voltar("cancelado");
  try {
    await guardarConexao(usuario.uid, await mercadoPago.trocarCodigo(codigo));
    await sincronizarPaginas(usuario.uid);
    console.info(JSON.stringify({ evento: "mp-conectado", uid: usuario.uid }));
    return voltar("ok");
  } catch (e) {
    console.error(JSON.stringify({ evento: "mp-conectar", uid: usuario.uid, ok: false, erro: String(e) }));
    return voltar("erro");
  }
}
