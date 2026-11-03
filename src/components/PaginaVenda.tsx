import { ShieldCheck, Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { FONTES, type ChaveFonte } from "@/config/identidade";
import { formatarPreco } from "@/lib/formato";
import type { Pagina } from "@/lib/paginas";
import { CapaPrevia } from "./CapaPrevia";

export type DadosPaginaVenda = Pick<Pagina, "modelo" | "cores" | "fontes" | "conteudo" | "secoes" | "oferta" | "capa" | "capaUrl" | "checkoutAtivo">;

/**
 * Página de vendas. Mesmo componente na prévia do editor e na página pública.
 * Usa consultas de contêiner (@3xl:) e não de tela, para a prévia de celular reagir à largura da moldura.
 */
export function PaginaVenda({ p }: { p: DadosPaginaVenda }) {
  const { cores, conteudo: c, secoes, oferta, modelo } = p;
  const fonteT = FONTES[p.fontes.titulo as ChaveFonte]?.css ?? "sans-serif";
  const fonteC = FONTES[p.fontes.corpo as ChaveFonte]?.css ?? "sans-serif";
  const sobrePrimaria = corSobre(cores.primaria);
  const heroEscuro = modelo === "impacto";
  const larguraTexto = modelo === "editorial" ? "max-w-2xl" : "max-w-4xl";

  const titulo = (t: string) => <h2 className="mb-5 text-2xl font-bold @3xl:text-3xl" style={{ fontFamily: fonteT, color: cores.primaria }}>{t}</h2>;
  const secao = (filho: ReactNode, alternada = false) => (
    <section className="px-5 py-12 @3xl:py-16" style={alternada && modelo !== "essencial" ? { background: cores.destaque } : undefined}>
      <div className={`mx-auto ${larguraTexto}`}>{filho}</div>
    </section>
  );

  const compra = (
    <div className={modelo === "editorial" ? "text-center" : ""}>
      {oferta.precoOriginalCentavos ? <p className="text-sm line-through opacity-70">de {formatarPreco(oferta.precoOriginalCentavos)}</p> : null}
      <p className="text-4xl font-bold" style={{ fontFamily: fonteT }}>{formatarPreco(oferta.precoCentavos)}</p>
      <p className="mt-1 text-sm opacity-80">Pagamento por Pix ou cartão. Você recebe o PDF por e-mail após a confirmação.</p>
      {p.checkoutAtivo ? (
        // O destino do botão entra com o checkout do Mercado Pago (Etapa 5, parte 2).
        <span className="mt-4 inline-block rounded-xl px-7 py-3.5 font-bold" style={{ background: heroEscuro ? sobrePrimaria : cores.primaria, color: heroEscuro ? cores.primaria : sobrePrimaria }}>{c.chamadaCompra}</span>
      ) : (
        <p className="mt-4 inline-block rounded-xl border border-current px-7 py-3.5 font-semibold opacity-80">Vendas ainda não abertas</p>
      )}
    </div>
  );

  const capa = (
    <div className={modelo === "impacto" ? "shrink-0 [transform:perspective(900px)_rotateY(-10deg)]" : "shrink-0"}>
      <CapaPrevia id={p.capa} titulo={c.tituloLivro} subtitulo={c.subtituloLivro} imagemUrl={p.capaUrl} largura={modelo === "essencial" ? 170 : 240} />
    </div>
  );

  return (
    <div className="@container" style={{ background: cores.fundo, color: cores.texto, fontFamily: fonteC }}>
      {/* Abertura */}
      <header className="px-5 py-14 @3xl:py-20" style={heroEscuro ? { background: cores.primaria, color: sobrePrimaria } : undefined}>
        <div className={`mx-auto flex max-w-4xl flex-col gap-10 ${modelo === "editorial" ? "items-center text-center" : "@3xl:flex-row @3xl:items-center @3xl:justify-between"}`}>
          {modelo === "editorial" && capa}
          <div className={modelo === "editorial" ? "max-w-2xl" : "max-w-xl"}>
            <h1 className="text-3xl leading-tight font-bold @3xl:text-5xl" style={{ fontFamily: fonteT, color: heroEscuro ? undefined : cores.primaria }}>{c.headline}</h1>
            <p className="mt-4 text-lg opacity-90">{c.subheadline}</p>
            <div className="mt-7">{compra}</div>
          </div>
          {modelo !== "editorial" && capa}
        </div>
      </header>

      {secoes.problema && secao(<>{titulo("Você se reconhece?")}<Paragrafos texto={c.problema} /></>)}

      {secoes.paraQuem && secao(
        <>
          {titulo("Para quem é")}
          <div className="grid gap-8 @3xl:grid-cols-2">
            <ListaMarcada itens={c.paraQuem} cor={cores.primaria} />
            {c.naoEParaQuem.length > 0 && (
              <div>
                <p className="mb-3 font-semibold">Não é indicado para:</p>
                <ul className="space-y-2">
                  {c.naoEParaQuem.map((i) => <li key={i} className="flex gap-2.5"><X size={18} className="mt-0.5 shrink-0 opacity-60" /> {i}</li>)}
                </ul>
              </div>
            )}
          </div>
        </>, true,
      )}

      {secoes.beneficios && secao(
        <>
          {titulo("O que muda para você")}
          <div className="grid gap-5 @3xl:grid-cols-2">
            {c.beneficios.map((b) => (
              <div key={b.titulo}>
                <h3 className="font-bold" style={{ fontFamily: fonteT }}>{b.titulo}</h3>
                <p className="mt-1 opacity-90">{b.texto}</p>
              </div>
            ))}
          </div>
        </>,
      )}

      {secoes.conteudo && secao(
        <>
          {titulo("O que tem dentro")}
          <Paragrafos texto={c.sobreOProduto} />
          <ol className="mt-5 space-y-2">
            {c.capitulos.map((t, i) => (
              <li key={t} className="flex gap-3"><span className="font-bold" style={{ color: cores.primaria }}>{String(i + 1).padStart(2, "0")}</span> {t}</li>
            ))}
          </ol>
        </>, true,
      )}

      {secoes.oQueVoceRecebe && secao(<>{titulo("O que você recebe")}<ListaMarcada itens={c.oQueVoceRecebe} cor={cores.primaria} /></>)}

      {secoes.garantia && secao(
        <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-center">
          <ShieldCheck size={48} className="shrink-0" style={{ color: cores.primaria }} />
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: fonteT }}>Garantia de {oferta.garantiaDias} dias</h2>
            <p className="mt-1 opacity-90">Se o material não for o que você esperava, peça o reembolso em até {oferta.garantiaDias} dias após a compra e devolvemos o valor integral.</p>
          </div>
        </div>, true,
      )}

      {secoes.faq && secao(
        <>
          {titulo("Perguntas frequentes")}
          <div className="space-y-5">
            {c.faq.map((f) => (
              <div key={f.pergunta}>
                <h3 className="font-bold">{f.pergunta}</h3>
                <p className="mt-1 opacity-90">{f.resposta}</p>
              </div>
            ))}
          </div>
        </>,
      )}

      <section className="px-5 py-14" style={{ background: cores.primaria, color: sobrePrimaria }}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-5 text-2xl font-bold" style={{ fontFamily: fonteT }}>{c.tituloLivro}</h2>
          <div className="[&>div]:text-center">{compra}</div>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-xs opacity-70">
        <p>{c.autor ? `Produto de ${c.autor}. ` : ""}Conteúdo informativo; resultados variam de pessoa para pessoa.</p>
        <p className="mt-1">
          <a href="/termos" className="underline">Termos de uso</a> · <a href="/privacidade" className="underline">Privacidade</a> · Feito com a Criaê
        </p>
      </footer>
    </div>
  );
}

function Paragrafos({ texto }: { texto: string }) {
  return <>{texto.split(/\n\s*\n/).map((t, i) => <p key={i} className="mb-3 text-[17px] leading-relaxed opacity-95">{t}</p>)}</>;
}

function ListaMarcada({ itens, cor }: { itens: string[]; cor: string }) {
  return (
    <ul className="space-y-2">
      {itens.map((i) => <li key={i} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0" style={{ color: cor }} /> {i}</li>)}
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
