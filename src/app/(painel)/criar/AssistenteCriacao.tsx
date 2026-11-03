"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Cloud, Loader2, Sparkles } from "lucide-react";
import { NIVEIS_PUBLICO, PROFUNDIDADES, TONS } from "@/config/catalogo";
import { CONFIGURACAO_VAZIA, configuracaoProdutoSchema, type ConfiguracaoProduto } from "@/lib/validacao/produto";
import { criarProduto, lerProduto, salvarConfiguracao } from "@/lib/produtos";
import { mensagemErro } from "@/lib/firebase/erros";
import { useAuth } from "@/components/ProvedorAuth";
import { AvisoEtapa, Botao, Campo, Cartao, estiloEntrada } from "@/components/ui";

const ETAPAS = ["Configuração", "Planejamento", "Redação", "Identidade visual", "Imagens", "PDF", "Preço"];

/** A configuração se divide em três telas curtas, para não virar um formulário gigante. */
const PARTES: { titulo: string; campos: (keyof ConfiguracaoProduto)[] }[] = [
  { titulo: "Sobre o que é", campos: ["nicho", "subnicho", "tema", "tituloProvisorio"] },
  { titulo: "Para quem é", campos: ["publicoAlvo", "nivelPublico", "problema", "transformacao"] },
  { titulo: "Como vai ser", campos: ["objetivo", "tom", "profundidade"] },
];

const ROTULOS: Record<keyof ConfiguracaoProduto, { rotulo: string; dica?: string; exemplo?: string; longo?: boolean }> = {
  nicho: { rotulo: "Nicho", exemplo: "Beleza e estética" },
  subnicho: { rotulo: "Subnicho", exemplo: "Cuidados com as unhas em casa" },
  tema: { rotulo: "Tema", exemplo: "Rotina rápida de unhas para quem não tem tempo" },
  tituloProvisorio: { rotulo: "Título provisório", dica: "A IA propõe um título comercial no planejamento.", exemplo: "Unhas bonitas em 10 minutos" },
  publicoAlvo: { rotulo: "Público-alvo", longo: true, exemplo: "Mulheres de 25 a 45 anos que trabalham fora e querem unhas bem cuidadas sem ir ao salão toda semana" },
  nivelPublico: { rotulo: "Nível de conhecimento do público" },
  problema: { rotulo: "Problema que o produto resolve", longo: true, exemplo: "Gastam tempo e dinheiro no salão e o esmalte descasca em poucos dias" },
  transformacao: { rotulo: "Transformação desejada", longo: true, exemplo: "Manter as unhas bonitas em casa com uma rotina curta e materiais simples" },
  objetivo: { rotulo: "Objetivo do material", exemplo: "Ensinar uma rotina de 7 dias passo a passo" },
  tom: { rotulo: "Tom de comunicação" },
  profundidade: { rotulo: "Profundidade do conteúdo" },
};

type EstadoSalvo = { tipo: "ocioso" } | { tipo: "salvando" } | { tipo: "salvo"; em: Date } | { tipo: "erro"; msg: string };

