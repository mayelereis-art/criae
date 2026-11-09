"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, ImagePlus, Link2, Loader2, Megaphone, RefreshCw, Sparkles, Users } from "lucide-react";
import { BarraDivulgacao, BotaoZip, baixarArquivo } from "@/components/BarraDivulgacao";
import { Botao, Cartao, EstadoVazio, Selo, classesBotao, estiloEntrada } from "@/components/ui";
import { useDivulgacao } from "@/components/useDivulgacao";
import { comLink, dataDoDia, marcarFeito, mudarInicio, ouvirCampanha, salvarCampanha, salvarComunidades, type DocCampanha } from "@/lib/campanhas";
import { limparHashtag, linkBusca, linkHashtag } from "@/lib/comunidades";
import { lerImagemPropria, ouvirCriativos, type Criativo } from "@/lib/criativos/dados";
import { calendarioCsv, textosPorCanal } from "@/lib/criativos/materiais";
import { mensagemErro, mensagemFluxo } from "@/lib/firebase/erros";
import { chamarIA } from "@/lib/ia/cliente";
import type { Campanha, Comunidades } from "@/lib/ia/esquemas";
import type { Produto } from "@/lib/produtos";

const ABAS = ["Kit pronto", "Grupos", "Estratégia", "Instagram", "TikTok", "Facebook", "WhatsApp", "Anúncios", "Calendário"] as const;
type Aba = (typeof ABAS)[number];
const ARQUIVO: Record<Exclude<Aba, "Calendário">, string> = {
  "Kit pronto": "kit.txt", Grupos: "grupos.txt",
  Estratégia: "estrategia.txt", Instagram: "instagram.txt", TikTok: "tiktok.txt", Facebook: "facebook.txt", WhatsApp: "whatsapp.txt", Anúncios: "anuncios.txt",
};

function amanha() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function BotaoCopiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true);
      setFalhou(false);
      setTimeout(() => setOk(false), 1800);
    } catch {
      setFalhou(true);
    }
  };
  return (
    <button type="button" onClick={copiar} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-suave transition hover:bg-superficie-2 hover:text-texto">
      {ok ? <Check size={13} className="text-sucesso" /> : <Copy size={13} />} {falhou ? "Selecione e copie" : ok ? "Copiado" : "Copiar"}
    </button>
  );
}

