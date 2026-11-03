import clsx from "clsx";
import Link from "next/link";
import { Check } from "lucide-react";

export const ETAPAS_FABRICA = [
  { nome: "Configuração", rota: (id: string) => `/criar?id=${id}` },
  { nome: "Planejamento", rota: (id: string) => `/produtos/${id}/planejamento` },
  { nome: "Redação", rota: (id: string) => `/produtos/${id}/conteudo` },
  { nome: "Identidade visual", rota: (id: string) => `/produtos/${id}/identidade` },
  { nome: "Imagens", rota: (id: string) => `/produtos/${id}/imagens` },
  { nome: "PDF", rota: (id: string) => `/produtos/${id}/pdf` },
  { nome: "Preço", rota: (id: string) => `/produtos/${id}/preco` },
  { nome: "Página de vendas", rota: (id: string) => `/produtos/${id}/pagina` },
] as const;

/**
 * Régua das etapas da Fábrica. `concluidas` = produto.etapa.
 * Etapas já liberadas viram link; as que ainda não existem (rota null) ficam apagadas.
 */
export function EtapasProduto({ produtoId, atual, concluidas }: { produtoId?: string; atual: number; concluidas: number }) {
  return (
    <ol className="mb-6 flex gap-1.5 overflow-x-auto pb-1" aria-label="Etapas da criação">
      {ETAPAS_FABRICA.map(({ nome, rota }, i) => {
        const feita = i < concluidas;
        const eAtual = i === atual;
        const liberada = !!produtoId && !!rota && i <= concluidas;
        const conteudo = (
          <>
            <div className={clsx("h-1 rounded-full", feita ? "bg-sucesso" : eAtual ? "bg-primaria" : "bg-superficie-2")} />
            <p className={clsx("mt-2 flex items-center gap-1 text-xs", eAtual ? "font-semibold text-texto" : liberada ? "text-suave" : "text-apagado")}>
              {feita && <Check size={12} className="text-sucesso" />}
              <span className="font-mono">{i + 1}.</span> {nome}
            </p>
          </>
        );
        return (
          <li key={nome} className="min-w-[110px] flex-1">
            {liberada && !eAtual ? (
              <Link href={rota!(produtoId!)} className="block hover:opacity-80">{conteudo}</Link>
            ) : (
              <div aria-current={eAtual ? "step" : undefined}>{conteudo}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
