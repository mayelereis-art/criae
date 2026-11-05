"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Library, Loader2 } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Cartao, EstadoVazio, Selo, classesBotao, estiloEntrada } from "@/components/ui";
import { ouvirVersoes, type VersaoPdf } from "@/lib/arquivos";
import { ouvirCriativos, type Criativo } from "@/lib/criativos/dados";
import { ouvirImagens, type Imagem } from "@/lib/imagens";
import { ouvirProdutos, type Produto } from "@/lib/produtos";

function Grade({ titulo, itens }: { titulo: string; itens: { id: string; url: string; rotulo: string }[] }) {
  return (
    <Cartao>
      <h2 className="mb-3 font-semibold">{titulo}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {itens.map((i) => (
          <li key={i.id}>
            <a href={i.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-borda transition hover:border-borda-forte">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.url} alt={i.rotulo} loading="lazy" className="aspect-square w-full object-cover" />
            </a>
            <p className="mt-1 truncate text-xs text-suave">{i.rotulo}</p>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}

export function MinhaBiblioteca() {
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [id, setId] = useState("");
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [criativos, setCriativos] = useState<Criativo[]>([]);
  const [pdfs, setPdfs] = useState<VersaoPdf[]>([]);

  useEffect(() => {
    if (!usuario) return;
    return ouvirProdutos(usuario.uid, setProdutos, () => setProdutos([]));
  }, [usuario]);

  const produtoId = id || produtos?.[0]?.id || "";
  useEffect(() => {
    if (!usuario || !produtoId) return;
    const a = ouvirImagens(usuario.uid, produtoId, setImagens, () => setImagens([]));
    const b = ouvirCriativos(usuario.uid, produtoId, setCriativos, () => setCriativos([]));
    const c = ouvirVersoes(usuario.uid, produtoId, setPdfs, () => setPdfs([]));
    return () => { a(); b(); c(); };
  }, [usuario, produtoId]);

  if (!produtos) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (!produtos.length)
    return (
      <EstadoVazio icone={Library} titulo="Biblioteca vazia" texto="Os materiais que você gerar ficam guardados aqui.">
        <Link href="/criar" className={classesBotao()}>Criar um produto</Link>
      </EstadoVazio>
    );

  const prontos = criativos.filter((c) => c.urlFinal);
  const vazio = !imagens.length && !prontos.length && !pdfs.length;

  return (
    <div className="space-y-5">
      <label className="flex max-w-md items-center gap-2 text-sm text-suave">
        <span className="shrink-0">Produto</span>
        <select className={estiloEntrada} value={produtoId} onChange={(e) => setId(e.target.value)}>
          {produtos.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
        </select>
      </label>
      {vazio && <p className="text-sm text-suave">Este produto ainda não tem arquivos gerados.</p>}
      {!!pdfs.length && (
        <Cartao>
          <h2 className="mb-3 font-semibold">Versões do PDF</h2>
          <ul className="divide-y divide-borda text-sm">
            {pdfs.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="flex items-center gap-2">Versão {v.versao} <Selo tom={v.rascunho ? "neutro" : "verde"}>{v.rascunho ? "Rascunho" : "Final"}</Selo> <span className="text-xs text-apagado">{v.paginas} páginas · {(v.bytes / 1048576).toFixed(1)} MB</span></span>
                <a href={v.url} target="_blank" rel="noreferrer" className="text-primaria-clara underline">Abrir</a>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      {!!imagens.length && <Grade titulo="Capas e imagens" itens={imagens.map((i) => ({ id: i.id, url: i.url, rotulo: i.tipo === "capa" ? "Capa" : `Capítulo ${i.ordem + 1}` }))} />}
      {!!prontos.length && <Grade titulo="Criativos" itens={prontos.map((c) => ({ id: c.id, url: c.urlFinal!, rotulo: c.titulo }))} />}
    </div>
  );
}