function Peca({ titulo, texto, children }: { titulo?: string; texto: string; children?: React.ReactNode }) {
  return (
    <Cartao className="!p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        {titulo ? <p className="min-w-0 text-sm font-semibold">{titulo}</p> : <span />}
        <BotaoCopiar texto={texto} />
      </div>
      {children ?? <p className="text-sm leading-relaxed whitespace-pre-line text-suave">{texto}</p>}
    </Cartao>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2.5 font-mono text-[11px] tracking-[0.18em] text-apagado uppercase">{titulo}</h3>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function ConteudoAba({ aba, d, url }: { aba: Exclude<Aba, "Calendário" | "Kit pronto" | "Grupos">; d: Campanha; url: string | null }) {
  const ln = (t: string, canal: string) => comLink(t, url, canal);
  if (aba === "Estratégia")
    return (
      <>
        <Grupo titulo="Posicionamento"><Peca texto={d.estrategia.posicionamento} /></Grupo>
        <Grupo titulo="Mensagem central"><Peca texto={d.estrategia.mensagemCentral} /></Grupo>
        <Grupo titulo="Ângulos de comunicação">{d.estrategia.angulos.map((a) => <Peca key={a} texto={a} />)}</Grupo>
        <Grupo titulo="Canais prioritários">{d.estrategia.canaisPrioritarios.map((c) => <Peca key={c.canal} titulo={c.canal} texto={c.motivo} />)}</Grupo>
        <Grupo titulo="Objeções e como responder">{d.estrategia.objecoes.map((o) => <Peca key={o.objecao} titulo={o.objecao} texto={o.resposta} />)}</Grupo>
      </>
    );
  if (aba === "Instagram")
    return (
      <>
        <Grupo titulo="Posts">{d.instagram.posts.map((p) => {
          const texto = `${ln(p.legenda, "instagram")}\n\n${p.hashtags.join(" ")}`;
          return <Peca key={p.ideia} titulo={p.ideia} texto={texto} />;
        })}</Grupo>
        <Grupo titulo="Carrosséis">{d.instagram.carrosseis.map((c) => {
          const texto = `${c.slides.map((s, i) => `Slide ${i + 1}: ${s.titulo}\n${s.texto}`).join("\n\n")}\n\nLegenda:\n${ln(c.legenda, "instagram")}`;
          return <Peca key={c.titulo} titulo={c.titulo} texto={texto} />;
        })}</Grupo>
        <Grupo titulo="Stories">{d.instagram.stories.map((s) => {
          const texto = `${s.telas.map((t, i) => `Tela ${i + 1}: ${t}`).join("\n")}\n\nChamada: ${ln(s.chamada, "instagram")}`;
          return <Peca key={s.tema} titulo={s.tema} texto={texto} />;
        })}</Grupo>
        <Grupo titulo="Chamadas comerciais">{d.instagram.chamadas.map((c) => <Peca key={c} texto={ln(c, "instagram")} />)}</Grupo>
      </>
    );
  if (aba === "TikTok")
    return (
      <>
        <Grupo titulo="Roteiros de vídeo">{d.tiktok.roteiros.map((r) => {
          const texto = `Gancho: ${r.gancho}\n\n${r.cenas.map((c) => `[${c.tempo}]\nFala: ${c.fala}\nNa tela: ${c.naTela}`).join("\n\n")}\n\nCTA: ${ln(r.cta, "tiktok")}\n\nTexto da publicação: ${ln(r.textoPublicacao, "tiktok")}`;
          return <Peca key={r.titulo} titulo={r.titulo} texto={texto} />;
        })}</Grupo>
        <Grupo titulo="Ganchos de abertura">{d.tiktok.ganchos.map((g) => <Peca key={g} texto={g} />)}</Grupo>
        <Grupo titulo="Ideias de conteúdo">{d.tiktok.ideias.map((i) => <Peca key={i} texto={i} />)}</Grupo>
      </>
    );
  if (aba === "Facebook")
    return (
      <>
        <Grupo titulo="Anúncios">{d.facebook.anuncios.map((a) => <Peca key={a.titulo} titulo={a.titulo} texto={ln(a.texto, "facebook")} />)}</Grupo>
        <Grupo titulo="Textos comerciais">{d.facebook.textos.map((t) => <Peca key={t} texto={ln(t, "facebook")} />)}</Grupo>
      </>
    );
  if (aba === "WhatsApp")
    return (
      <>
        {([["Mensagens de divulgação", d.whatsapp.divulgacao], ["Mensagens de apresentação", d.whatsapp.apresentacao], ["Textos para grupos", d.whatsapp.grupos], ["Mensagens de lançamento", d.whatsapp.lancamento]] as const).map(([titulo, itens]) => (
          <Grupo key={titulo} titulo={titulo}>{itens.map((t) => <Peca key={t} texto={ln(t, "whatsapp")} />)}</Grupo>
        ))}
      </>
    );
  return (
    <Grupo titulo="Variações de anúncio">
      {d.anuncios.map((a) => {
        const texto = `Headline: ${a.headline}\n\nTexto principal: ${ln(a.textoPrincipal, "anuncios")}\n\nDescrição: ${a.descricao}\n\nCTA: ${a.cta}`;
        return <Peca key={a.headline} titulo={a.headline} texto={texto} />;
      })}
    </Grupo>
  );
}

/** Arte pronta de feed ou stories, com download e legenda. Sem arte, leva para os criativos. */
function PecaVisual({ titulo, c, url, produtoId }: { titulo: string; c: Criativo | undefined; url: string | null; produtoId: string }) {
  const [baixando, setBaixando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  if (!c?.urlFinal)
    return (
      <Cartao className="flex flex-col items-start gap-3 !p-4">
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="text-sm text-suave">Ainda não há arte pronta neste formato.</p>
        <Link href={`/criativos?produto=${produtoId}`} className={classesBotao("secundario")}><ImagePlus size={15} /> Criar arte</Link>
      </Cartao>
    );
  const urlFinal = c.urlFinal;
  const baixar = async () => {
    setBaixando(true);
    setFalhou(false);
    try {
      baixarArquivo(await lerImagemPropria(urlFinal), `${titulo.toLowerCase()}.jpg`);
    } catch {
      setFalhou(true);
    } finally {
      setBaixando(false);
    }
  };
  return (
    <Cartao className="grid content-start gap-3 !p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{titulo}</p>
        <Botao variante="fantasma" onClick={baixar} disabled={baixando}>{baixando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Baixar</Botao>
      </div>
      {falhou && <p className="text-xs text-erro" role="alert">Não foi possível baixar a imagem. Tente de novo.</p>}
      <div className={clsx("mx-auto w-full overflow-hidden rounded-lg bg-superficie-2", c.formato === "story" ? "max-w-[220px]" : "max-w-[320px]")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlFinal} alt={`${titulo}: ${c.titulo}`} className="h-auto w-full" loading="lazy" />
      </div>
      {c.comoUsar && <p className="text-xs text-suave">{comLink(c.comoUsar, url, "criativo")}</p>}
      <Peca titulo="Legenda" texto={comLink(c.legenda, url, c.formato === "story" ? "stories" : "feed")} />
    </Cartao>
  );
}

/** O essencial para começar a divulgar hoje: link, artes de feed e stories e os textos principais. */
function KitPronto({ d, url, criativos, produto, irParaGrupos }: { d: Campanha; url: string | null; criativos: Criativo[]; produto: Produto; irParaGrupos: () => void }) {
  const prontos = criativos.filter((c) => c.status === "pronto" && c.urlFinal).reverse();
  const feed = prontos.find((c) => c.formato !== "story");
  const story = prontos.find((c) => c.formato === "story");
  const ln = (t: string, canal: string) => comLink(t, url, canal);
  const post = d.instagram.posts[0];
  const seqStories = d.instagram.stories[0];
  return (
    <>
      <Grupo titulo="Link de venda">
        {url ? (
          <Cartao className="flex flex-wrap items-center justify-between gap-3 !p-4">
            <span className="flex min-w-0 items-center gap-2 text-sm"><Link2 size={15} className="shrink-0 text-primaria-clara" /><span className="truncate">{url}</span></span>
            <span className="flex shrink-0 gap-1">
              <BotaoCopiar texto={url} />
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-suave hover:bg-superficie-2 hover:text-texto"><ExternalLink size={13} /> Abrir</a>
            </span>
          </Cartao>
        ) : (
          <p className="rounded-xl border border-alerta/40 bg-alerta/10 p-3 text-sm text-alerta">A página de vendas ainda não está publicada. <Link href={`/produtos/${produto.id}/pagina`} className="font-semibold underline">Publicar a página</Link></p>
        )}
      </Grupo>
      <section className="mb-6">
        <h3 className="mb-2.5 font-mono text-[11px] tracking-[0.18em] text-apagado uppercase">Artes para postar</h3>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          <PecaVisual titulo="Feed" c={feed} url={url} produtoId={produto.id} />
          <PecaVisual titulo="Stories" c={story} url={url} produtoId={produto.id} />
        </div>
      </section>
      <Grupo titulo="Textos de divulgação">
        {post && <Peca titulo="Post no Instagram" texto={`${ln(post.legenda, "instagram")}\n\n${post.hashtags.join(" ")}`} />}
        {seqStories && <Peca titulo="Sequência de stories" texto={`${seqStories.telas.map((t, i) => `Tela ${i + 1}: ${t}`).join("\n")}\n\nChamada: ${ln(seqStories.chamada, "instagram")}`} />}
        {d.whatsapp.divulgacao[0] && <Peca titulo="WhatsApp (status ou contatos)" texto={ln(d.whatsapp.divulgacao[0], "whatsapp")} />}
        {d.facebook.textos[0] && <Peca titulo="Facebook" texto={ln(d.facebook.textos[0], "facebook")} />}
        {d.comunidades && <Peca titulo="Mensagem para grupos" texto={ln(d.comunidades.mensagemGrupo, "grupos")} />}
      </Grupo>
      <Cartao className="flex flex-wrap items-center justify-between gap-3 !p-4">
        <span className="flex items-center gap-2 text-sm"><Users size={16} className="shrink-0 text-primaria-clara" /> Onde compartilhar: grupos e comunidades do nicho</span>
        <Botao variante="secundario" onClick={irParaGrupos}>Ver grupos</Botao>
      </Cartao>
    </>
  );
}

function GruposNicho({ c, url, gerar, gerando }: { c: Comunidades | undefined; url: string | null; gerar: () => void; gerando: boolean }) {
  if (!c)
    return (
      <EstadoVazio icone={Users} titulo="Onde divulgar este e-book" texto="A IA indica os tipos de grupo e comunidade em que o seu público está, com buscas prontas em cada rede e as mensagens para postar. Usa 3 créditos.">
        <Botao onClick={gerar} disabled={gerando}>{gerando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {gerando ? "Procurando comunidades..." : "Recomendar grupos"}</Botao>
      </EstadoVazio>
    );
  const ln = (t: string) => comLink(t, url, "grupos");
  return (
    <>
      <p className="mb-5 rounded-xl border border-borda p-3 text-sm text-suave">
        Os botões abrem a busca de cada rede com os termos certos: o Criaê não indica grupos pelo nome. Entre, leia as regras e participe antes de divulgar. O WhatsApp não tem busca pública de grupos; os convites costumam aparecer dentro dessas comunidades.
      </p>
      <Grupo titulo="Onde procurar">
        {c.perfis.map((p) => (
          <Cartao key={p.tipo} className="!p-4">
            <p className="text-sm font-semibold">{p.tipo}</p>
            <p className="mt-1 text-sm text-suave">{p.porQue}</p>
            <div className="mt-3 grid gap-2">
              {p.termos.map((t) => (
                <div key={t} className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-apagado">&ldquo;{t}&rdquo;</span>
                  {p.plataformas.map((pl) => (
                    <a key={pl} href={linkBusca(pl, t)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-borda px-2 py-1 text-xs hover:border-borda-forte">
                      {pl} <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </Cartao>
        ))}
      </Grupo>
      <Grupo titulo="Hashtags do nicho">
        <Cartao className="!p-4">
          <div className="mb-2 flex justify-end"><BotaoCopiar texto={c.hashtags.map((h) => `#${limparHashtag(h)}`).join(" ")} /></div>
          <div className="flex flex-wrap gap-1.5">
            {c.hashtags.map((h) => (
              <a key={h} href={linkHashtag(h)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-superficie-2 px-2 py-1 text-xs text-suave hover:text-texto">#{limparHashtag(h)}</a>
            ))}
          </div>
        </Cartao>
      </Grupo>
      <Grupo titulo="Mensagens">
        <Peca titulo="Pedir licença ao administrador" texto={c.mensagemAdmin} />
        <Peca titulo="Post que entrega valor" texto={ln(c.postValor)} />
        <Peca titulo="Mensagem curta (grupos que aceitam divulgação)" texto={ln(c.mensagemGrupo)} />
      </Grupo>
      <Grupo titulo="Cuidados para não ser removido">
        <Cartao className="!p-4"><ul className="grid list-disc gap-1.5 pl-5 text-sm text-suave">{c.cuidados.map((x) => <li key={x}>{x}</li>)}</ul></Cartao>
      </Grupo>
    </>
  );
}

function Calendario({ c }: { c: DocCampanha }) {
  const itens = [...c.dados.calendario].sort((a, b) => a.dia - b.dia);
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-suave">
          Começar em
          <input type="date" className={clsx(estiloEntrada, "w-auto")} value={c.dataInicio} onChange={(e) => e.target.value && mudarInicio(c.produtoId, e.target.value)} />
        </label>
        <Botao variante="fantasma" onClick={() => baixarArquivo(new Blob([calendarioCsv(c)], { type: "text/csv;charset=utf-8" }), "calendario.csv")}>
          <Download size={15} /> Baixar planilha
        </Botao>
      </div>
      <ul className="grid gap-2.5">
        {itens.map((i, n) => {
          const chave = `${i.dia}-${n}`;
          const feito = c.feitos.includes(chave);
          return (
            <li key={chave}>
              <Cartao className={clsx("!p-4", feito && "opacity-60")}>
                <label className="flex cursor-pointer gap-3">
                  <input type="checkbox" className="mt-1 size-4 shrink-0 accent-primaria" checked={feito} onChange={(e) => marcarFeito(c.produtoId, chave, e.target.checked)} aria-label={`Marcar como publicado: ${i.tema}`} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold capitalize">{dataDoDia(c.dataInicio, i.dia).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
                      <Selo tom="azul">{i.canal}</Selo>
                      <span className="text-xs text-apagado">{i.formato}</span>
                    </span>
                    <span className="mt-1.5 block text-sm font-medium">{i.tema}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-suave">{i.orientacao}</span>
                  </span>
                </label>
              </Cartao>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function CentralDivulgacao({ produtoId }: { produtoId?: string }) {
  const { usuario, carregando, elegiveis, produto, urlPagina, erro: erroDados } = useDivulgacao(produtoId);
  const [campanha, setCampanha] = useState<DocCampanha | null | undefined>(undefined);
  const [criativos, setCriativos] = useState<Criativo[]>([]);
  const [aba, setAba] = useState<Aba>("Kit pronto");
  const [gerando, setGerando] = useState(false);
  const [gerandoGrupos, setGerandoGrupos] = useState(false);
  const [erro, setErro] = useState("");
  const id = produto?.id;

  useEffect(() => {
    if (!id || !usuario) return;
    setCampanha(undefined);
    const a = ouvirCampanha(id, setCampanha, (e) => setErro(mensagemErro(e)));
    const b = ouvirCriativos(usuario.uid, id, setCriativos, () => setCriativos([]));
    return () => { a(); b(); };
  }, [id, usuario]);

  if (erroDados) return <p className="text-sm text-erro" role="alert">{erroDados}</p>;
  if (carregando) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (!produto)
    return (
      <EstadoVazio icone={Megaphone} titulo="Nenhum produto pronto para divulgar" texto="Os materiais são escritos a partir do planejamento do produto.">
        <Link href="/criar" className={classesBotao()}>Criar um produto</Link>
      </EstadoVazio>
    );

  const gerar = async () => {
    if (campanha && !window.confirm("Gerar de novo substitui os materiais atuais e o calendário. Continuar?")) return;
    setErro("");
    setGerando(true);
    try {
      const dados = await chamarIA<Campanha>("campanha", {
        configuracao: produto.configuracao,
        planejamento: produto.planejamento,
        oferta: { precoCentavos: produto.oferta!.precoCentavos, garantiaDias: produto.oferta!.garantiaDias },
      });
      await salvarCampanha(usuario!.uid, produto.id, dados, campanha?.dataInicio ?? amanha());
      setAba("Kit pronto");
    } catch (e) {
      setErro(mensagemFluxo(e));
    } finally {
      setGerando(false);
    }
  };

  const gerarGrupos = async () => {
    setErro("");
    setGerandoGrupos(true);
    try {
      const dados = await chamarIA<Comunidades>("comunidades", {
        configuracao: produto.configuracao,
        planejamento: produto.planejamento,
        oferta: { precoCentavos: produto.oferta!.precoCentavos, garantiaDias: produto.oferta!.garantiaDias },
      });
      await salvarComunidades(produto.id, dados);
    } catch (e) {
      setErro(mensagemFluxo(e));
    } finally {
      setGerandoGrupos(false);
    }
  };

  const textoAba = campanha && aba !== "Calendário" ? (textosPorCanal(campanha.dados, urlPagina)[ARQUIVO[aba]] ?? "") : "";

  return (
    <>
      <BarraDivulgacao tela="divulgacao" produto={produto} elegiveis={elegiveis} />
      {erro && <p className="mb-4 rounded-xl border border-erro/40 bg-erro/10 p-3 text-sm text-erro" role="alert">{erro}</p>}

      {!produto.oferta ? (
        <EstadoVazio icone={Megaphone} titulo="Defina o preço primeiro" texto="Os textos citam o preço e a garantia reais do produto, nunca valores inventados.">
          <Link href={`/produtos/${produto.id}/preco`} className={classesBotao()}>Definir preço</Link>
        </EstadoVazio>
      ) : campanha === undefined ? (
        <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>
      ) : !campanha ? (
        <EstadoVazio icone={Megaphone} titulo="Nenhuma campanha para este produto" texto="A IA analisa o produto e cria a estratégia, os textos de cada canal e 14 dias de publicações. Leva de 1 a 3 minutos.">
          <Botao onClick={gerar} disabled={gerando}>
            {gerando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {gerando ? "Escrevendo os materiais..." : "Gerar campanha"}
          </Botao>
        </EstadoVazio>
      ) : (
        <>
          {!urlPagina && (
            <p className="mb-4 rounded-xl border border-alerta/40 bg-alerta/10 p-3 text-sm text-alerta">
              A página de vendas ainda não está publicada, por isso os textos mostram [LINK]. <Link href={`/produtos/${produto.id}/pagina`} className="font-semibold underline">Publicar a página</Link> troca o marcador pelo endereço real.
            </p>
          )}
          <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
            <Botao variante="fantasma" onClick={gerar} disabled={gerando}>
              {gerando ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {gerando ? "Escrevendo os materiais..." : "Gerar de novo"}
            </Botao>
            {textoAba && (
              <Botao variante="fantasma" onClick={() => baixarArquivo(new Blob([textoAba], { type: "text/plain;charset=utf-8" }), ARQUIVO[aba as Exclude<Aba, "Calendário">])}>
                <Download size={15} /> Baixar esta aba
              </Botao>
            )}
            <BotaoZip produto={produto} campanha={campanha} criativos={criativos} urlPagina={urlPagina} />
          </div>
          <div role="tablist" aria-label="Materiais por canal" className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
            {ABAS.map((a) => (
              <button key={a} type="button" role="tab" aria-selected={aba === a} onClick={() => setAba(a)}
                className={clsx("shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition", aba === a ? "bg-primaria text-white" : "text-suave hover:bg-superficie-2 hover:text-texto")}>
                {a}
              </button>
            ))}
          </div>
          {aba === "Calendário" ? <Calendario c={campanha} />
            : aba === "Kit pronto" ? <KitPronto d={campanha.dados} url={urlPagina} criativos={criativos} produto={produto} irParaGrupos={() => setAba("Grupos")} />
            : aba === "Grupos" ? <GruposNicho c={campanha.dados.comunidades} url={urlPagina} gerar={gerarGrupos} gerando={gerandoGrupos} />
            : <ConteudoAba aba={aba} d={campanha.dados} url={urlPagina} />}
        </>
      )}
    </>
  );
}
