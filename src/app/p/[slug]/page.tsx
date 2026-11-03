import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaVenda } from "@/components/PaginaVenda";
import { lerPaginaPublicada } from "@/lib/paginas-publicas";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await lerPaginaPublicada((await params).slug);
  if (!p) return { title: "Página não encontrada", robots: { index: false } };
  const imagens = p.seo.imagemUrl ? [{ url: p.seo.imagemUrl }] : undefined;
  return {
    title: { absolute: p.seo.titulo },
    description: p.seo.descricao,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { type: "website", locale: "pt_BR", title: p.seo.titulo, description: p.seo.descricao, images: imagens },
    twitter: { card: imagens ? "summary_large_image" : "summary", title: p.seo.titulo, description: p.seo.descricao, images: p.seo.imagemUrl ? [p.seo.imagemUrl] : undefined },
  };
}

export default async function PaginaPublica({ params }: Props) {
  const p = await lerPaginaPublicada((await params).slug);
  if (!p) notFound();
  return (
    <PaginaVenda
      p={{ modelo: p.modelo, cores: p.cores, fontes: p.fontes, conteudo: p.conteudo, secoes: p.secoes, oferta: p.oferta, capa: p.capa, capaUrl: p.capaUrl, checkoutAtivo: p.checkoutAtivo }}
    />
  );
}
