import { CabecalhoPagina } from "@/components/ui";
import { ExportarPdf } from "./ExportarPdf";

export const metadata = { title: "PDF do e-book" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CabecalhoPagina titulo="PDF do e-book" descricao="Pré-visualize o material diagramado, confira a verificação automática e baixe o PDF." />
      <ExportarPdf produtoId={id} />
    </>
  );
}
