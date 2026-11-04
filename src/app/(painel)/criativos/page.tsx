import { CabecalhoPagina } from "@/components/ui";
import { GaleriaCriativos } from "./GaleriaCriativos";

export const metadata = { title: "Criativos" };

export default async function Pagina({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  const { produto } = await searchParams;
  return (
    <>
      <CabecalhoPagina titulo="Criativos" descricao="Imagens publicitárias nos formatos 1080×1080, 1080×1350 e 1080×1920, com a identidade visual do produto." />
      <GaleriaCriativos produtoId={produto} />
    </>
  );
}
