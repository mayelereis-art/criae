import { CabecalhoPagina } from "@/components/ui";
import { CentralDivulgacao } from "./CentralDivulgacao";

export const metadata = { title: "Central de divulgação" };

export default async function Pagina({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  const { produto } = await searchParams;
  return (
    <>
      <CabecalhoPagina titulo="Central de divulgação" descricao="Estratégia, textos para cada canal e calendário de publicações, escritos a partir do seu produto." />
      <CentralDivulgacao produtoId={produto} />
    </>
  );
}
