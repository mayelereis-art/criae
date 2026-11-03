"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { excluirProduto, ouvirProdutos, type Produto, type StatusProduto } from "@/lib/produtos";
import { mensagemErro } from "@/lib/firebase/erros";
import { ETAPAS_FABRICA } from "@/components/EtapasProduto";
import { Botao, Cartao, EstadoVazio, Selo, classesBotao } from "@/components/ui";

const STATUS: Record<StatusProduto, { rotulo: string; tom: "neutro" | "azul" | "verde" }> = {
  rascunho: { rotulo: "Rascunho", tom: "neutro" },
  em_edicao: { rotulo: "Em edição", tom: "azul" },
  publicado: { rotulo: "Publicado", tom: "verde" },
};

const ETAPAS = ETAPAS_FABRICA.map((e) => e.nome);
/** Abre a etapa mais adiantada que já existe na plataforma. */
const rotaContinuar = (p: Produto) => {
  const disponiveis = ETAPAS_FABRICA.slice(0, p.etapa + 1).filter((e) => e.rota);
  return disponiveis[disponiveis.length - 1].rota!(p.id);
};

export function useProdutos() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (!usuario) return;
    return ouvirProdutos(usuario.uid, setLista, (e) => setErro(mensagemErro(e)));
  }, [usuario]);
  return { lista, erro };
}

export function ListaProdutos() {
  const { lista, erro } = useProdutos();
  const [excluindo, setExcluindo] = useState<string | null>(null);

  if (erro) return <p className="text-sm text-erro" role="alert">{erro}</p>;
  if (!lista) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando produtos...</p>;
  if (!lista.length)
    return (
      <EstadoVazio icone={Package} titulo="Nenhum produto ainda" texto="Comece pela configuração: tema, público e problema que o material resolve.">
        <Link href="/criar" className={classesBotao()}><Plus size={16} /> Criar o primeiro produto</Link>
      </EstadoVazio>
    );

  const excluir = async (p: Produto) => {
    if (!confirm(`Excluir "${p.titulo}"? Isso não pode ser desfeito.`)) return;
    setExcluindo(p.id);
    await excluirProduto(p.donoId, p.id).catch((e) => alert(mensagemErro(e)));
    setExcluindo(null);
  };

  return (
    <ul className="grid gap-3">
      {lista.map((p) => (
        <li key={p.id}>
          <Cartao className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={rotaContinuar(p)} className="truncate font-semibold hover:text-primaria-clara">{p.titulo}</Link>
                <Selo tom={STATUS[p.status].tom}>{STATUS[p.status].rotulo}</Selo>
              </div>
              <p className="mt-1 text-xs text-suave">
                {p.configuracao.nicho} · próxima etapa: {ETAPAS[Math.min(p.etapa, ETAPAS.length - 1)]}
                {p.atualizadoEm && ` · atualizado em ${p.atualizadoEm.toDate().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href={rotaContinuar(p)} className={classesBotao("secundario")}>Continuar</Link>
              {p.status !== "publicado" && (
                <Botao variante="fantasma" onClick={() => excluir(p)} disabled={excluindo === p.id} aria-label={`Excluir ${p.titulo}`}>
                  <Trash2 size={16} />
                </Botao>
              )}
            </div>
          </Cartao>
        </li>
      ))}
    </ul>
  );
}
