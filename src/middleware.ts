import { NextResponse, type NextRequest } from "next/server";

/** Barreira rápida: sem cookie, nem entra no painel. A verificação do token acontece no layout do painel (Node). */
export function middleware(req: NextRequest) {
  if (req.cookies.has("__session")) {
    // O layout do painel precisa do caminho para saber se a tela abre sem plano pago.
    const headers = new Headers(req.headers);
    headers.set("x-caminho", req.nextUrl.pathname);
    return NextResponse.next({ request: { headers } });
  }
  const url = new URL("/entrar", req.url);
  url.searchParams.set("volta", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/visao-geral", "/produtos/:path*", "/criar/:path*", "/biblioteca", "/nichos", "/oportunidades", "/publico",
    "/sugestoes", "/divulgacao", "/criativos", "/paginas", "/checkouts", "/vendas", "/conta", "/assinatura",
    "/creditos", "/integracoes", "/ajuda", "/admin/:path*",
  ],
};
