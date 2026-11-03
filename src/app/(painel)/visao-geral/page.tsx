import Link from "next/link";
import { Compass, Sparkles, PanelsTopLeft, Megaphone, BarChart3 } from "lucide-react";
import { CabecalhoPagina, EstadoVazio } from "@/components/ui";
import { Indicadores } from "./Indicadores";

export const metadata = { title: "Visão geral" };

const PASSOS = [
  { icone: Compass, titulo: "Escolha um nicho", texto: "A IA aponta oportunidades e público.", href: "/nichos" },
  { icone: Sparkles, titulo: "Crie o produto", texto: "Planejamento, redação, capa e PDF.", href: "/criar" },
  { icone: PanelsTopLeft, titulo: "Publique a página", texto: "Preço, página de vendas e checkout.", href: "/paginas" },
  { icone: Megaphone, titulo: "Divulgue", texto: "Posts, roteiros e mensagens prontos.", href: "/divulgacao" },
];

export default function VisaoGeral() {
  return (
    <>
      <CabecalhoPagina titulo="Visão geral" descricao="Seus resultados e o caminho até a primeira venda." />
      <Indicadores />

      <h2 className="mt-10 mb-4 font-display text-lg font-semibold">Do zero à primeira venda</h2>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PASSOS.map(({ icone: Icone, titulo, texto, href }, i) => (
          <li key={href}>
            <Link href={href} className="cartao group block h-full p-5 transition hover:border-borda-forte">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl border border-borda bg-superficie-2 text-primaria-clara transition group-hover:brilho-primario">
                  <Icone size={18} />
                </span>
                <span className="font-mono text-xs text-apagado">0{i + 1}</span>
              </div>
              <p className="mt-4 font-semibold">{titulo}</p>
              <p className="mt-1 text-sm text-suave">{texto}</p>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <EstadoVazio
          icone={BarChart3}
          titulo="Sem dados de vendas ainda"
          texto="Gráficos de faturamento, produtos mais vendidos e desempenho por canal aparecem aqui assim que houver vendas confirmadas."
        />
      </div>
    </>
  );
}
