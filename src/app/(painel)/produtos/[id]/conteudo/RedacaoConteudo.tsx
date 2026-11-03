"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle, CheckCircle2, Circle, ClipboardCheck, Loader2, Lock, Pause, PenLine, Play, RefreshCw, Save, X,
} from "lucide-react";
import { EtapasProduto } from "@/components/EtapasProduto";
import { Markdown } from "@/components/Markdown";
import { useProduto } from "@/components/useProduto";
import { Botao, Cartao, EstadoVazio, Selo, classesBotao, estiloEntrada } from "@/components/ui";
import { chamarIA } from "@/lib/ia/cliente";
import { atualizarCapitulo, marcarEtapa, ouvirCapitulos, type Capitulo, type ProblemaRevisao } from "@/lib/produtos";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";
import { mensagemErro } from "@/lib/firebase/erros";

type RespostaCapitulo = { conteudo: string; resumo: string; problemas: ProblemaRevisao[]; revisaoAplicada: boolean };

const ROTULO_PROBLEMA: Record<string, string> = {
  contradicao: "Contradição", gramatica: "Gramática", inconsistencia: "Inconsistência", repeticao: "Repetição",
  incompleto: "Trecho incompleto", continuidade: "Continuidade", afirmacao_sem_base: "Afirmação sem base",
};

