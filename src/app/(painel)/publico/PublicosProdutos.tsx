"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Cartao, EstadoVazio, classesBotao } from "@/components/ui";
import { ouvirProdutos, type Produto } from "@/lib/produtos";

function Item({ rotulo, texto }: { rotulo: string; texto?: string }) {
  if (!texto) return null;
  return <div><dt className="text-xs text-apagado">{rotulo}</dt><dd className="mt-0.5 text-sm">{texto}</dd></div>;
}

export function PublicosProdutos() {
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState<Produto[] | null>(null);

  useEffect(() => {
    if (!usuario) return;
    return ouvirProdutos(usuario.uid, setProdutos, () => setProdutos([]));
  }, [usuario]);

  if (!produtos) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  const comPublico = produtos.filter((p) => p.configuracao.publicoAlvo);
  if (!comPublico.length)
    return (
      <EstadoVazio icone={Users} titulo="Nenhum público definido" texto="O público é definido quando você configura um produto.">
        <Link href="/criar" className={classesBotao()}>Criar um produto</Link>
      </EstadoVazio>
    );

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {comPublico.map((p) => {
        const c = p.configuracao;
        return (
          <li key={p.id}>
            <Cartao className="flex h-full flex-col">
              <h2 className="font-semibold">{p.titulo}</h2>
              <dl className="mt-3 grid gap-3">
                <Item rotulo={`Público${c.nivelPublico ? ` (${c.nivelPublico.toLowerCase()})` : ""}`} texto={c.publicoAlvo} />
                <Item rotulo="Problema que resolve" texto={c.problema} />
                <Item rotulo="Objetivo" texto={c.objetivo} />
                <Item rotulo="Transformação" texto={c.transformacao} />
                <Item rotulo="Tom" texto={c.tom} />
              </dl>
              <div className="mt-auto pt-4">
                <Link href={`/criar?id=${p.id}`} className={classesBotao("secundario")}>Editar público</Link>
              </div>
            </Cartao>
          </li>
        );
      })}
    </ul>
  );
}
