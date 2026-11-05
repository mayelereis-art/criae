import { NextResponse, type NextRequest } from "next/server";

/** Barreira rápida: sem cookie, nem entra no painel. A verificação do token acontece no layout do painel (Node). */
export function middleware(req: NextRequest) {
  if (req.cookies.has("__session")) return NextResponse.next();
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
