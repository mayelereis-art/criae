import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Download, XCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { dbAdmin } from "@/lib/firebase/admin";
import { formatarPreco } from "@/lib/formato";
import { MAX_DOWNLOADS, pdfFinal, tokenValido, type ItemPedido } from "@/lib/pedidos/servidor";
import { AcoesPedido, OfertaUpsell } from "./AcoesPedido";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false, follow: false }, referrer: "no-referrer" };

const TEXTOS = {
  pendente: { titulo: "Aguardando a confirmação do pagamento", texto: "Assim que o Mercado Pago confirmar, o produto é liberado aqui e enviado por e-mail. Esta página atualiza sozinha.", Icone: Clock },
  recusado: { titulo: "O pagamento não foi aprovado", texto: "Nada foi cobrado por este pedido. Você pode voltar à página do produto e tentar de novo.", Icone: XCircle },
  cancelado: { titulo: "O pagamento foi cancelado", texto: "Você pode voltar à página do produto e fazer um novo pedido.", Icone: XCircle },
  reembolsado: { titulo: "Pedido reembolsado", texto: "O valor foi devolvido e o acesso ao produto foi encerrado.", Icone: XCircle },
  contestado: { titulo: "Pagamento em contestação", texto: "O acesso ao produto está suspenso enquanto a contestação é analisada.", Icone: XCircle },
} as const;

/** A página não aprova nada: só mostra o que o banco já tem, gravado a partir do aviso autenticado do gateway. */
export default async function Pedido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) notFound();
  const db = dbAdmin();
  const p = (await db.collection("pedidos").doc(id).get()).data();
  if (!p || !tokenValido(t ?? null, p.tokensHash)) notFound();

  const pago = p.status === "pago";
  const itens = p.itens as ItemPedido[];
  let upsell: { titulo: string; chamada: string; precoCentavos: number } | null = null;
  if (pago) {
    const u = (await db.collection("produtos").doc(p.produtoId).get()).data()?.oferta?.upsell;
    if (u && !itens.some((i) => i.produtoId === u.produtoId) && (await pdfFinal(db, p.vendedorId, u.produtoId))) upsell = u;
  }
  const info = pago ? null : TEXTOS[p.status as keyof typeof TEXTOS] ?? TEXTOS.pendente;

  return (
    <div className="fundo-feixes flex min-h-dvh flex-col items-center px-4 py-10">
      <Logo subtitulo={false} />
      <main className="cartao mt-8 w-full max-w-lg p-7">
        {pago ? (
          <>
            <CheckCircle2 size={36} className="text-sucesso" />
            <h1 className="mt-3 font-display text-2xl font-bold">Pagamento confirmado!</h1>
            <p className="mt-1 text-sm text-suave">Obrigado, {p.comprador.nome}. Também enviamos o link para {p.comprador.email}.</p>
            <ul className="mt-5 space-y-2">
              {itens.map((i, n) => (
                <li key={n}>
                  <a href={`/api/download/${id}/${n}?t=${encodeURIComponent(t!)}`} className="flex items-center justify-between gap-3 rounded-xl border border-borda p-3 text-sm font-medium hover:border-borda-forte">
                    <span>{i.titulo}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-primaria-clara"><Download size={16} /> Baixar</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-apagado">Até {MAX_DOWNLOADS} downloads. O arquivo é pessoal e leva seu e-mail nas páginas.</p>
            {upsell && <OfertaUpsell pedidoId={id} token={t!} oferta={upsell} preco={formatarPreco(upsell.precoCentavos)} />}
          </>
        ) : (
          info && (
            <>
              <info.Icone size={36} className={p.status === "pendente" ? "text-alerta" : "text-erro"} />
              <h1 className="mt-3 font-display text-2xl font-bold">{info.titulo}</h1>
              <p className="mt-1 text-sm text-suave">{info.texto}</p>
              {p.status === "pendente" && <AcoesPedido />}
              {["recusado", "cancelado"].includes(p.status) && <a href={`/p/${p.slug}`} className="mt-4 inline-block text-sm font-semibold text-primaria-clara hover:underline">Voltar ao produto</a>}
            </>
          )
        )}
        <p className="mt-6 border-t border-borda pt-4 text-xs text-apagado">Pedido {id} · {formatarPreco(p.totalCentavos)}</p>
      </main>
    </div>
  );
}
