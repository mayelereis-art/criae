"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldAlert, Sparkles, ArrowRight, Loader2, Bookmark, Check, Info } from "lucide-react";
import { NICHOS_INICIAIS } from "@/config/catalogo";
import { useAuth } from "@/components/ProvedorAuth";
import { Botao, Cartao, Selo, estiloEntrada } from "@/components/ui";
import { chamarIA } from "@/lib/ia/cliente";
import type { Oportunidade, PesquisaNicho } from "@/lib/ia/esquemas";
import { salvarOportunidade } from "@/lib/oportunidades";
import { criarProdutoDeOportunidade } from "@/lib/fabrica";
import { formatarPreco } from "@/lib/formato";

const ENTREGAS = [
  "Subnichos", "Problemas do público", "Desejos e necessidades", "Comprador ideal",
  "Temas com potencial", "Ideias de produto", "Diferenciais", "Títulos", "Monetização",
];

export function ExploradorNichos() {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [personalizado, setPersonalizado] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [pesquisando, setPesquisando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<{ nicho: string; dados: PesquisaNicho } | null>(null);

  const nicho = personalizado.trim() || NICHOS_INICIAIS.find((n) => n.id === selecionado)?.nome;
  const sensivel = !personalizado.trim() && NICHOS_INICIAIS.find((n) => n.id === selecionado && "sensivel" in n);

  const pesquisar = async () => {
    if (!nicho) return;
    setErro("");
    setPesquisando(true);
    try {
      const dados = await chamarIA<PesquisaNicho>("nicho", { nicho, detalhe: detalhe.trim() || undefined });
      setResultado({ nicho, dados });
      setTimeout(() => document.getElementById("resultado-nicho")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setPesquisando(false);
    }
  };

  return (
    <>
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

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs text-suave">Algo sobre você ou seu público? (opcional)</span>
            <textarea rows={2} maxLength={400} className={estiloEntrada} value={detalhe} onChange={(e) => setDetalhe(e.target.value)}
              placeholder="Ex.: sou manicure há 8 anos e atendo mulheres que trabalham fora" />
          </label>

          <p className="mt-4 mb-2 text-xs text-suave">A IA vai entregar:</p>
          <div className="flex flex-wrap gap-1.5">
            {ENTREGAS.map((e) => (
              <span key={e} className="rounded-full border border-borda px-2.5 py-1 text-xs text-suave">{e}</span>
            ))}
          </div>

          <div className="mt-6">
            <Botao className="w-full" disabled={!nicho || pesquisando} onClick={pesquisar}>
              {pesquisando ? <><Loader2 size={16} className="animate-spin" /> Analisando o nicho... (até 1 min)</> : <><Sparkles size={16} /> Encontrar oportunidades</>}
            </Botao>
            {erro && <p className="mt-2 text-sm text-erro" role="alert">{erro}</p>}
            {nicho && (
              <Link href={`/criar?nicho=${encodeURIComponent(nicho)}`} className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-primaria-clara hover:underline">
                Já sei o que criar: ir para a criação <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </Cartao>
      </div>

      {resultado && <ResultadoPesquisa {...resultado} />}
    </>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <Cartao>
      <h3 className="mb-2 text-sm font-semibold">{titulo}</h3>
      <ul className="space-y-1.5 text-sm text-suave">
        {itens.map((i) => <li key={i} className="flex gap-2"><span className="text-primaria-clara">•</span>{i}</li>)}
      </ul>
    </Cartao>
  );
}

function ResultadoPesquisa({ nicho, dados }: { nicho: string; dados: PesquisaNicho }) {
  return (
    <section id="resultado-nicho" className="mt-10 scroll-mt-6 animate-surgir">
      <h2 className="font-display text-xl font-bold">Oportunidades em {nicho}</h2>
      <p className="mt-2 flex items-start gap-2 text-xs text-apagado">
        <Info size={14} className="mt-0.5 shrink-0" />
        Hipóteses da IA a partir do comportamento do público, sem dados de busca ou vendas. Valide conversando com pessoas do nicho antes de investir em anúncios.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {dados.oportunidades.map((o) => <CartaoOportunidade key={o.nome} nicho={nicho} o={o} />)}
      </div>

      <Cartao className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">Comprador ideal</h3>
        <p className="text-sm text-suave">{dados.compradorIdeal}</p>
      </Cartao>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Lista titulo="Subnichos" itens={dados.subnichos} />
        <Lista titulo="Problemas do público" itens={dados.problemas} />
        <Lista titulo="Desejos e necessidades" itens={dados.desejos} />
        <Lista titulo="Temas com potencial" itens={dados.temas} />
        <Lista titulo="Diferenciais possíveis" itens={dados.diferenciais} />
        <Lista titulo="Títulos sugeridos" itens={dados.titulos} />
        <Lista titulo="Como monetizar" itens={dados.monetizacao} />
      </div>
    </section>
  );
}

export function CartaoOportunidade({ nicho, o, salva = false }: { nicho: string; o: Oportunidade; salva?: boolean }) {
  const { usuario } = useAuth();
  const router = useRouter();
  const [estado, setEstado] = useState<"livre" | "salvando" | "salva" | "criando">(salva ? "salva" : "livre");
  const [erro, setErro] = useState("");

  const salvar = async () => {
    if (!usuario) return;
    setEstado("salvando");
    try { await salvarOportunidade(usuario.uid, nicho, o); setEstado("salva"); }
    catch { setErro("Não foi possível salvar."); setEstado("livre"); }
  };
  const criar = async () => {
    if (!usuario) return;
    setEstado("criando");
    try { router.push(`/criar?id=${await criarProdutoDeOportunidade(usuario.uid, nicho, o)}`); }
    catch { setErro("Não foi possível criar o produto."); setEstado(salva ? "salva" : "livre"); }
  };

  return (
    <Cartao className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-semibold">{o.nome}</h3>
        <Selo tom="azul">{formatarPreco(o.precoSugeridoCentavos)}</Selo>
      </div>
      <p className="mt-1 text-xs text-apagado">{o.formato} · {o.subnicho}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div><dt className="text-xs text-apagado">Para quem</dt><dd className="text-suave">{o.publicoAlvo}</dd></div>
        <div><dt className="text-xs text-apagado">Problema</dt><dd className="text-suave">{o.problema}</dd></div>
        <div><dt className="text-xs text-apagado">Transformação</dt><dd className="text-suave">{o.transformacao}</dd></div>
        <div><dt className="text-xs text-apagado">Por que pode vender</dt><dd className="text-suave">{o.justificativa}</dd></div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Botao onClick={criar} disabled={estado === "criando"}>
          {estado === "criando" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Criar este produto
        </Botao>
        {!salva && (
          <Botao variante="secundario" onClick={salvar} disabled={estado !== "livre"}>
            {estado === "salva" ? <><Check size={16} /> Salva</> : <><Bookmark size={16} /> Salvar</>}
          </Botao>
        )}
      </div>
      {erro && <p className="mt-2 text-xs text-erro">{erro}</p>}
    </Cartao>
  );
}
