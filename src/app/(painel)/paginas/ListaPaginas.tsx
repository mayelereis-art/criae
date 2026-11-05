"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, PanelsTopLeft } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Cartao, EstadoVazio, Selo, classesBotao } from "@/components/ui";
import { mensagemErro } from "@/lib/firebase/erros";
import { formatarPreco } from "@/lib/formato";
import { ouvirPaginas, type Pagina } from "@/lib/paginas";

export function ListaPaginas() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState<Pagina[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!usuario) return;
    return ouvirPaginas(usuario.uid, setLista, (e) => setErro(mensagemErro(e)));
  }, [usuario]);

  if (erro) return <p className="text-sm text-erro" role="alert">{erro}</p>;
  if (!lista) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (!lista.length)
    return (
      <EstadoVazio icone={PanelsTopLeft} titulo="Nenhuma página" texto="Defina o preço de um produto para gerar a página de vendas.">
        <Link href="/produtos" className={classesBotao()}>Ver meus produtos</Link>
      </EstadoVazio>
    );

  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {lista.map((p) => (
        <li key={p.slug}>
          <Cartao className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold">{p.conteudo.tituloLivro}</span>
                <Selo tom={p.publicada ? "verde" : "neutro"}>{p.publicada ? "Publicada" : "Rascunho"}</Selo>
              </div>
              <p className="mt-1 text-xs text-suave">/p/{p.slug} · {formatarPreco(p.oferta.precoCentavos)}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {p.publicada && <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className={classesBotao("fantasma")}>Abrir <ExternalLink size={14} /></a>}
              <Link href={`/divulgacao?produto=${p.produtoId}`} className={classesBotao("fantasma")}>Divulgar</Link>
              <Link href={`/produtos/${p.produtoId}/pagina`} className={classesBotao("secundario")}>Editar</Link>
            </div>
          </Cartao>
        </li>
      ))}
    </ul>
  );
}
