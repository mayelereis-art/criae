"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Cartao, EstadoVazio, Selo, classesBotao } from "@/components/ui";
import { formatarPreco } from "@/lib/formato";
import { ouvirPaginas, type Pagina } from "@/lib/paginas";
import { NOMES_PLATAFORMA, promoAtiva } from "@/lib/promocao";

export function ListaCheckouts() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState<Pagina[] | null>(null);

  useEffect(() => {
    if (!usuario) return;
    return ouvirPaginas(usuario.uid, setLista, () => setLista([]));
  }, [usuario]);

  if (!lista) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (!lista.length)
    return (
      <EstadoVazio icone={CreditCard} titulo="Nenhum checkout" texto="Defina o preço de um produto e crie a página de vendas para abrir as vendas.">
        <Link href="/produtos" className={classesBotao()}>Ver meus produtos</Link>
      </EstadoVazio>
    );

  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {lista.map((p) => {
        const plataforma = p.venda?.plataforma ?? "mercadopago";
        const aberta = p.publicada && (plataforma === "mercadopago" ? !!p.checkoutAtivo : !!p.venda?.link);
        const oferta = promoAtiva(p.oferta.promo) ? p.oferta.promo! : null;
        return (
          <li key={p.slug}>
            <Cartao className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{p.conteudo.tituloLivro}</span>
                  <Selo tom={aberta ? "verde" : "amarelo"}>{aberta ? "Vendas abertas" : "Vendas fechadas"}</Selo>
                  <Selo tom="azul">{NOMES_PLATAFORMA[plataforma]}</Selo>
                </div>
                <p className="mt-1 text-sm text-suave">
                  {oferta ? <>{formatarPreco(oferta.precoCentavos)} até {new Date(oferta.terminaEm).toLocaleDateString("pt-BR")}, depois {formatarPreco(p.oferta.precoCentavos)}</> : formatarPreco(p.oferta.precoCentavos)}
                  {" · "}garantia de {p.oferta.garantiaDias} dias
                  {p.oferta.orderBump ? " · com order bump" : ""}
                </p>
                {!aberta && <p className="mt-1 text-xs text-alerta">{!p.publicada ? "Publique a página de vendas." : plataforma === "mercadopago" ? "Conecte o Mercado Pago em Integrações e salve uma versão final do PDF." : `Cole o link de checkout da ${NOMES_PLATAFORMA[plataforma]} na página de vendas.`}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={`/produtos/${p.produtoId}/preco`} className={classesBotao("fantasma")}>Preço e cupons</Link>
                <Link href={`/produtos/${p.produtoId}/pagina`} className={classesBotao("secundario")}>Como receber</Link>
              </div>
            </Cartao>
          </li>
        );
      })}
    </ul>
  );
}
