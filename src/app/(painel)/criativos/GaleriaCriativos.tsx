"use client";

import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/700.css";
import "@fontsource/merriweather/400.css";
import "@fontsource/merriweather/700.css";
import "@fontsource/playfair-display/700.css";
import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Download, ImageIcon, Loader2, Pencil, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { BarraDivulgacao, BotaoZip, baixarArquivo } from "@/components/BarraDivulgacao";
import { Botao, Campo, Cartao, EstadoVazio, Selo, classesBotao, estiloEntrada } from "@/components/ui";
import { useDivulgacao } from "@/components/useDivulgacao";
import { comLink, ouvirCampanha, type DocCampanha } from "@/lib/campanhas";
import { carregarFontes, comporCapa, comporCriativo } from "@/lib/criativos/compor";
import { MEDIDAS, atualizarCriativo, criarPendente, excluirCriativo, guardarFinal, guardarFundo, lerImagemPropria, ouvirCriativos, type Criativo, type FormatoCriativo } from "@/lib/criativos/dados";
import { nomeArquivo } from "@/lib/criativos/materiais";
import { EMOCOES, MIDIAS, type Emocao, type Midia } from "@/lib/criativos/opcoes";
import { mensagemErro, mensagemFluxo } from "@/lib/firebase/erros";
import { chamarIA } from "@/lib/ia/cliente";
import type { ConceitoCriativo } from "@/lib/ia/esquemas";
import { imagemAtual, ouvirImagens, type Imagem } from "@/lib/imagens";

const base64ParaBlob = (b64: string) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/jpeg" });
};

type Textos = Pick<Criativo, "titulo" | "apoio" | "cta" | "textoPrincipal" | "legenda" | "usarMockup">;

