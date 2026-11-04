"use client";

import { ArrowRight, BadgeCheck, Check, ChevronDown, Lock, Quote, ShieldCheck, Timer, X, Zap } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { FONTES, type ChaveFonte } from "@/config/identidade";
import { formatarPreco } from "@/lib/formato";
import type { Pagina } from "@/lib/paginas";
import { NOMES_PLATAFORMA, promoAtiva } from "@/lib/promocao";
import { CapaPrevia } from "./CapaPrevia";

export type DadosPaginaVenda = Pick<Pagina, "slug" | "modelo" | "cores" | "fontes" | "conteudo" | "secoes" | "oferta" | "capa" | "capaUrl" | "checkoutAtivo" | "venda">;

const VERDE_BOTAO = "#15803D";
const VERMELHO = "#B91C1C";
/** O setTimeout do navegador estoura acima de cerca de 24 dias. */
const MAIOR_ESPERA = 2_000_000_000;

/**
 * Página de vendas. Mesmo componente na prévia do editor e na página pública.
 * Usa consultas de contêiner (@3xl:) e não de tela, para a prévia de celular reagir à largura da moldura.
 *
 * A contagem regressiva só aparece com uma oferta real: quando o prazo acaba, o preço volta ao normal
 * na tela e no checkout. Depoimentos só aparecem se o criador os cadastrou.
 */
