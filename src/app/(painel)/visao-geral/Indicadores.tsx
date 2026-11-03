"use client";

import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/ProvedorAuth";
import { Cartao } from "@/components/ui";
import { useProdutos } from "../produtos/ListaProdutos";

/** Só números do banco. O que ainda não é medido aparece como "—", nunca como valor inventado. */
export function Indicadores() {
  const { usuario } = useAuth();
  const { lista } = useProdutos();
  const [vendas, setVendas] = useState<number | null>(null);

  useEffect(() => {
    if (!usuario) return;
    const q = query(collection(db, "pedidos"), where("vendedorId", "==", usuario.uid), where("status", "==", "pago"));
    getCountFromServer(q).then((r) => setVendas(r.data().count)).catch(() => setVendas(null));
  }, [usuario]);

  const contar = (f: (s: string) => boolean) => (lista ? lista.filter((p) => f(p.status)).length : null);
  const itens: { nome: string; valor: number | null; nota?: string }[] = [
    { nome: "Produtos", valor: lista?.length ?? null },
    { nome: "Publicados", valor: contar((s) => s === "publicado") },
    { nome: "Em edição", valor: contar((s) => s !== "publicado") },
    { nome: "Vendas", valor: vendas },
    { nome: "Faturamento bruto", valor: null, nota: "Com o checkout (Etapa 5)" },
    { nome: "Conversão", valor: null, nota: "Com o checkout (Etapa 5)" },
    { nome: "Visualizações", valor: null, nota: "Com as páginas (Etapa 5)" },
    { nome: "Cliques no checkout", valor: null, nota: "Com o checkout (Etapa 5)" },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {itens.map(({ nome, valor, nota }) => (
        <Cartao key={nome} className="p-4">
          <p className="text-xs text-suave">{nome}</p>
          <p className={`mt-2 font-display text-2xl font-bold ${valor === null ? "text-apagado" : ""}`}>{valor ?? "—"}</p>
          {nota && <p className="mt-1 text-[11px] text-apagado">{nota}</p>}
        </Cartao>
      ))}
    </section>
  );
}