export function RedacaoConteudo({ produtoId }: { produtoId: string }) {
  const { produto, erro: erroProduto, usuario } = useProduto(produtoId);
  const [capitulos, setCapitulos] = useState<Capitulo[] | null>(null);
  const [rodando, setRodando] = useState(false);
  const [atualId, setAtualId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const parar = useRef(false);

  useEffect(() => {
    if (!usuario) return;
    return ouvirCapitulos(usuario.uid, produtoId, setCapitulos, (e) => setErro(mensagemErro(e)));
  }, [usuario, produtoId]);

  // Avisa antes de fechar a aba no meio da geração.
  useEffect(() => {
    if (!rodando) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [rodando]);

  const total = capitulos?.length ?? 0;
  const prontos = capitulos?.filter((c) => c.status === "concluido").length ?? 0;
  const tudoPronto = total > 0 && prontos === total;

  // Material completo → libera a próxima etapa.
  useEffect(() => {
    if (tudoPronto && produto && produto.etapa < 3) marcarEtapa(produtoId, 3).catch(() => {});
  }, [tudoPronto, produto, produtoId]);

  if (produto === undefined || capitulos === null)
    return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (produto === null) return <EstadoVazio icone={Lock} titulo="Produto não encontrado" texto={erroProduto || "Ele pode ter sido excluído ou não pertence a esta conta."} />;

  const config = configuracaoProdutoSchema.safeParse(produto.configuracao);
  if (!produto.planejamentoAprovado || !produto.planejamento || !config.success)
    return (
      <>
        <EtapasProduto produtoId={produtoId} atual={2} concluidas={produto.etapa} />
        <EstadoVazio icone={Lock} titulo="Aprove o planejamento primeiro" texto="A redação segue o sumário e os objetivos que você aprovar.">
          <Link href={`/produtos/${produtoId}/planejamento`} className={classesBotao()}>Ir para o planejamento</Link>
        </EstadoVazio>
      </>
    );

  const plano = produto.planejamento;

  const escreverUm = async (cap: Capitulo, lista: Capitulo[]) => {
    setAtualId(cap.id);
    setSelecionado(cap.id);
    await atualizarCapitulo(cap.id, { status: "gerando", erro: "" });
    try {
      const resumosAnteriores = lista.filter((c) => c.ordem < cap.ordem).map((c) => c.resumo ?? "");
      const r = await chamarIA<RespostaCapitulo>("capitulo", { configuracao: config.data, planejamento: plano, indice: cap.ordem, resumosAnteriores });
      await atualizarCapitulo(cap.id, {
        status: "concluido", conteudo: r.conteudo, resumo: r.resumo, problemas: r.problemas,
        revisaoAplicada: r.revisaoAplicada, editadoManualmente: false, erro: "",
      });
      return { ...cap, status: "concluido" as const, resumo: r.resumo };
    } catch (e) {
      await atualizarCapitulo(cap.id, { status: "erro", erro: (e as Error).message.slice(0, 300) }).catch(() => {});
      throw e;
    }
  };

  /** Escreve em ordem tudo o que não está concluído. Cada capítulo é salvo ao terminar, então dá para parar e retomar. */
  const escreverPendentes = async () => {
    setErro("");
    parar.current = false;
    setRodando(true);
    let lista = [...capitulos];
    try {
      for (const cap of lista) {
        if (cap.status === "concluido") continue;
        if (parar.current) break;
        const feito = await escreverUm(cap, lista);
        lista = lista.map((c) => (c.id === feito.id ? feito : c));
      }
    } catch (e) {
      setErro(`${(e as Error).message} A geração parou; o que já estava pronto foi salvo.`);
    } finally {
      setRodando(false);
      setAtualId(null);
    }
  };

  const reescrever = async (cap: Capitulo) => {
    if (cap.editadoManualmente && !confirm("Este capítulo tem edições suas. Reescrever com a IA substitui o texto. Continuar?")) return;
    setErro("");
    setRodando(true);
    try { await escreverUm(cap, capitulos); }
    catch (e) { setErro((e as Error).message); }
    finally { setRodando(false); setAtualId(null); }
  };

  // "gerando" sem estar rodando aqui = geração interrompida (aba fechada): conta como pendente.
  const statusVisivel = (c: Capitulo) => (c.status === "gerando" && c.id !== atualId ? "pendente" : c.status);
  const aberto = capitulos.find((c) => c.id === selecionado) ?? capitulos.find((c) => c.status === "concluido") ?? capitulos[0];

  return (
    <>
      <EtapasProduto produtoId={produtoId} atual={2} concluidas={produto.etapa} />

      <Cartao className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">{plano.tituloComercial}</p>
            <p className="text-sm text-suave">{plano.subtitulo}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rodando ? (
              <Botao variante="secundario" onClick={() => (parar.current = true)} title="Termina o capítulo atual e para">
                <Pause size={16} /> Pausar depois deste
              </Botao>
            ) : !tudoPronto ? (
              <Botao onClick={escreverPendentes}>
                <Play size={16} /> {prontos === 0 ? "Escrever o material" : "Continuar de onde parou"}
              </Botao>
            ) : (
              <Selo tom="verde"><CheckCircle2 size={12} /> Material completo</Selo>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-superficie-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={prontos}>
            <div className="h-full rounded-full bg-primaria transition-all" style={{ width: `${total ? (prontos / total) * 100 : 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-suave">
            {prontos} de {total} capítulos prontos
            {rodando && " · escrevendo e revisando (cerca de 2 a 4 min por capítulo). Mantenha esta aba aberta."}
          </p>
        </div>
        {erro && <p className="mt-3 flex gap-2 text-sm text-erro" role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}</p>}
      </Cartao>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <nav aria-label="Capítulos">
          <ol className="space-y-1.5">
            {capitulos.map((c) => {
              const s = statusVisivel(c);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelecionado(c.id)}
                    className={clsx(
                      "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                      aberto?.id === c.id ? "border-primaria/45 bg-primaria/10" : "border-borda hover:border-borda-forte",
                    )}
                  >
                    <IconeStatus status={s} />
                    <span className="min-w-0">
                      <span className="block font-medium">{c.ordem + 1}. {c.titulo}</span>
                      <span className="text-xs text-apagado">
                        {{ pendente: "Aguardando", gerando: "Escrevendo e revisando...", concluido: c.editadoManualmente ? "Concluído · editado por você" : "Concluído", erro: "Erro: tente de novo" }[s]}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {aberto && <VisorCapitulo key={aberto.id} cap={aberto} ocupado={rodando} aoReescrever={() => reescrever(aberto)} />}
      </div>

      {tudoPronto && (
        <Cartao className="mt-6 border-sucesso/30!">
          <p className="font-semibold">Texto completo e revisado</p>
          <p className="mt-1 text-sm text-suave">Agora escolha a identidade visual, gere a capa e as imagens e diagrame o PDF. Você pode voltar aqui e editar qualquer capítulo quando quiser.</p>
          <Link href={`/produtos/${produtoId}/identidade`} className={`${classesBotao()} mt-4`}>Ir para a identidade visual</Link>
        </Cartao>
      )}
    </>
  );
}

function IconeStatus({ status }: { status: Capitulo["status"] }) {
  if (status === "concluido") return <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-sucesso" />;
  if (status === "gerando") return <Loader2 size={17} className="mt-0.5 shrink-0 animate-spin text-primaria-clara" />;
  if (status === "erro") return <AlertCircle size={17} className="mt-0.5 shrink-0 text-erro" />;
  return <Circle size={17} className="mt-0.5 shrink-0 text-apagado" />;
}

function VisorCapitulo({ cap, ocupado, aoReescrever }: { cap: Capitulo; ocupado: boolean; aoReescrever: () => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(cap.conteudo ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const salvar = async () => {
    setSalvando(true);
    setErro("");
    try {
      await atualizarCapitulo(cap.id, { conteudo: texto, editadoManualmente: true });
      setEditando(false);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  if (cap.status !== "concluido" || !cap.conteudo)
    return (
      <Cartao className="flex min-h-60 flex-col items-center justify-center text-center">
        <IconeStatus status={cap.status} />
        <p className="mt-3 font-semibold">{cap.titulo}</p>
        <p className="mt-1 max-w-sm text-sm text-suave">
          {cap.status === "erro" ? cap.erro || "Não foi possível escrever este capítulo." : cap.status === "gerando" ? "A IA está escrevendo e revisando este capítulo." : "Este capítulo ainda não foi escrito."}
        </p>
        {cap.status === "erro" && (
          <Botao className="mt-4" onClick={aoReescrever} disabled={ocupado}><RefreshCw size={16} /> Tentar novamente</Botao>
        )}
      </Cartao>
    );

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        {editando ? (
          <>
            <Botao variante="fantasma" onClick={() => { setEditando(false); setTexto(cap.conteudo ?? ""); }}><X size={16} /> Cancelar</Botao>
            <Botao onClick={salvar} disabled={salvando}>{salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar edição</Botao>
          </>
        ) : (
          <>
            <Botao variante="secundario" onClick={() => setEditando(true)} disabled={ocupado}><PenLine size={16} /> Editar texto</Botao>
            <Botao variante="secundario" onClick={aoReescrever} disabled={ocupado}><RefreshCw size={16} /> Reescrever com IA</Botao>
          </>
        )}
      </div>
      {erro && <p className="text-sm text-erro">{erro}</p>}

      <Cartao className="p-6 sm:p-8">
        {editando ? (
          <textarea aria-label="Texto do capítulo em Markdown" className={`${estiloEntrada} min-h-[60vh] font-mono text-[13px] leading-relaxed`} value={texto} onChange={(e) => setTexto(e.target.value)} />
        ) : (
          <Markdown texto={cap.conteudo} />
        )}
      </Cartao>

      <Cartao>
        <p className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck size={16} className="text-primaria-clara" /> Revisão automática</p>
        {cap.problemas?.length ? (
          <>
            <p className="mt-1 text-xs text-apagado">
              {cap.revisaoAplicada ? "Problemas encontrados e já corrigidos no texto acima:" : "Problemas encontrados (a correção automática não foi aplicada; revise à mão):"}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {cap.problemas.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <Selo>{ROTULO_PROBLEMA[p.tipo] ?? p.tipo}</Selo>
                  <span className="text-suave">{p.descricao}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-sm text-suave">Nenhum problema encontrado pelo revisor.</p>
        )}
      </Cartao>
    </div>
  );
}
