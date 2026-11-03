"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Lock, Save } from "lucide-react";
import { CapaPrevia } from "@/components/CapaPrevia";
import { EtapasProduto } from "@/components/EtapasProduto";
import { useProduto } from "@/components/useProduto";
import { Botao, Campo, Cartao, EstadoVazio, classesBotao, estiloEntrada } from "@/components/ui";
import {
  ELEMENTOS, ESTILOS, FONTES, LAYOUTS_CAPA, identidadePadrao,
  type ChaveFonte, type Cores, type Elementos, type Identidade, type LayoutCapa,
} from "@/config/identidade";
import { salvarIdentidade } from "@/lib/produtos";
import { mensagemErro } from "@/lib/firebase/erros";

const ROTULO_COR: Record<keyof Cores, string> = {
  primaria: "Principal", secundaria: "Secundária", fundo: "Fundo das páginas", texto: "Texto", destaque: "Quadros de destaque",
};

export function EditorIdentidade({ produtoId }: { produtoId: string }) {
  const router = useRouter();
  const { produto, erro: erroProduto, usuario } = useProduto(produtoId);
  const [id, setId] = useState<Identidade | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (produto && !id) setId(produto.identidade ?? identidadePadrao("Moderno", usuario?.displayName ?? ""));
  }, [produto, id, usuario]);

  if (produto === undefined || (produto && !id)) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (produto === null) return <EstadoVazio icone={Lock} titulo="Produto não encontrado" texto={erroProduto || "Ele pode ter sido excluído ou não pertence a esta conta."} />;
  if (!produto.planejamento || !produto.planejamentoAprovado)
    return (
      <>
        <EtapasProduto produtoId={produtoId} atual={3} concluidas={produto.etapa} />
        <EstadoVazio icone={Lock} titulo="Aprove o planejamento primeiro" texto="A capa usa o título e o subtítulo aprovados.">
          <Link href={`/produtos/${produtoId}/planejamento`} className={classesBotao()}>Ir para o planejamento</Link>
        </EstadoVazio>
      </>
    );

  const atual = id!;
  const mudar = (campos: Partial<Identidade>) => setId({ ...atual, ...campos });
  const escolherEstilo = (estilo: string) => setId({ ...identidadePadrao(estilo, atual.autor), estilo });

  const salvar = async (seguir: boolean) => {
    setErro("");
    setSalvando(true);
    try {
      await salvarIdentidade(produtoId, atual, produto.etapa);
      if (seguir) router.push(`/produtos/${produtoId}/imagens`);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <EtapasProduto produtoId={produtoId} atual={3} concluidas={produto.etapa} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Cartao>
            <h2 className="mb-3 font-semibold">Estilo</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {Object.entries(ESTILOS).map(([nome, p]) => (
                <button
                  key={nome}
                  onClick={() => escolherEstilo(nome)}
                  aria-pressed={atual.estilo === nome}
                  className={clsx("rounded-xl border p-2.5 text-left text-xs transition", atual.estilo === nome ? "border-primaria-clara bg-primaria/10" : "border-borda hover:border-borda-forte")}
                >
                  <span className="mb-2 flex gap-1">
                    {[p.cores.primaria, p.cores.secundaria, p.cores.destaque].map((c) => <span key={c} className="size-4 rounded-full ring-1 ring-white/20" style={{ background: c }} />)}
                  </span>
                  <span className="font-semibold">{nome}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-apagado">Trocar de estilo aplica as cores e fontes dele; depois você ajusta o que quiser.</p>
          </Cartao>

          <Cartao>
            <h2 className="mb-3 font-semibold">Paleta de cores</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(Object.keys(ROTULO_COR) as (keyof Cores)[]).map((k) => (
                <label key={k} className="text-xs">
                  <span className="mb-1 block text-suave">{ROTULO_COR[k]}</span>
                  <span className="flex items-center gap-2 rounded-xl border border-borda p-1.5">
                    <input type="color" value={atual.cores[k]} onChange={(e) => mudar({ cores: { ...atual.cores, [k]: e.target.value } })} className="size-7 cursor-pointer rounded border-0 bg-transparent" />
                    <span className="font-mono text-[11px] text-apagado">{atual.cores[k]}</span>
                  </span>
                </label>
              ))}
            </div>
          </Cartao>

          <Cartao className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Fonte dos títulos">
              <select className={estiloEntrada} value={atual.fonteTitulo} onChange={(e) => mudar({ fonteTitulo: e.target.value as ChaveFonte })}>
                {Object.entries(FONTES).map(([k, f]) => <option key={k} value={k}>{f.nome} ({f.tipo})</option>)}
              </select>
            </Campo>
            <Campo rotulo="Fonte do texto">
              <select className={estiloEntrada} value={atual.fonteCorpo} onChange={(e) => mudar({ fonteCorpo: e.target.value as ChaveFonte })}>
                {Object.entries(FONTES).map(([k, f]) => <option key={k} value={k}>{f.nome} ({f.tipo})</option>)}
              </select>
            </Campo>
            <Campo rotulo="Estilo da capa">
              <select className={estiloEntrada} value={atual.layoutCapa} onChange={(e) => mudar({ layoutCapa: e.target.value as LayoutCapa })}>
                {Object.entries(LAYOUTS_CAPA).map(([k, d]) => <option key={k} value={k}>{d}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Elementos gráficos">
              <select className={estiloEntrada} value={atual.elementos} onChange={(e) => mudar({ elementos: e.target.value as Elementos })}>
                {Object.entries(ELEMENTOS).map(([k, d]) => <option key={k} value={k}>{d}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Estilo das imagens" dica="Orienta a IA de imagem na capa e nas aberturas de capítulo.">
              <textarea rows={2} maxLength={300} className={estiloEntrada} value={atual.estiloImagens} onChange={(e) => mudar({ estiloImagens: e.target.value })} />
            </Campo>
            <Campo rotulo="Nome na capa (autoria)" dica="Pode ser seu nome ou o nome da sua marca.">
              <input maxLength={80} className={estiloEntrada} value={atual.autor} onChange={(e) => mudar({ autor: e.target.value })} />
            </Campo>
          </Cartao>

          {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Botao variante="secundario" onClick={() => salvar(false)} disabled={salvando}><Save size={16} /> Salvar</Botao>
            <Botao onClick={() => salvar(true)} disabled={salvando}>
              {salvando ? <Loader2 size={16} className="animate-spin" /> : null} Salvar e ir para as imagens <ArrowRight size={16} />
            </Botao>
          </div>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-2 text-xs text-apagado">Prévia da capa (a arte entra na próxima etapa)</p>
          <CapaPrevia id={atual} titulo={produto.planejamento.tituloComercial} subtitulo={produto.planejamento.subtitulo} largura={300} />
        </div>
      </div>
    </>
  );
}
