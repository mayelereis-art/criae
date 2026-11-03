"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { formatarPreco } from "@/lib/formato";
import { ouvirPaginas, type Pagina } from "@/lib/paginas";
import { useAuth } from "@/components/ProvedorAuth";
import { Cartao } from "@/components/ui";
import { useProdutos } from "../produtos/ListaProdutos";

type PedidoPago = { totalCentavos: number; itens: { titulo: string }[] };

/** Só números do banco. O que não dá para calcular aparece como "—", nunca como valor inventado. */
export function Indicadores() {
  const { usuario } = useAuth();
  const { lista } = useProdutos();
  const [paginas, setPaginas] = useState<Pagina[] | null>(null);
  const [pagos, setPagos] = useState<PedidoPago[] | null>(null);
  const [metricas, setMetricas] = useState<{ visualizacoes: number; cliques: number } | null>(null);

  useEffect(() => {
    if (!usuario) return;
    getDocs(query(collection(db, "pedidos"), where("vendedorId", "==", usuario.uid), where("status", "==", "pago")))
      .then((r) => setPagos(r.docs.map((d) => d.data() as PedidoPago)))
      .catch(() => setPagos(null));
    getDocs(query(collection(db, "metricas"), where("donoId", "==", usuario.uid)))
      .then((r) => setMetricas(r.docs.reduce((s, d) => ({ visualizacoes: s.visualizacoes + (d.data().visualizacoes ?? 0), cliques: s.cliques + (d.data().cliques ?? 0) }), { visualizacoes: 0, cliques: 0 })))
      .catch(() => setMetricas(null));
    return ouvirPaginas(usuario.uid, setPaginas, () => setPaginas(null));
  }, [usuario]);

  const publicados = paginas ? new Set(paginas.filter((p) => p.publicada).map((p) => p.produtoId)).size : null;
  const faturamento = pagos ? formatarPreco(pagos.reduce((s, p) => s + p.totalCentavos, 0)) : null;
  const conversao = pagos && metricas?.visualizacoes ? `${((pagos.length / metricas.visualizacoes) * 100).toFixed(1).replace(".", ",")}%` : null;
  const ranking = Object.entries((pagos ?? []).reduce<Record<string, number>>((s, p) => {
    const t = p.itens[0]?.titulo ?? "Produto";
    s[t] = (s[t] ?? 0) + 1;
    return s;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const itens: { nome: string; valor: number | string | null }[] = [
    { nome: "Produtos", valor: lista?.length ?? null },
    { nome: "Publicados", valor: publicados },
    { nome: "Em edição", valor: lista && publicados !== null ? Math.max(lista.length - publicados, 0) : null },
    { nome: "Vendas", valor: pagos?.length ?? null },
    { nome: "Faturamento bruto", valor: faturamento },
    { nome: "Conversão", valor: conversao },
    { nome: "Visualizações", valor: metricas?.visualizacoes ?? null },
    { nome: "Cliques no checkout", valor: metricas?.cliques ?? null },
  ];

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {itens.map(({ nome, valor }) => (
          <Cartao key={nome} className="p-4">
            <p className="text-xs text-suave">{nome}</p>
            <p className={`mt-2 font-display text-2xl font-bold ${valor === null ? "text-apagado" : ""}`}>{valor ?? "—"}</p>
          </Cartao>
        ))}
      </section>
      {ranking.length > 0 && (
        <Cartao className="mt-3">
          <p className="mb-2 text-sm font-semibold">Produtos mais vendidos</p>
          <ol className="space-y-1.5 text-sm">
            {ranking.map(([t, n]) => <li key={t} className="flex justify-between gap-3"><span className="truncate text-suave">{t}</span><span className="font-semibold">{n}</span></li>)}
          </ol>
        </Cartao>
      )}
    </>
  );
}
