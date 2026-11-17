import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MERCADO_PAGO_VENDE_EBOOK } from "@/lib/promocao";
import { lerPaginaPublicada } from "@/lib/paginas-publicas";
import { FormCompra } from "./FormCompra";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function Comprar({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!MERCADO_PAGO_VENDE_EBOOK) redirect(`/p/${slug}`);
  const p = await lerPaginaPublicada(slug);
  if (!p) notFound();
  return (
    <div className="min-h-dvh px-4 py-10" style={{ background: p.cores.fundo, color: p.cores.texto }}>
      <FormCompra
        slug={p.slug}
        titulo={p.conteudo.tituloLivro}
        cores={p.cores}
        aberto={!!p.checkoutAtivo}
        garantiaDias={p.oferta.garantiaDias}
        bump={p.oferta.orderBump ?? null}
      />
    </div>
  );
}