export function AssistenteCriacao({ nichoInicial, produtoId }: { nichoInicial?: string; produtoId?: string }) {
  const router = useRouter();
  const { usuario } = useAuth();
  const [id, setId] = useState(produtoId);
  const [dados, setDados] = useState<ConfiguracaoProduto>({ ...CONFIGURACAO_VAZIA, ...(nichoInicial && { nicho: nichoInicial }) });
  const [parte, setParte] = useState(0);
  const [erros, setErros] = useState<Partial<Record<keyof ConfiguracaoProduto, string>>>({});
  const [salvo, setSalvo] = useState<EstadoSalvo>({ tipo: "ocioso" });
  const [concluida, setConcluida] = useState(false);
  const [carregando, setCarregando] = useState(!!produtoId);
  const alterado = useRef(false);
  const criadoAqui = useRef<string | undefined>(undefined);

  // Retomar um produto existente.
  useEffect(() => {
    if (!produtoId || produtoId === criadoAqui.current) return;
    lerProduto(produtoId)
      .then((p) => {
        if (!p) return setSalvo({ tipo: "erro", msg: "Produto não encontrado." });
        setDados({ ...CONFIGURACAO_VAZIA, ...p.configuracao });
        setConcluida(p.etapa >= 1);
      })
      .catch((e) => setSalvo({ tipo: "erro", msg: mensagemErro(e) }))
      .finally(() => setCarregando(false));
  }, [produtoId]);

  // Salvamento automático no Firestore depois que o produto existe.
  useEffect(() => {
    if (!id || !alterado.current) return;
    const t = setTimeout(() => {
      setSalvo({ tipo: "salvando" });
      salvarConfiguracao(id, dados)
        .then(() => setSalvo({ tipo: "salvo", em: new Date() }))
        .catch((e) => setSalvo({ tipo: "erro", msg: mensagemErro(e) }));
    }, 800);
    return () => clearTimeout(t);
  }, [id, dados]);

  const alterar = <K extends keyof ConfiguracaoProduto>(campo: K, valor: ConfiguracaoProduto[K]) => {
    alterado.current = true;
    setDados((d) => ({ ...d, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const validarParte = () => {
    const campos = PARTES[parte].campos;
    const resultado = configuracaoProdutoSchema.pick(Object.fromEntries(campos.map((c) => [c, true])) as never).safeParse(dados);
    if (resultado.success) return true;
    const novos: typeof erros = {};
    for (const issue of resultado.error.issues) novos[issue.path[0] as keyof ConfiguracaoProduto] ??= issue.message;
    setErros(novos);
    return false;
  };

  const avancar = async () => {
    if (!validarParte() || !usuario) return;
    try {
      // O produto nasce no banco ao passar da primeira tela; daí em diante salva sozinho.
      if (!id) {
        setSalvo({ tipo: "salvando" });
        const novo = await criarProduto(usuario.uid, dados);
        criadoAqui.current = novo;
        setId(novo);
        router.replace(`/criar?id=${novo}`, { scroll: false });
        setSalvo({ tipo: "salvo", em: new Date() });
      }
      if (parte < PARTES.length - 1) return setParte(parte + 1);
      await salvarConfiguracao(id!, dados, 1);
      setConcluida(true);
    } catch (e) {
      setSalvo({ tipo: "erro", msg: mensagemErro(e) });
    }
  };

  if (carregando) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando produto...</p>;

  return (
    <>
      <ol className="mb-6 flex gap-1.5 overflow-x-auto pb-1" aria-label="Etapas da criação">
        {ETAPAS.map((nome, i) => {
          const feita = i === 0 && concluida;
          const atual = i === (concluida ? 1 : 0);
          return (
            <li key={nome} className="min-w-[110px] flex-1">
              <div className={clsx("h-1 rounded-full", feita ? "bg-sucesso" : atual ? "bg-primaria" : "bg-superficie-2")} />
              <p className={clsx("mt-2 flex items-center gap-1 text-xs", atual ? "font-semibold text-texto" : "text-apagado")}>
                {feita && <Check size={12} className="text-sucesso" />}
                <span className="font-mono">{i + 1}.</span> {nome}
              </p>
            </li>
          );
        })}
      </ol>

      {concluida ? (
        <Cartao className="animate-surgir">
          <h2 className="font-display text-lg font-semibold">Configuração pronta</h2>
          <p className="mt-1 text-sm text-suave">
            Próximo passo: a IA monta título comercial, subtítulo, proposta de valor e sumário para você aprovar, editar e reorganizar.
          </p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {(Object.keys(ROTULOS) as (keyof ConfiguracaoProduto)[]).map((c) => (
              <div key={c} className="rounded-xl border border-borda p-3">
                <dt className="text-xs text-apagado">{ROTULOS[c].rotulo}</dt>
                <dd className="mt-0.5">{c === "profundidade" ? PROFUNDIDADES.find((p) => p.id === dados[c])?.nome : dados[c]}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <AvisoEtapa etapa={4} oQueFalta="A geração do planejamento com Claude é ligada na Etapa 4." />
            <div className="flex flex-wrap gap-2">
              <Botao variante="secundario" onClick={() => { setConcluida(false); setParte(0); }}>
                <ArrowLeft size={16} /> Editar configuração
              </Botao>
              <Botao disabled><Sparkles size={16} /> Gerar planejamento</Botao>
            </div>
          </div>
        </Cartao>
      ) : (
        <Cartao className="animate-surgir" key={parte}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">
              <span className="mr-2 font-mono text-sm text-apagado">{parte + 1}/{PARTES.length}</span>
              {PARTES[parte].titulo}
            </h2>
            <IndicadorSalvo estado={salvo} temId={!!id} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PARTES[parte].campos.map((campo) => {
              const meta = ROTULOS[campo];
              const erro = erros[campo];
              const classe = clsx(estiloEntrada, erro && "border-erro!");
              let entrada;
              if (campo === "nivelPublico" || campo === "tom") {
                const opcoes = campo === "tom" ? TONS : NIVEIS_PUBLICO;
                entrada = (
                  <select className={classe} value={dados[campo]} onChange={(e) => alterar(campo, e.target.value as never)}>
                    {opcoes.map((o) => <option key={o}>{o}</option>)}
                  </select>
                );
              } else if (campo === "profundidade") {
                entrada = (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {PROFUNDIDADES.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => alterar("profundidade", p.id)}
                        aria-pressed={dados.profundidade === p.id}
                        className={clsx("rounded-xl border p-3 text-left text-sm transition", dados.profundidade === p.id ? "border-primaria-clara bg-primaria/10" : "border-borda hover:border-borda-forte")}
                      >
                        <span className="block font-semibold">{p.nome}</span>
                        <span className="text-xs text-suave">{p.detalhe}</span>
                      </button>
                    ))}
                  </div>
                );
              } else if (meta.longo) {
                entrada = <textarea rows={3} className={classe} placeholder={meta.exemplo} value={dados[campo]} onChange={(e) => alterar(campo, e.target.value)} />;
              } else {
                entrada = <input className={classe} placeholder={meta.exemplo} value={dados[campo]} onChange={(e) => alterar(campo, e.target.value)} />;
              }
              const largo = meta.longo || campo === "profundidade";
              return (
                <div key={campo} className={clsx(largo && "sm:col-span-2")}>
                  <Campo rotulo={meta.rotulo} dica={erro ? undefined : meta.dica}>{entrada}</Campo>
                  {erro && <p className="mt-1 text-xs text-erro" role="alert">{erro}</p>}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-5">
            <Botao variante="fantasma" disabled={parte === 0} onClick={() => setParte(parte - 1)}>
              <ArrowLeft size={16} /> Voltar
            </Botao>
            <div className="flex flex-wrap gap-2">
              <Botao variante="secundario" disabled title="Sugestões da IA entram na Etapa 4">
                <Sparkles size={16} /> IA preenche
              </Botao>
              <Botao onClick={avancar}>
                {parte < PARTES.length - 1 ? "Avançar" : "Concluir configuração"} <ArrowRight size={16} />
              </Botao>
            </div>
          </div>
        </Cartao>
      )}
    </>
  );
}

function IndicadorSalvo({ estado, temId }: { estado: EstadoSalvo; temId: boolean }) {
  const base = "flex items-center gap-1.5 text-xs";
  if (estado.tipo === "erro") return <span className={clsx(base, "text-erro")} role="alert"><AlertCircle size={13} /> {estado.msg}</span>;
  if (estado.tipo === "salvando") return <span className={clsx(base, "text-suave")}><Loader2 size={13} className="animate-spin" /> Salvando...</span>;
  if (estado.tipo === "salvo")
    return <span className={clsx(base, "text-sucesso")}><Cloud size={13} /> Salvo às {estado.em.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>;
  return <span className={clsx(base, "text-apagado")}><Cloud size={13} /> {temId ? "Salvamento automático ligado" : "Salva ao avançar"}</span>;
}
