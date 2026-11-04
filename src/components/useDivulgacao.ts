"use client";

import { useEffect, useMemo, useState } from "react";
import { mensagemErro } from "@/lib/firebase/erros";
import { ouvirPaginas, type Pagina } from "@/lib/paginas";
import { ouvirProdutos, type Produto } from "@/lib/produtos";
import { useAuth } from "./ProvedorAuth";

/** Produtos que já têm planejamento, o escolhido e o endereço real da página de vendas (null se não publicada). */
export function useDivulgacao(produtoId?: string) {
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!usuario) return;
    const a = ouvirProdutos(usuario.uid, setProdutos, (e) => setErro(mensagemErro(e)));
    const b = ouvirPaginas(usuario.uid, setPaginas, (e) => setErro(mensagemErro(e)));
    return () => { a(); b(); };
  }, [usuario]);

  const elegiveis = useMemo(() => (produtos ?? []).filter((p) => p.planejamento), [produtos]);
  const produto = elegiveis.find((p) => p.id === produtoId) ?? elegiveis[0] ?? null;
  const pagina = paginas.find((p) => p.produtoId === produto?.id && p.publicada);
  const base = process.env.NEXT_PUBLIC_URL_SITE || (typeof window !== "undefined" ? window.location.origin : "");
  const urlPagina = pagina ? `${base}/p/${pagina.slug}` : null;

  return { usuario, carregando: !usuario || produtos === null, elegiveis, produto, urlPagina, erro };
}
