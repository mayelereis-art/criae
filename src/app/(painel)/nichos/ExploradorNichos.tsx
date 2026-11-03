"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { ShieldAlert, Sparkles, ArrowRight } from "lucide-react";
import { NICHOS_INICIAIS } from "@/config/catalogo";
import { AvisoEtapa, Botao, Cartao, estiloEntrada } from "@/components/ui";

const ENTREGAS = [
  "Subnichos", "Problemas do público", "Desejos e necessidades", "Comprador ideal",
  "Temas com potencial", "Ideias de produto", "Diferenciais", "Títulos", "Monetização",
];

export function ExploradorNichos() {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [personalizado, setPersonalizado] = useState("");
  const nicho = personalizado.trim() || NICHOS_INICIAIS.find((n) => n.id === selecionado)?.nome;
  const sensivel = !personalizado.trim() && NICHOS_INICIAIS.find((n) => n.id === selecionado && "sensivel" in n);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {NICHOS_INICIAIS.map((n) => (
            <button
              key={n.id}
              onClick={() => { setSelecionado(n.id); setPersonalizado(""); }}
              aria-pressed={selecionado === n.id && !personalizado}
              className={clsx(
                "cartao flex items-center gap-3 px-4 py-3.5 text-left text-sm transition",
                selecionado === n.id && !personalizado ? "border-primaria-clara! brilho-primario" : "hover:border-borda-forte",
              )}
            >
              <span className="text-xl" aria-hidden>{n.emoji}</span>
              <span className="min-w-0 font-medium hyphens-auto">{n.nome}</span>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="nicho-livre">Ou descreva um nicho seu</label>
          <input
            id="nicho-livre"
            className={estiloEntrada}
            placeholder="Ex.: confeitaria para quem quer vender bolos no pote em casa"
            value={personalizado}
            onChange={(e) => setPersonalizado(e.target.value)}
            maxLength={140}
          />
        </div>
      </div>

      <Cartao className="h-fit lg:sticky lg:top-8">
        <p className="font-mono text-[10px] tracking-[0.2em] text-apagado uppercase">Nicho escolhido</p>
        <p className="mt-1 font-display text-lg font-semibold">{nicho ?? "Nenhum ainda"}</p>

        {sensivel && (
          <p className="mt-3 flex gap-2 rounded-lg border border-alerta/30 bg-alerta/5 p-2.5 text-xs text-suave">
            <ShieldAlert size={15} className="shrink-0 text-alerta" />
            Tema sensível: o conteúdo terá avisos de limitação e não fará promessas de resultado.
          </p>
        )}

        <p className="mt-5 mb-2 text-xs text-suave">A IA vai entregar:</p>
        <div className="flex flex-wrap gap-1.5">
          {ENTREGAS.map((e) => (
            <span key={e} className="rounded-full border border-borda px-2.5 py-1 text-xs text-suave">{e}</span>
          ))}
        </div>

        <div className="mt-6">
          <AvisoEtapa etapa={4} oQueFalta="A pesquisa com IA é ligada quando a chave do Claude estiver no servidor." />
          <Botao className="w-full" disabled>
            <Sparkles size={16} /> Encontrar oportunidades
          </Botao>
          {nicho && (
            <Link
              href={`/criar?nicho=${encodeURIComponent(nicho)}`}
              className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-primaria-clara hover:underline"
            >
              Já sei o que criar: ir para a criação <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </Cartao>
    </div>
  );
}
