"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, ImageIcon, Loader2, Lock, RefreshCw, Sparkles } from "lucide-react";
import { CapaPrevia } from "@/components/CapaPrevia";
import { EtapasProduto } from "@/components/EtapasProduto";
import { useProduto } from "@/components/useProduto";
import { Botao, Cartao, EstadoVazio, classesBotao } from "@/components/ui";
import { chamarIA } from "@/lib/ia/cliente";
import { guardarImagem, imagemAtual, ouvirImagens, type Imagem, type TipoImagem } from "@/lib/imagens";
import { marcarEtapa, type Produto } from "@/lib/produtos";
import { useImagensLocais } from "./imagensLocais";

type Vaga = { chave: string; tipo: TipoImagem; ordem: number; titulo: string; objetivo?: string };

export function GeradorImagens({ produtoId }: { produtoId: string }) {
  const router = useRouter();
  const { produto, erro: erroProduto, usuario } = useProduto(produtoId);
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [gerando, setGerando] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const { locais, guardarLocal } = useImagensLocais(produtoId);

  useEffect(() => {
    if (!usuario) return;
    return ouvirImagens(usuario.uid, produtoId, setImagens, () => setImagens([]));
  }, [usuario, produtoId]);

  if (produto === undefined) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (produto === null) return <EstadoVazio icone={Lock} titulo="Produto não encontrado" texto={erroProduto || "Ele pode ter sido excluído ou não pertence a esta conta."} />;
  if (!produto.identidade || !produto.planejamento)
    return (
      <>
        <EtapasProduto produtoId={produtoId} atual={4} concluidas={produto.etapa} />
        <EstadoVazio icone={Lock} titulo="Defina a identidade visual primeiro" texto="As imagens seguem a paleta e o estilo que você escolher.">
          <Link href={`/produtos/${produtoId}/identidade`} className={classesBotao()}>Ir para a identidade visual</Link>
        </EstadoVazio>
      </>
    );

  const plano = produto.planejamento;
  const vagas: Vaga[] = [
    { chave: "capa-0", tipo: "capa", ordem: 0, titulo: "Capa" },
    ...plano.capitulos.map((c, i) => ({ chave: `capitulo-${i}`, tipo: "capitulo" as const, ordem: i, titulo: `${i + 1}. ${c.titulo}`, objetivo: c.objetivo })),
  ];
  const urlDe = (v: Vaga) => imagemAtual(imagens, v.tipo, v.ordem)?.url ?? locais[v.chave];

  const gerar = async (v: Vaga) => {
    if (!usuario) return;
    setGerando(v.chave);
    setErros((e) => ({ ...e, [v.chave]: "" }));
    try {
      const r = await chamarIA<{ base64: string; prompt: string }>("imagem", corpoPedido(produto, v));
      try {
        await guardarImagem(usuario.uid, produtoId, v.tipo, v.ordem, r.base64, r.prompt);
      } catch (e) {
        // A imagem já foi paga: mantém nesta sessão para não perder.
        guardarLocal(v.chave, `data:image/jpeg;base64,${r.base64}`);
        throw new Error(`${(e as Error).message} A imagem aparece aqui só nesta sessão do navegador.`);
      }
    } catch (e) {
      setErros((x) => ({ ...x, [v.chave]: (e as Error).message }));
    } finally {
      setGerando(null);
    }
  };

  const gerarFaltantes = async () => {
    for (const v of vagas) if (!urlDe(v)) await gerar(v);
  };

  const seguir = async () => {
    if (produto.etapa === 4) await marcarEtapa(produtoId, 5).catch(() => {});
    router.push(`/produtos/${produtoId}/pdf`);
  };

  const faltam = vagas.filter((v) => !urlDe(v)).length;

  return (
    <>
      <EtapasProduto produtoId={produtoId} atual={4} concluidas={produto.etapa} />

      <Cartao className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-suave">
          {faltam === 0 ? "Todas as imagens prontas." : `${faltam} de ${vagas.length} imagens por gerar.`} Cada imagem leva cerca de 30 a 60 segundos.
          <span className="mt-1 block text-xs text-apagado">As imagens são opcionais: sem elas, a capa usa um degradê da sua paleta e os capítulos abrem só com o título.</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {faltam > 0 && (
            <Botao variante="secundario" onClick={gerarFaltantes} disabled={!!gerando}>
              {gerando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Gerar as que faltam
            </Botao>
          )}
          <Botao onClick={seguir} disabled={!!gerando}>Seguir para o PDF <ArrowRight size={16} /></Botao>
        </div>
      </Cartao>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <CapaPrevia id={produto.identidade} titulo={plano.tituloComercial} subtitulo={plano.subtitulo} imagemUrl={urlDe(vagas[0])} largura={300} />
          <AcoesVaga vaga={vagas[0]} temImagem={!!urlDe(vagas[0])} gerando={gerando} erro={erros[vagas[0].chave]} aoGerar={gerar} />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {vagas.slice(1).map((v) => {
            const url = urlDe(v);
            return (
              <li key={v.chave}>
                <Cartao className="p-3">
                  <div className="aspect-[3/2] overflow-hidden rounded-lg bg-superficie-2">
                    {gerando === v.chave ? (
                      <div className="grid h-full place-items-center text-suave"><Loader2 className="animate-spin" /></div>
                    ) : url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={`Abertura do capítulo ${v.titulo}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-apagado"><ImageIcon /></div>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium">{v.titulo}</p>
                  <AcoesVaga vaga={v} temImagem={!!url} gerando={gerando} erro={erros[v.chave]} aoGerar={gerar} />
                </Cartao>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function AcoesVaga({ vaga, temImagem, gerando, erro, aoGerar }: {
  vaga: Vaga; temImagem: boolean; gerando: string | null; erro?: string; aoGerar: (v: Vaga) => void;
}) {
  return (
    <div className="mt-2">
      <Botao variante="secundario" className="w-full" onClick={() => aoGerar(vaga)} disabled={!!gerando}>
        {gerando === vaga.chave ? <Loader2 size={15} className="animate-spin" /> : temImagem ? <RefreshCw size={15} /> : <Sparkles size={15} />}
        {gerando === vaga.chave ? "Gerando..." : temImagem ? "Gerar outra" : "Gerar imagem"}
      </Botao>
      {erro && <p className="mt-1.5 flex gap-1.5 text-xs text-erro" role="alert"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {erro}</p>}
    </div>
  );
}

function corpoPedido(p: Produto, v: Vaga) {
  const id = p.identidade!;
  const plano = p.planejamento!;
  return {
    tipo: v.tipo,
    titulo: plano.tituloComercial.slice(0, 200),
    subtitulo: plano.subtitulo.slice(0, 400),
    tema: (p.configuracao.tema ?? "").slice(0, 200),
    publico: (p.configuracao.publicoAlvo ?? "").slice(0, 500),
    estilo: id.estiloImagens.slice(0, 300),
    cores: [id.cores.primaria, id.cores.secundaria, id.cores.destaque],
    capitulo: v.tipo === "capitulo" ? { titulo: plano.capitulos[v.ordem].titulo.slice(0, 200), objetivo: plano.capitulos[v.ordem].objetivo.slice(0, 1000) } : undefined,
  };
}