export function PaginaVenda({ p }: { p: DadosPaginaVenda }) {
  const { cores, conteudo: c, secoes, oferta, modelo, venda } = p;
  const fonteT = FONTES[p.fontes.titulo as ChaveFonte]?.css ?? "sans-serif";
  const fonteC = FONTES[p.fontes.corpo as ChaveFonte]?.css ?? "sans-serif";
  const sobrePrimaria = corSobre(cores.primaria);
  const corBotao = cores.botao ?? VERDE_BOTAO;
  const sobreBotao = corSobre(corBotao);
  const heroForte = modelo !== "essencial";
  const coluna = modelo === "editorial" ? "max-w-2xl" : "max-w-5xl";
  const gradiente = `linear-gradient(135deg, ${cores.primaria}, color-mix(in srgb, ${cores.primaria} 62%, black))`;

  const [ativa, setAtiva] = useState(() => promoAtiva(oferta.promo));
  const [origem, setOrigem] = useState("");
  const encerrar = useCallback(() => setAtiva(false), []);

  useEffect(() => {
    setAtiva(promoAtiva(oferta.promo));
    setOrigem(new URLSearchParams(window.location.search).get("utm_source")?.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) ?? "");
    if (!oferta.promo || !promoAtiva(oferta.promo)) return;
    const resto = oferta.promo.terminaEm - Date.now();
    if (resto > MAIOR_ESPERA) return;
    const t = setTimeout(encerrar, resto + 50);
    return () => clearTimeout(t);
  }, [oferta.promo, encerrar]);

  const preco = ativa ? oferta.promo!.precoCentavos : oferta.precoCentavos;
  const precoRiscado = ativa ? oferta.precoCentavos : oferta.precoOriginalCentavos ?? null;
  const temRiscado = !!precoRiscado && precoRiscado > preco;
  const economia = temRiscado ? Math.round(((precoRiscado - preco) / precoRiscado) * 100) : 0;

  const externa = venda && venda.plataforma !== "mercadopago" ? venda : null;
  const linkExterno = externa ? (ativa && externa.linkPromo ? externa.linkPromo : externa.link) : null;
  const href = linkExterno ? (origem ? `${linkExterno}${linkExterno.includes("?") ? "&" : "?"}utm_source=${origem}` : linkExterno) : `/p/${p.slug}/comprar`;
  const aberta = externa ? !!linkExterno : !!p.checkoutAtivo;
  const nomeExterno = externa ? NOMES_PLATAFORMA[externa.plataforma] : "";
  const contaClique = () => {
    if (!externa) return; // no checkout próprio, o clique é contado na tela de compra
    fetch("/api/metricas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: p.slug, tipo: "cliques", canal: origem || undefined }), keepalive: true }).catch(() => {});
  };

  const botao = (grande = false, largura = "") => aberta ? (
    <a href={href} onClick={contaClique} className={`group inline-flex items-center justify-center gap-2.5 rounded-2xl text-center font-extrabold tracking-tight shadow-xl transition hover:-translate-y-0.5 hover:brightness-110 ${grande ? "px-8 py-5 text-lg @3xl:text-xl" : "px-6 py-3.5"} ${largura}`}
      style={{ background: corBotao, color: sobreBotao, boxShadow: `0 14px 36px -10px ${corBotao}` }}>
      {c.chamadaCompra} <ArrowRight size={grande ? 22 : 18} className="shrink-0 transition group-hover:translate-x-1" />
    </a>
  ) : (
    <p className={`inline-block rounded-2xl border-2 border-current px-7 py-4 font-semibold opacity-80 ${largura}`}>Vendas ainda não abertas</p>
  );

  const selos = (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium opacity-90">
      <li className="flex items-center gap-1.5"><Lock size={15} /> Pagamento seguro{externa ? ` pela ${nomeExterno}` : ""}</li>
      <li className="flex items-center gap-1.5"><Zap size={15} /> Acesso logo após a confirmação</li>
      <li className="flex items-center gap-1.5"><ShieldCheck size={15} /> Garantia de {oferta.garantiaDias} dias</li>
    </ul>
  );

  const titulo = (t: string, sobre?: string) => (
    <div className="mb-8 max-w-3xl">
      {sobre && <p className="mb-2 text-sm font-bold tracking-widest uppercase" style={{ color: cores.primaria }}>{sobre}</p>}
      <h2 className="text-3xl leading-tight font-extrabold @3xl:text-4xl" style={{ fontFamily: fonteT }}>{t}</h2>
    </div>
  );
  const secao = (filho: ReactNode, estilo?: CSSProperties) => (
    <section className="px-5 py-14 @3xl:py-20" style={estilo}>
      <div className={`mx-auto ${coluna}`}>{filho}</div>
    </section>
  );
  const fundoBloco: CSSProperties = { background: cores.destaque };
  const cartao = "rounded-2xl border p-5 @3xl:p-6";
  const estiloCartao: CSSProperties = { borderColor: `${cores.texto}22`, background: cores.fundo };

  const caixaPreco = (
    <div className="rounded-3xl border-2 p-6 text-center shadow-2xl @3xl:p-10" style={{ borderColor: cores.primaria, background: cores.fundo, color: cores.texto }}>
      {ativa && <p className="mb-3 inline-block rounded-full px-4 py-1 text-sm font-bold" style={{ background: VERMELHO, color: "#fff" }}>Oferta com prazo</p>}
      <p className="text-lg font-bold" style={{ fontFamily: fonteT }}>{c.tituloLivro}</p>
      {temRiscado && <p className="mt-4 text-lg line-through opacity-60">de {formatarPreco(precoRiscado)}</p>}
      <p className="mt-1 text-5xl font-extrabold tracking-tight @3xl:text-6xl" style={{ fontFamily: fonteT, color: cores.primaria }}>{formatarPreco(preco)}</p>
      {economia > 0 && <p className="mt-2 text-sm font-bold" style={{ color: VERDE_BOTAO }}>Você economiza {economia}%</p>}
      {ativa && <div className="mt-5"><Contagem ate={oferta.promo!.terminaEm} cor={VERMELHO} sobre="#fff" aoAcabar={encerrar} /></div>}
      <div className="mt-6">{botao(true, "w-full")}</div>
      <p className="mt-4 text-sm opacity-75">
        {externa ? `Pagamento e acesso ao PDF pela ${nomeExterno}.` : "Pagamento por Pix ou cartão. Você recebe o PDF por e-mail após a confirmação."}
      </p>
    </div>
  );

  const capa = (
    <div className="relative shrink-0 self-center">
      <div aria-hidden className="absolute -inset-6 rounded-full opacity-40 blur-3xl" style={{ background: heroForte ? sobrePrimaria : cores.primaria }} />
      <div className="relative [transform:perspective(1000px)_rotateY(-12deg)_rotateX(2deg)] drop-shadow-2xl">
        <CapaPrevia id={p.capa} titulo={c.tituloLivro} subtitulo={c.subtituloLivro} imagemUrl={p.capaUrl} largura={modelo === "essencial" ? 210 : 280} />
      </div>
    </div>
  );

  const aprendizados = c.aprendizados ?? [];
  const antesDepois = c.antesDepois ?? [];
  const depoimentos = c.depoimentos ?? [];

  return (
    <div className="@container" style={{ background: cores.fundo, color: cores.texto, fontFamily: fonteC }}>
      {ativa && (
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm font-bold shadow-lg" style={{ background: VERMELHO, color: "#fff" }}>
          <span className="flex items-center gap-1.5"><Timer size={16} /> Este preço termina em</span>
          <Contagem ate={oferta.promo!.terminaEm} compacta cor="#fff" sobre={VERMELHO} aoAcabar={encerrar} />
        </div>
      )}

      {/* Abertura */}
      <header className="overflow-hidden px-5 py-14 @3xl:py-24" style={heroForte ? { background: gradiente, color: sobrePrimaria } : undefined}>
        <div className={`mx-auto flex ${coluna} flex-col gap-12 ${modelo === "editorial" ? "items-center text-center" : "@3xl:flex-row @3xl:items-center @3xl:justify-between"}`}>
          <div className={modelo === "editorial" ? "" : "max-w-2xl"}>
            {c.chamadaTopo && <p className="mb-4 inline-block rounded-full border px-4 py-1.5 text-sm font-bold" style={{ borderColor: "currentColor" }}>{c.chamadaTopo}</p>}
            <h1 className="text-4xl leading-[1.08] font-extrabold tracking-tight @3xl:text-6xl" style={{ fontFamily: fonteT, color: heroForte ? undefined : cores.primaria }}>{c.headline}</h1>
            <p className="mt-5 text-lg leading-relaxed opacity-95 @3xl:text-xl">{c.subheadline}</p>
            {aprendizados.length > 0 && (
              <ul className={`mt-6 space-y-2 ${modelo === "editorial" ? "inline-block text-left" : ""}`}>
                {aprendizados.slice(0, 3).map((a) => <li key={a} className="flex gap-2.5 font-medium"><BadgeCheck size={20} className="mt-0.5 shrink-0" /> {a}</li>)}
              </ul>
            )}
            <div className={`mt-8 flex flex-wrap items-center gap-4 ${modelo === "editorial" ? "justify-center" : ""}`}>
              {botao(true)}
              <div className="text-left">
                {temRiscado && <p className="text-sm line-through opacity-70">de {formatarPreco(precoRiscado)}</p>}
                <p className="text-3xl font-extrabold" style={{ fontFamily: fonteT }}>{formatarPreco(preco)}</p>
              </div>
            </div>
            <div className={`mt-6 ${modelo === "editorial" ? "flex justify-center" : ""}`}>{selos}</div>
          </div>
          {capa}
        </div>
      </header>

      {secoes.problema && secao(<>{titulo("Você se reconhece?", "O problema")}<div className="max-w-3xl"><Paragrafos texto={c.problema} /></div></>)}

      {secoes.antesDepois !== false && antesDepois.length > 0 && secao(
        <>
          {titulo("O que muda quando você tem um método", "Antes e depois")}
          <div className="grid gap-4 @3xl:grid-cols-2">
            <div className={cartao} style={{ ...estiloCartao, borderColor: `${VERMELHO}55` }}>
              <p className="mb-4 font-extrabold" style={{ color: VERMELHO }}>Hoje</p>
              <ul className="space-y-3">{antesDepois.map((a) => <li key={a.antes} className="flex gap-2.5"><X size={20} className="mt-0.5 shrink-0" style={{ color: VERMELHO }} /> {a.antes}</li>)}</ul>
            </div>
            <div className={cartao} style={{ ...estiloCartao, borderColor: `${VERDE_BOTAO}88` }}>
              <p className="mb-4 font-extrabold" style={{ color: VERDE_BOTAO }}>Com o material em mãos</p>
              <ul className="space-y-3">{antesDepois.map((a) => <li key={a.depois} className="flex gap-2.5"><Check size={20} className="mt-0.5 shrink-0" style={{ color: VERDE_BOTAO }} /> {a.depois}</li>)}</ul>
            </div>
          </div>
        </>, fundoBloco,
      )}

      {secoes.beneficios && secao(
        <>
          {titulo("O que você ganha com este material", "Benefícios")}
          <div className="grid gap-4 @3xl:grid-cols-2">
            {c.beneficios.map((b) => (
              <div key={b.titulo} className={cartao} style={estiloCartao}>
                <h3 className="flex gap-2.5 text-lg font-extrabold" style={{ fontFamily: fonteT }}><BadgeCheck size={22} className="mt-0.5 shrink-0" style={{ color: cores.primaria }} /> {b.titulo}</h3>
                <p className="mt-2 leading-relaxed opacity-90">{b.texto}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">{botao(true)}</div>
        </>,
      )}

      {secoes.conteudo && secao(
        <>
          {titulo("Tudo o que tem dentro", "Conteúdo")}
          <div className="max-w-3xl"><Paragrafos texto={c.sobreOProduto} /></div>
          {aprendizados.length > 3 && (
            <ul className="mt-6 grid gap-3 @3xl:grid-cols-2">
              {aprendizados.map((a) => <li key={a} className="flex gap-2.5 font-medium"><Check size={20} className="mt-0.5 shrink-0" style={{ color: cores.primaria }} /> {a}</li>)}
            </ul>
          )}
          <ol className="mt-8 grid gap-2.5 @3xl:grid-cols-2">
            {c.capitulos.map((t, i) => (
              <li key={t} className="flex items-center gap-3 rounded-xl p-3.5" style={{ background: cores.fundo }}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-extrabold" style={{ background: cores.primaria, color: sobrePrimaria }}>{i + 1}</span>
                <span className="font-medium">{t}</span>
              </li>
            ))}
          </ol>
        </>, fundoBloco,
      )}

      {secoes.paraQuem && secao(
        <>
          {titulo("Este material é para você?", "Para quem é")}
          <div className="grid gap-4 @3xl:grid-cols-2">
            <div className={cartao} style={estiloCartao}><p className="mb-4 font-extrabold">É para você se:</p><ListaMarcada itens={c.paraQuem} cor={VERDE_BOTAO} /></div>
            {c.naoEParaQuem.length > 0 && (
              <div className={cartao} style={estiloCartao}>
                <p className="mb-4 font-extrabold">Não é indicado se:</p>
                <ul className="space-y-3">
                  {c.naoEParaQuem.map((i) => <li key={i} className="flex gap-2.5"><X size={20} className="mt-0.5 shrink-0 opacity-60" /> {i}</li>)}
                </ul>
              </div>
            )}
          </div>
        </>,
      )}

      {depoimentos.length > 0 && secao(
        <>
          {titulo("Quem já leu", "Depoimentos")}
          <div className="grid gap-4 @3xl:grid-cols-2">
            {depoimentos.filter((d) => d.nome && d.texto).map((d) => (
              <figure key={d.nome + d.texto} className={cartao} style={estiloCartao}>
                <Quote size={24} style={{ color: cores.primaria }} />
                <blockquote className="mt-2 leading-relaxed">{d.texto}</blockquote>
                <figcaption className="mt-3 font-bold">{d.nome}</figcaption>
              </figure>
            ))}
          </div>
        </>, fundoBloco,
      )}

      {/* Oferta */}
      <section id="oferta" className="px-5 py-14 @3xl:py-20" style={{ background: gradiente, color: sobrePrimaria }}>
        <div className="mx-auto grid max-w-5xl items-center gap-10 @3xl:grid-cols-2">
          <div>
            <h2 className="text-3xl leading-tight font-extrabold @3xl:text-4xl" style={{ fontFamily: fonteT }}>O que você recebe</h2>
            {secoes.oQueVoceRecebe && (
              <ul className="mt-6 space-y-3 text-lg">
                {c.oQueVoceRecebe.map((i) => <li key={i} className="flex gap-3"><BadgeCheck size={24} className="mt-0.5 shrink-0" /> {i}</li>)}
              </ul>
            )}
            <div className="mt-6">{selos}</div>
          </div>
          {caixaPreco}
        </div>
      </section>

      {secoes.garantia && secao(
        <div className="flex flex-col items-center gap-6 text-center @3xl:flex-row @3xl:text-left">
          <div className="grid size-32 shrink-0 place-items-center rounded-full border-4 text-center" style={{ borderColor: cores.primaria, color: cores.primaria }}>
            <div><ShieldCheck size={34} className="mx-auto" /><p className="text-2xl leading-none font-extrabold">{oferta.garantiaDias}</p><p className="text-xs font-bold uppercase">dias</p></div>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold @3xl:text-3xl" style={{ fontFamily: fonteT }}>Garantia de {oferta.garantiaDias} dias</h2>
            <p className="mt-2 text-lg leading-relaxed opacity-90">Leia com calma. Se o material não for o que você esperava, peça o reembolso em até {oferta.garantiaDias} dias após a compra e o valor volta integralmente para você.</p>
          </div>
        </div>,
      )}

      {secoes.faq && secao(
        <>
          {titulo("Perguntas frequentes", "Dúvidas")}
          <div className="max-w-3xl space-y-3">
            {c.faq.map((f) => (
              <details key={f.pergunta} className="group rounded-xl p-4" style={{ background: cores.fundo }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
                  {f.pergunta} <ChevronDown size={18} className="shrink-0 transition group-open:rotate-180" />
                </summary>
                <p className="mt-2.5 leading-relaxed opacity-90">{f.resposta}</p>
              </details>
            ))}
          </div>
        </>, fundoBloco,
      )}

      <section className="px-5 py-16 text-center @3xl:py-24" style={{ background: gradiente, color: sobrePrimaria }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl leading-tight font-extrabold @3xl:text-5xl" style={{ fontFamily: fonteT }}>{c.tituloLivro}</h2>
          {c.chamadaFinal && <p className="mt-5 text-lg leading-relaxed opacity-95 @3xl:text-xl">{c.chamadaFinal}</p>}
          <p className="mt-6 text-4xl font-extrabold" style={{ fontFamily: fonteT }}>{formatarPreco(preco)}</p>
          <div className="mt-6">{botao(true)}</div>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-xs opacity-70">
        <p>{c.autor ? `Produto de ${c.autor}. ` : ""}Conteúdo informativo; resultados variam de pessoa para pessoa.</p>
        <p className="mt-1">
          <a href="/termos" className="underline">Termos de uso</a> · <a href="/privacidade" className="underline">Privacidade</a> · Feito com a Criaê
        </p>
      </footer>

      {/* Barra de compra fixa no celular */}
      {aberta && (
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t px-4 py-3 @3xl:hidden" style={{ background: cores.fundo, borderColor: `${cores.texto}22` }}>
          <div className="min-w-0">
            {temRiscado && <p className="text-xs line-through opacity-60">{formatarPreco(precoRiscado)}</p>}
            <p className="text-xl font-extrabold" style={{ color: cores.primaria }}>{formatarPreco(preco)}</p>
          </div>
          <a href={href} onClick={contaClique} className="truncate rounded-xl px-5 py-3 text-sm font-extrabold" style={{ background: corBotao, color: sobreBotao }}>{c.chamadaCompra}</a>
        </div>
      )}
    </div>
  );
}

/** Conta até o prazo real da oferta. Os números só aparecem no navegador, para não divergir do HTML do servidor. */
function Contagem({ ate, cor, sobre, compacta, aoAcabar }: { ate: number; cor: string; sobre: string; compacta?: boolean; aoAcabar: () => void }) {
  const [resto, setResto] = useState<number | null>(null);
  useEffect(() => {
    const atualizar = () => {
      const r = ate - Date.now();
      setResto(Math.max(0, r));
      if (r <= 0) aoAcabar();
    };
    atualizar();
    const t = setInterval(atualizar, 1000);
    return () => clearInterval(t);
  }, [ate, aoAcabar]);

  const s = Math.floor((resto ?? 0) / 1000);
  const partes: [number, string][] = [[Math.floor(s / 86400), "dias"], [Math.floor((s % 86400) / 3600), "horas"], [Math.floor((s % 3600) / 60), "min"], [s % 60, "seg"]];
  const texto = (n: number) => (resto === null ? "--" : String(n).padStart(2, "0"));

  if (compacta)
    return (
      <span className="font-mono text-base tabular-nums" role="timer">
        {partes[0][0] > 0 && `${partes[0][0]}d `}{texto(partes[1][0])}:{texto(partes[2][0])}:{texto(partes[3][0])}
      </span>
    );
  return (
    <div className="flex justify-center gap-2" role="timer">
      {partes.map(([n, r]) => (
        <div key={r} className="w-16 rounded-xl py-2" style={{ background: cor, color: sobre }}>
          <p className="font-mono text-2xl leading-none font-extrabold tabular-nums">{texto(n)}</p>
          <p className="mt-1 text-[10px] font-bold uppercase">{r}</p>
        </div>
      ))}
    </div>
  );
}

function Paragrafos({ texto }: { texto: string }) {
  return <>{texto.split(/\n\s*\n/).map((t, i) => <p key={i} className="mb-4 text-lg leading-relaxed opacity-95">{t}</p>)}</>;
}

function ListaMarcada({ itens, cor }: { itens: string[]; cor: string }) {
  return (
    <ul className="space-y-3">
      {itens.map((i) => <li key={i} className="flex gap-2.5"><Check size={20} className="mt-0.5 shrink-0" style={{ color: cor }} /> {i}</li>)}
    </ul>
  );
}

/** Texto branco ou quase preto, conforme o que dá mais contraste sobre a cor de fundo. */
function corSobre(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
  return lum > 0.4 ? "#111111" : "#FFFFFF";
}
