"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Check, Loader2, Lock, Plus, RefreshCw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { EtapasProduto } from "@/components/EtapasProduto";
import { useProduto } from "@/components/useProduto";
import { Botao, Campo, Cartao, EstadoVazio, classesBotao, estiloEntrada } from "@/components/ui";
import { chamarIA } from "@/lib/ia/cliente";
import type { CapituloPlano, Planejamento } from "@/lib/ia/esquemas";
import { prepararCapitulos, salvarPlanejamento } from "@/lib/produtos";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";
import { mensagemErro } from "@/lib/firebase/erros";
import { Sparkle } from "./Sparkle";

const linhas = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);
const CAPITULO_VAZIO: CapituloPlano = { titulo: "Novo capítulo", objetivo: "", topicos: [], exemplos: [], exercicio: "" };

export function EditorPlanejamento({ produtoId }: { produtoId: string }) {
  const router = useRouter();
  const { produto, erro: erroProduto, usuario } = useProduto(produtoId);
  const [plano, setPlano] = useState<Planejamento | null>(null);
  const [gerando, setGerando] = useState(false);
  const [aprovando, setAprovando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);
  const editado = useRef(false);
  const carregado = useRef(false);

  // Carrega o planejamento do banco uma vez (depois a edição local manda).
  useEffect(() => {
    if (produto && !carregado.current) {
      carregado.current = true;
      setPlano(produto.planejamento ?? null);
    }
  }, [produto]);

  const aprovado = !!produto?.planejamentoAprovado;

  // Salvamento automático enquanto não aprovado.
  useEffect(() => {
    if (!plano || !editado.current || aprovado) return;
    const t = setTimeout(() => {
      salvarPlanejamento(produtoId, plano, false)
        .then(() => setSalvoEm(new Date()))
        .catch((e) => setErro(mensagemErro(e)));
    }, 900);
    return () => clearTimeout(t);
  }, [plano, produtoId, aprovado]);

  if (produto === undefined) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (produto === null) return <EstadoVazio icone={Lock} titulo="Produto não encontrado" texto={erroProduto || "Ele pode ter sido excluído ou não pertence a esta conta."} />;

  const config = configuracaoProdutoSchema.safeParse(produto.configuracao);
  if (!config.success || produto.etapa < 1)
    return (
      <>
        <EtapasProduto produtoId={produtoId} atual={1} concluidas={produto.etapa} />
        <EstadoVazio icone={Lock} titulo="Conclua a configuração primeiro" texto="O planejamento usa o público, o problema e a transformação que você definiu.">
          <Link href={`/criar?id=${produtoId}`} className={classesBotao()}>Voltar para a configuração</Link>
        </EstadoVazio>
      </>
    );

  const editar = (f: (p: Planejamento) => Planejamento) => {
    editado.current = true;
    setPlano((p) => (p ? f(p) : p));
  };
  const editarCap = (i: number, campos: Partial<CapituloPlano>) =>
    editar((p) => ({ ...p, capitulos: p.capitulos.map((c, j) => (j === i ? { ...c, ...campos } : c)) }));
  const mover = (i: number, d: -1 | 1) =>
    editar((p) => {
      const caps = [...p.capitulos];
      [caps[i], caps[i + d]] = [caps[i + d], caps[i]];
      return { ...p, capitulos: caps };
    });

  const gerar = async () => {
    if (plano && !confirm("Gerar um novo planejamento substitui o atual, inclusive suas edições. Continuar?")) return;
    setErro("");
    setGerando(true);
    try {
      const novo = await chamarIA<Planejamento>("planejamento", config.data);
      await salvarPlanejamento(produtoId, novo, false);
      editado.current = false;
      setPlano(novo);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerando(false);
    }
  };

  const aprovar = async () => {
    if (!plano || !usuario) return;
    if (plano.capitulos.length < 3) return setErro("O material precisa de pelo menos 3 capítulos.");
    if (plano.capitulos.some((c) => !c.titulo.trim() || !c.objetivo.trim())) return setErro("Todo capítulo precisa de título e objetivo.");
    if (!plano.tituloComercial.trim()) return setErro("Defina o título comercial.");
    setErro("");
    setAprovando(true);
    try {
      await salvarPlanejamento(produtoId, plano, true);
      await prepararCapitulos(usuario.uid, produtoId, plano);
      router.push(`/produtos/${produtoId}/conteudo`);
    } catch (e) {
      setErro(mensagemErro(e));
      setAprovando(false);
    }
  };

  const reabrir = async () => {
    if (!plano || !confirm("Reabrir o planejamento? Capítulos que mudarem de título ou de lugar serão escritos de novo depois da nova aprovação.")) return;
    await salvarPlanejamento(produtoId, plano, false).catch((e) => setErro(mensagemErro(e)));
  };

  return (
    <>
      <EtapasProduto produtoId={produtoId} atual={1} concluidas={produto.etapa} />

      {!plano ? (
        <Cartao className="flex flex-col items-center py-12 text-center">
          <Sparkle />
          <h2 className="mt-4 font-display text-lg font-semibold">Pronto para planejar “{config.data.tituloProvisorio}”</h2>
          <p className="mt-1.5 max-w-md text-sm text-suave">
            A IA vai propor título comercial, subtítulo, proposta de valor, sumário com objetivos de cada capítulo, exemplos, exercícios e bônus.
          </p>
          <Botao className="mt-6" onClick={gerar} disabled={gerando}>
            {gerando ? <><Loader2 size={16} className="animate-spin" /> Planejando... (1 a 2 min)</> : <><Sparkles size={16} /> Gerar planejamento</>}
          </Botao>
          {erro && <p className="mt-3 text-sm text-erro" role="alert">{erro}</p>}
        </Cartao>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-apagado">
            <span>
              {aprovado ? (
                <span className="flex items-center gap-1.5 text-sucesso"><Check size={14} /> Planejamento aprovado</span>
              ) : salvoEm ? (
                `Edições salvas às ${salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              ) : (
                "Edite à vontade: tudo é salvo automaticamente"
              )}
            </span>
            {!aprovado && (
              <Botao variante="fantasma" onClick={gerar} disabled={gerando}>
                {gerando ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Gerar outro planejamento
              </Botao>
            )}
          </div>

          <fieldset disabled={aprovado} className="space-y-5">
            <Cartao className="grid gap-4">
              <Campo rotulo="Título comercial">
                <input className={estiloEntrada} maxLength={120} value={plano.tituloComercial} onChange={(e) => editar((p) => ({ ...p, tituloComercial: e.target.value }))} />
              </Campo>
              <Campo rotulo="Subtítulo">
                <input className={estiloEntrada} maxLength={200} value={plano.subtitulo} onChange={(e) => editar((p) => ({ ...p, subtitulo: e.target.value }))} />
              </Campo>
              <Campo rotulo="Proposta de valor">
                <textarea rows={2} className={estiloEntrada} value={plano.propostaValor} onChange={(e) => editar((p) => ({ ...p, propostaValor: e.target.value }))} />
              </Campo>
              <Campo rotulo="Introdução vai cobrir">
                <textarea rows={2} className={estiloEntrada} value={plano.introducao} onChange={(e) => editar((p) => ({ ...p, introducao: e.target.value }))} />
              </Campo>
              {plano.avisoTemaSensivel && (
                <p className="flex gap-2 rounded-lg border border-alerta/30 bg-alerta/5 p-3 text-xs text-suave">
                  <ShieldAlert size={15} className="shrink-0 text-alerta" /> {plano.avisoTemaSensivel}
                </p>
              )}
            </Cartao>

            <div>
              <h2 className="mb-3 font-display text-lg font-semibold">Sumário <span className="text-sm font-normal text-apagado">({plano.capitulos.length} capítulos)</span></h2>
              <ol className="space-y-3">
                {plano.capitulos.map((c, i) => (
                  <li key={i}>
                    <Cartao>
                      <div className="flex items-start gap-3">
                        <span className="mt-2.5 font-mono text-sm text-apagado">{String(i + 1).padStart(2, "0")}</span>
                        <div className="grid flex-1 gap-3">
                          <input aria-label={`Título do capítulo ${i + 1}`} className={`${estiloEntrada} font-semibold`} maxLength={200} value={c.titulo} onChange={(e) => editarCap(i, { titulo: e.target.value })} />
                          <Campo rotulo="Objetivo">
                            <textarea rows={2} className={estiloEntrada} value={c.objetivo} onChange={(e) => editarCap(i, { objetivo: e.target.value })} />
                          </Campo>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Campo rotulo="Tópicos" dica="Um por linha">
                              <textarea rows={4} className={estiloEntrada} value={c.topicos.join("\n")} onChange={(e) => editarCap(i, { topicos: linhas(e.target.value) })} />
                            </Campo>
                            <Campo rotulo="Exemplos práticos" dica="Um por linha">
                              <textarea rows={4} className={estiloEntrada} value={c.exemplos.join("\n")} onChange={(e) => editarCap(i, { exemplos: linhas(e.target.value) })} />
                            </Campo>
                          </div>
                          <Campo rotulo="Exercício ou material complementar">
                            <input className={estiloEntrada} value={c.exercicio} onChange={(e) => editarCap(i, { exercicio: e.target.value })} />
                          </Campo>
                        </div>
                        {!aprovado && (
                          <div className="flex flex-col gap-1">
                            <Botao variante="fantasma" className="px-2!" aria-label="Subir capítulo" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp size={16} /></Botao>
                            <Botao variante="fantasma" className="px-2!" aria-label="Descer capítulo" disabled={i === plano.capitulos.length - 1} onClick={() => mover(i, 1)}><ArrowDown size={16} /></Botao>
                            <Botao variante="fantasma" className="px-2!" aria-label="Excluir capítulo"
                              onClick={() => confirm(`Excluir o capítulo "${c.titulo}"?`) && editar((p) => ({ ...p, capitulos: p.capitulos.filter((_, j) => j !== i) }))}>
                              <Trash2 size={16} />
                            </Botao>
                          </div>
                        )}
                      </div>
                    </Cartao>
                  </li>
                ))}
              </ol>
              {!aprovado && (
                <Botao variante="secundario" className="mt-3" onClick={() => editar((p) => ({ ...p, capitulos: [...p.capitulos, CAPITULO_VAZIO] }))}>
                  <Plus size={16} /> Adicionar capítulo
                </Botao>
              )}
            </div>

            <Cartao className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Conclusão vai cobrir">
                <textarea rows={3} className={estiloEntrada} value={plano.conclusao} onChange={(e) => editar((p) => ({ ...p, conclusao: e.target.value }))} />
              </Campo>
              <Campo rotulo="Bônus" dica="Um por linha">
                <textarea rows={3} className={estiloEntrada} value={plano.bonus.join("\n")} onChange={(e) => editar((p) => ({ ...p, bonus: linhas(e.target.value) }))} />
              </Campo>
            </Cartao>
          </fieldset>

          {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-borda pt-5">
            {aprovado ? (
              <>
                <Botao variante="secundario" onClick={reabrir}>Reabrir para editar</Botao>
                <Link href={`/produtos/${produtoId}/conteudo`} className={classesBotao()}>Ir para a redação <ArrowRight size={16} /></Link>
              </>
            ) : (
              <Botao onClick={aprovar} disabled={aprovando}>
                {aprovando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Aprovar e seguir para a redação
              </Botao>
            )}
          </div>
        </div>
      )}
    </>
  );
}
