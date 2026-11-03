"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, History, Loader2, Lock, Save, ShieldAlert } from "lucide-react";
import { EtapasProduto } from "@/components/EtapasProduto";
import { useProduto } from "@/components/useProduto";
import { Botao, Cartao, EstadoVazio, Selo, classesBotao } from "@/components/ui";
import { ouvirVersoes, salvarVersao, type VersaoPdf } from "@/lib/arquivos";
import { verificarMaterial } from "@/lib/documentos/verificacao";
import { imagemAtual, ouvirImagens, type Imagem } from "@/lib/imagens";
import { marcarEtapa, ouvirCapitulos, type Capitulo } from "@/lib/produtos";
import { useImagensLocais } from "../imagens/imagensLocais";

type Resultado = { url: string; blob: Blob; totalPaginas: number; semPagina: string[]; rascunho: boolean };

const nomeArquivo = (titulo: string) =>
  titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "ebook";

export function ExportarPdf({ produtoId }: { produtoId: string }) {
  const { produto, erro: erroProduto, usuario } = useProduto(produtoId);
  const [capitulos, setCapitulos] = useState<Capitulo[] | null>(null);
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [versoes, setVersoes] = useState<VersaoPdf[]>([]);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const { locais } = useImagensLocais(produtoId);

  useEffect(() => {
    if (!usuario) return;
    const a = ouvirCapitulos(usuario.uid, produtoId, setCapitulos, () => setCapitulos([]));
    const b = ouvirImagens(usuario.uid, produtoId, setImagens, () => setImagens([]));
    const c = ouvirVersoes(usuario.uid, produtoId, setVersoes, () => setVersoes([]));
    return () => { a(); b(); c(); };
  }, [usuario, produtoId]);

  // Libera a memória do PDF anterior ao gerar outro ou sair da página.
  useEffect(() => () => { if (resultado) URL.revokeObjectURL(resultado.url); }, [resultado]);

  const plano = produto?.planejamento;
  const urlImagem = (tipo: "capa" | "capitulo", ordem: number) => imagemAtual(imagens, tipo, ordem)?.url ?? locais[`${tipo}-${ordem}`];

  const achados = useMemo(() => {
    if (!plano || !capitulos) return [];
    return verificarMaterial({
      capitulos,
      totalPlanejado: plano.capitulos.length,
      temCapa: !!urlImagem("capa", 0),
      imagensCapitulos: plano.capitulos.filter((_, i) => urlImagem("capitulo", i)).length,
      bonusPlanejados: plano.bonus.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano, capitulos, imagens, locais]);

  if (produto === undefined || capitulos === null) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (produto === null) return <EstadoVazio icone={Lock} titulo="Produto não encontrado" texto={erroProduto || "Ele pode ter sido excluído ou não pertence a esta conta."} />;
  if (!plano || !produto.identidade)
    return (
      <>
        <EtapasProduto produtoId={produtoId} atual={5} concluidas={produto.etapa} />
        <EstadoVazio icone={Lock} titulo="Defina a identidade visual primeiro" texto="O PDF usa as cores, fontes e capa que você escolher.">
          <Link href={`/produtos/${produtoId}/identidade`} className={classesBotao()}>Ir para a identidade visual</Link>
        </EstadoVazio>
      </>
    );

  const bloqueantes = achados.filter((a) => a.nivel === "bloqueante");
  const rascunho = bloqueantes.length > 0;

  const gerar = async () => {
    setErro("");
    setAviso("");
    setGerando(true);
    try {
      const prontos = capitulos.filter((c) => c.status === "concluido" && c.conteudo);
      const imagensCapitulos = Object.fromEntries(plano.capitulos.map((_, i) => [String(i), urlImagem("capitulo", i)]).filter(([, u]) => u));
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planejamento: plano,
          identidade: produto.identidade,
          capitulos: prontos.map((c) => ({ ordem: c.ordem, titulo: c.titulo, conteudo: c.conteudo })),
          imagens: { capa: urlImagem("capa", 0), capitulos: imagensCapitulos },
          rascunho,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro ?? "Não foi possível gerar o PDF.");
      const bytes = Uint8Array.from(atob(json.pdf), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      setResultado({ url: URL.createObjectURL(blob), blob, totalPaginas: json.totalPaginas, semPagina: json.semPagina, rascunho });
      if (!rascunho && json.semPagina.length === 0 && produto.etapa < 6) await marcarEtapa(produtoId, 6).catch(() => {});
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerando(false);
    }
  };

  const guardar = async () => {
    if (!resultado || !usuario) return;
    setSalvando(true);
    setAviso("");
    try {
      await salvarVersao(usuario.uid, produtoId, (versoes[0]?.versao ?? 0) + 1, resultado.blob, resultado.totalPaginas, resultado.rascunho);
      await fetch("/api/paginas/sincronizar", { method: "POST" }).catch(() => {});
      setAviso(resultado.rascunho ? "Versão salva como rascunho: não pode ser vendida." : "Versão final salva: é ela que o comprador recebe.");
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <EtapasProduto produtoId={produtoId} atual={5} concluidas={produto.etapa} />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Cartao>
            <p className="flex items-center gap-2 font-semibold"><ShieldAlert size={17} className="text-primaria-clara" /> Verificação automática</p>
            {achados.length === 0 ? (
              <p className="mt-2 flex gap-2 text-sm text-sucesso"><CheckCircle2 size={16} /> Tudo certo para gerar a versão final.</p>
            ) : (
              <ul className="mt-3 space-y-2.5 text-sm">
                {achados.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <Selo tom={a.nivel === "bloqueante" ? "vermelho" : "amarelo"}>{a.nivel === "bloqueante" ? "Bloqueia" : "Aviso"}</Selo>
                    <span className="text-suave">{a.mensagem}</span>
                  </li>
                ))}
              </ul>
            )}
            {rascunho && (
              <p className="mt-3 text-xs text-apagado">Enquanto houver itens que bloqueiam, o PDF sai marcado como RASCUNHO no rodapé e só com os capítulos prontos.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/produtos/${produtoId}/conteudo`} className={classesBotao("secundario")}>Editar texto</Link>
              <Link href={`/produtos/${produtoId}/imagens`} className={classesBotao("secundario")}>Imagens</Link>
            </div>
          </Cartao>

          <Botao className="w-full" onClick={gerar} disabled={gerando}>
            {gerando ? <><Loader2 size={16} className="animate-spin" /> Diagramando...</> : <><FileText size={16} /> {resultado ? "Gerar de novo" : rascunho ? "Gerar PDF de rascunho" : "Gerar PDF"}</>}
          </Botao>
          {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}

          {resultado && (
            <Cartao>
              <p className="text-sm">
                <strong>{resultado.totalPaginas} páginas</strong> · {(resultado.blob.size / 1024 / 1024).toFixed(1)} MB
                {resultado.rascunho && <span className="text-alerta"> · rascunho</span>}
              </p>
              {resultado.semPagina.length > 0 && (
                <p className="mt-2 flex gap-2 text-xs text-erro"><AlertTriangle size={14} /> Seções que não apareceram na diagramação: {resultado.semPagina.join(", ")}.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={resultado.url} download={`${nomeArquivo(plano.tituloComercial)}${resultado.rascunho ? "-rascunho" : ""}.pdf`} className={classesBotao()}>
                  <Download size={16} /> Baixar PDF
                </a>
                <Botao variante="secundario" onClick={guardar} disabled={salvando}>
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar versão
                </Botao>
              </div>
              {aviso && <p className="mt-2 text-xs text-suave">{aviso}</p>}
            </Cartao>
          )}

          {versoes.length > 0 && (
            <Cartao>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><History size={15} /> Versões salvas</p>
              <ul className="space-y-1.5 text-sm">
                {versoes.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span className="text-suave">v{v.versao} · {v.paginas} pág.{v.rascunho ? " · rascunho" : ""}</span>
                    <a href={v.url} target="_blank" rel="noreferrer" className="text-primaria-clara hover:underline">Abrir</a>
                  </li>
                ))}
              </ul>
            </Cartao>
          )}
        </div>

        <Cartao className="min-h-[70vh] p-2">
          {resultado ? (
            <iframe src={resultado.url} title="Pré-visualização do PDF" className="h-[78vh] w-full rounded-lg bg-white" />
          ) : (
            <div className="grid h-full min-h-[60vh] place-items-center text-center text-sm text-suave">
              <div>
                <FileText className="mx-auto mb-3 text-apagado" size={32} />
                A pré-visualização do PDF aparece aqui depois de gerar.
              </div>
            </div>
          )}
        </Cartao>
      </div>
    </>
  );
}