export function GaleriaCriativos({ produtoId }: { produtoId?: string }) {
  const { usuario, carregando, elegiveis, produto, urlPagina, erro: erroDados } = useDivulgacao(produtoId);
  const [criativos, setCriativos] = useState<Criativo[] | null>(null);
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [campanha, setCampanha] = useState<DocCampanha | null>(null);
  const [filtro, setFiltro] = useState<FormatoCriativo | "todos">("todos");
  const [progresso, setProgresso] = useState("");
  const [ocupados, setOcupados] = useState<Record<string, string>>({});
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [midias, setMidias] = useState<Midia[]>(["Feed", "Stories", "Anúncio no feed"]);
  const [emocoes, setEmocoes] = useState<Emocao[]>([]);
  const id = produto?.id;

  useEffect(() => {
    if (!id || !usuario) return;
    setCriativos(null);
    const a = ouvirCriativos(usuario.uid, id, setCriativos, (e) => setErro(mensagemErro(e)));
    const b = ouvirImagens(usuario.uid, id, setImagens, () => setImagens([]));
    const c = ouvirCampanha(id, setCampanha, () => setCampanha(null));
    return () => { a(); b(); c(); };
  }, [id, usuario]);

  // A capa é a mesma em todas as peças do pacote: monta uma vez só.
  const capaCache = useRef<{ chave: string; canvas: HTMLCanvasElement } | null>(null);
  const urlCapa = imagemAtual(imagens, "capa")?.url;

  const capa = useCallback(async () => {
    const identidade = produto!.identidade!;
    const titulo = produto!.planejamento!.tituloComercial;
    const subtitulo = produto!.planejamento!.subtitulo;
    const chave = JSON.stringify([urlCapa, identidade, titulo, subtitulo]);
    if (capaCache.current?.chave === chave) return capaCache.current.canvas;
    const arte = urlCapa ? await createImageBitmap(await lerImagemPropria(urlCapa)) : null;
    const canvas = comporCapa(identidade, titulo, subtitulo, arte);
    capaCache.current = { chave, canvas };
    return canvas;
  }, [produto, urlCapa]);

  /** Faz a peça: com arte nova (usa a IA de imagens) ou só remontando os textos sobre a arte salva (sem custo). */
  const montar = useCallback(async (c: Criativo, novaArte: boolean) => {
    const identidade = produto!.identidade!;
    await carregarFontes(identidade);
    let blobFundo: Blob;
    if (novaArte || !c.urlFundo) {
      const { base64 } = await chamarIA<{ base64: string }>("arte-criativo", { prompt: c.promptArte, formato: c.formato });
      blobFundo = base64ParaBlob(base64);
    } else {
      blobFundo = await lerImagemPropria(c.urlFundo);
    }
    const fundo = await createImageBitmap(blobFundo);
    const final = await comporCriativo({
      formato: c.formato, titulo: c.titulo, apoio: c.apoio, cta: c.cta, identidade, fundo,
      capa: c.usarMockup ? await capa() : null,
    });
    const camposFundo = novaArte || !c.urlFundo ? await guardarFundo(c, blobFundo) : {};
    const camposFinal = await guardarFinal(c, final);
    await atualizarCriativo(c.id, { ...camposFundo, ...camposFinal, status: "pronto" });
  }, [produto, capa]);

  const marcar = (cid: string, texto: string) => setOcupados((o) => {
    const novo = { ...o };
    if (texto) novo[cid] = texto;
    else delete novo[cid];
    return novo;
  });

  /** Duas artes por vez: o usuário não espera uma fila longa e a IA de imagens não recusa por excesso. */
  const processar = useCallback(async (fila: Criativo[]) => {
    let feitas = 0;
    let falhas = 0;
    let ultimoErro = "";
    const restantes = [...fila];
    setProgresso(`Criando as artes: 0 de ${fila.length}...`);
    const trabalhador = async () => {
      for (let c = restantes.shift(); c; c = restantes.shift()) {
        marcar(c.id, "Criando a arte...");
        try {
          await montar(c, !c.urlFundo);
        } catch (e) {
          falhas++;
          ultimoErro = mensagemFluxo(e);
          await atualizarCriativo(c.id, { status: "erro" }).catch(() => {});
        }
        marcar(c.id, "");
        feitas++;
        setProgresso(`Criando as artes: ${feitas} de ${fila.length}...`);
      }
    };
    await Promise.all([trabalhador(), trabalhador()]);
    setProgresso("");
    if (falhas) setErro(`${falhas} ${falhas === 1 ? "arte não foi criada" : "artes não foram criadas"}: ${ultimoErro} Você pode tentar de novo em cada peça.`);
  }, [montar]);

  if (erroDados) return <p className="text-sm text-erro" role="alert">{erroDados}</p>;
  if (carregando) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (!produto)
    return (
      <EstadoVazio icone={ImageIcon} titulo="Nenhum produto pronto" texto="Os criativos são feitos a partir do planejamento e da identidade visual do produto.">
        <Link href="/criar" className={classesBotao()}>Criar um produto</Link>
      </EstadoVazio>
    );

  const gerarPacote = async () => {
    setErro("");
    setProgresso("Escrevendo os conceitos das peças...");
    try {
      const identidade = produto.identidade!;
      const { criativos: conceitos } = await chamarIA<{ criativos: ConceitoCriativo[] }>("criativos", {
        configuracao: produto.configuracao,
        planejamento: produto.planejamento,
        oferta: { precoCentavos: produto.oferta!.precoCentavos, garantiaDias: produto.oferta!.garantiaDias },
        visual: { estilo: identidade.estiloImagens.slice(0, 300), cores: [identidade.cores.primaria, identidade.cores.secundaria, identidade.cores.destaque] },
        midias,
        emocoes,
      });
      const novos: Criativo[] = [];
      for (const c of conceitos) novos.push(await criarPendente(usuario!.uid, produto.id, c));
      await processar(novos);
    } catch (e) {
      setErro(mensagemFluxo(e));
      setProgresso("");
    }
  };

  const faltando = (criativos ?? []).filter((c) => !c.urlFinal && !ocupados[c.id]);
  const visiveis = (criativos ?? []).filter((c) => filtro === "todos" || c.formato === filtro);
  const ocupado = !!progresso;
  const bloqueio = !produto.oferta
    ? { titulo: "Defina o preço primeiro", texto: "As peças citam a oferta real do produto.", href: `/produtos/${produto.id}/preco`, botao: "Definir preço" }
    : !produto.identidade
      ? { titulo: "Escolha a identidade visual", texto: "As peças usam as cores e as fontes do produto.", href: `/produtos/${produto.id}/identidade`, botao: "Definir identidade" }
      : null;

  return (
    <>
      <BarraDivulgacao tela="criativos" produto={produto} elegiveis={elegiveis} />
      {erro && <p className="mb-4 rounded-xl border border-erro/40 bg-erro/10 p-3 text-sm text-erro" role="alert">{erro}</p>}

      {bloqueio ? (
        <EstadoVazio icone={ImageIcon} titulo={bloqueio.titulo} texto={bloqueio.texto}>
          <Link href={bloqueio.href} className={classesBotao()}>{bloqueio.botao}</Link>
        </EstadoVazio>
      ) : criativos === null ? (
        <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por formato">
              {(["todos", "quadrado", "retrato", "story"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f}
                  className={clsx("rounded-lg px-3 py-1.5 text-sm font-medium transition", filtro === f ? "bg-primaria text-white" : "text-suave hover:bg-superficie-2 hover:text-texto")}>
                  {f === "todos" ? "Todos" : MEDIDAS[f].rotulo}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!!faltando.length && !ocupado && (
                <Botao variante="secundario" onClick={() => processar(faltando)}><RefreshCw size={15} /> Criar {faltando.length} {faltando.length === 1 ? "arte pendente" : "artes pendentes"}</Botao>
              )}
              <BotaoZip produto={produto} campanha={campanha} criativos={criativos} urlPagina={urlPagina} />
              <Botao onClick={gerarPacote} disabled={ocupado || !midias.length}>
                {ocupado ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {progresso || "Gerar 6 criativos"}
              </Botao>
            </div>
          </div>
          <Cartao className="mb-5 grid gap-4 md:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Onde vai publicar</legend>
              <div className="flex flex-wrap gap-1.5">
                {MIDIAS.map((m) => <Opcao key={m} rotulo={m} ativa={midias.includes(m)} aoClicar={() => setMidias(alternar(midias, m))} />)}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">O que despertar na pessoa</legend>
              <div className="flex flex-wrap gap-1.5">
                {EMOCOES.map((e) => <Opcao key={e} rotulo={e} ativa={emocoes.includes(e)} aoClicar={() => setEmocoes(alternar(emocoes, e))} />)}
              </div>
              <p className="mt-2 text-xs text-apagado">{emocoes.length ? "A IA usa só as emoções marcadas." : "Sem marcar nenhuma, a IA escolhe e varia entre as peças."}</p>
            </fieldset>
          </Cartao>
          {ocupado && <p className="mb-4 text-sm text-suave">Mantenha esta aba aberta. Cada arte leva cerca de 40 segundos.</p>}

          {!criativos.length ? (
            <EstadoVazio icone={ImageIcon} titulo="Nenhum criativo ainda" texto="A IA cria 6 peças, 2 em cada formato, com arte, textos, legenda, CTA e plataforma recomendada." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visiveis.map((c) => {
                const indice = criativos.indexOf(c);
                const estado = ocupados[c.id];
                return (
                  <li key={c.id}>
                    <Cartao className="flex h-full flex-col !p-3">
                      <div className="overflow-hidden rounded-lg bg-fundo" style={{ aspectRatio: `${MEDIDAS[c.formato].largura} / ${MEDIDAS[c.formato].altura}`, maxHeight: 460, marginInline: "auto", width: c.formato === "story" ? 259 : "100%" }}>
                        {estado ? (
                          <p className="flex h-full items-center justify-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> {estado}</p>
                        ) : c.urlFinal ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.urlFinal} alt={`Criativo: ${c.titulo}`} className="h-full w-full object-contain" loading="lazy" />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
                            <p className="text-sm text-suave">{c.status === "erro" ? "A arte falhou." : "A arte ainda não foi criada."}</p>
                            <Botao variante="secundario" disabled={ocupado} onClick={async () => {
                              setErro("");
                              marcar(c.id, "Criando a arte...");
                              try { await montar(c, true); } catch (e) { setErro(mensagemFluxo(e)); await atualizarCriativo(c.id, { status: "erro" }).catch(() => {}); }
                              marcar(c.id, "");
                            }}>Tentar de novo</Botao>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Selo tom="azul">{c.midia ?? c.plataforma}</Selo>
                        {c.emocao && <Selo tom="amarelo">{c.emocao}</Selo>}
                        <span className="text-xs text-apagado">{MEDIDAS[c.formato].rotulo}{c.midia ? ` · ${c.plataforma}` : ""}</span>
                      </div>
                      {c.tipoGancho && <p className="mt-2 text-xs text-suave">Gancho: {c.tipoGancho}</p>}
                      <p className="mt-2 text-sm font-semibold">{c.titulo}</p>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-suave">{comLink(c.legenda, urlPagina, "criativo")}</p>
                      {c.comoUsar && <p className="mt-2 rounded-lg bg-superficie-2/60 p-2 text-xs leading-relaxed text-suave"><span className="font-semibold text-texto">Como usar:</span> {comLink(c.comoUsar, urlPagina, "criativo")}</p>}
                      <div className="mt-auto flex flex-wrap gap-1 pt-3">
                        <Acao icone={Download} rotulo="Baixar" desativado={!c.urlFinal || !!estado} aoClicar={async () => {
                          try { baixarArquivo(await lerImagemPropria(c.urlFinal!), nomeArquivo(c, indice)); } catch (e) { setErro(mensagemFluxo(e)); }
                        }} />
                        <Acao icone={Copy} rotulo="Copiar legenda" aoClicar={() => navigator.clipboard.writeText(comLink(c.legenda, urlPagina, "criativo")).catch(() => setErro("O navegador não permitiu copiar."))} />
                        <Acao icone={Pencil} rotulo="Editar" desativado={!!estado} aoClicar={() => setEditando(editando === c.id ? null : c.id)} />
                        <Acao icone={RefreshCw} rotulo="Nova arte" desativado={!!estado || ocupado} aoClicar={async () => {
                          setErro("");
                          marcar(c.id, "Criando outra arte...");
                          try { await montar(c, true); } catch (e) { setErro(mensagemFluxo(e)); }
                          marcar(c.id, "");
                        }} />
                        <Acao icone={Trash2} rotulo="Excluir" desativado={!!estado} aoClicar={async () => {
                          if (!window.confirm("Excluir este criativo?")) return;
                          await excluirCriativo(c).catch((e) => setErro(mensagemFluxo(e)));
                        }} />
                      </div>
                      {editando === c.id && (
                        <EditorTextos c={c} aoSalvar={async (t) => {
                          setErro("");
                          setEditando(null);
                          marcar(c.id, "Atualizando a peça...");
                          try {
                            await atualizarCriativo(c.id, t);
                            if (c.urlFundo) await montar({ ...c, ...t }, false);
                          } catch (e) { setErro(mensagemFluxo(e)); }
                          marcar(c.id, "");
                        }} />
                      )}
                    </Cartao>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}

const alternar = <T,>(lista: T[], item: T) => (lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item]);

function Opcao({ rotulo, ativa, aoClicar }: { rotulo: string; ativa: boolean; aoClicar: () => void }) {
  return (
    <button type="button" onClick={aoClicar} aria-pressed={ativa} className={clsx("rounded-full border px-3 py-1.5 text-xs font-medium transition", ativa ? "border-primaria-clara bg-primaria/15 text-texto" : "border-borda text-suave hover:border-borda-forte")}>
      {rotulo}
    </button>
  );
}

function Acao({ icone: Icone, rotulo, aoClicar, desativado }: { icone: typeof Copy; rotulo: string; aoClicar: () => void; desativado?: boolean }) {
  return (
    <button type="button" onClick={aoClicar} disabled={desativado} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-suave transition hover:bg-superficie-2 hover:text-texto disabled:cursor-not-allowed disabled:opacity-40">
      <Icone size={13} /> {rotulo}
    </button>
  );
}

function EditorTextos({ c, aoSalvar }: { c: Criativo; aoSalvar: (t: Textos) => void }) {
  const [t, setT] = useState<Textos>({ titulo: c.titulo, apoio: c.apoio, cta: c.cta, textoPrincipal: c.textoPrincipal, legenda: c.legenda, usarMockup: c.usarMockup });
  return (
    <form className="mt-3 grid gap-3 border-t border-borda pt-3" onSubmit={(e) => { e.preventDefault(); aoSalvar(t); }}>
      <Campo rotulo="Título na arte"><input className={estiloEntrada} required maxLength={100} value={t.titulo} onChange={(e) => setT({ ...t, titulo: e.target.value })} /></Campo>
      <Campo rotulo="Apoio na arte"><input className={estiloEntrada} maxLength={160} value={t.apoio} onChange={(e) => setT({ ...t, apoio: e.target.value })} /></Campo>
      <Campo rotulo="Botão (CTA)"><input className={estiloEntrada} required maxLength={40} value={t.cta} onChange={(e) => setT({ ...t, cta: e.target.value })} /></Campo>
      <Campo rotulo="Texto principal"><textarea className={estiloEntrada} rows={4} maxLength={3000} value={t.textoPrincipal} onChange={(e) => setT({ ...t, textoPrincipal: e.target.value })} /></Campo>
      <Campo rotulo="Legenda"><textarea className={estiloEntrada} rows={4} maxLength={3000} value={t.legenda} onChange={(e) => setT({ ...t, legenda: e.target.value })} /></Campo>
      <label className="flex items-center gap-2 text-sm text-suave">
        <input type="checkbox" className="size-4 accent-primaria" checked={t.usarMockup} onChange={(e) => setT({ ...t, usarMockup: e.target.checked })} /> Mostrar o e-book na arte
      </label>
      <Botao type="submit" variante="secundario">Salvar e atualizar a peça</Botao>
    </form>
  );
}
