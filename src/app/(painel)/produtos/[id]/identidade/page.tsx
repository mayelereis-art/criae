import { CabecalhoPagina } from "@/components/ui";
import { EditorIdentidade } from "./EditorIdentidade";

export const metadata = { title: "Identidade visual" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CabecalhoPagina titulo="Identidade visual" descricao="Escolha um estilo e ajuste cores, fontes e capa. A prévia mostra como o e-book vai ficar." />
      <EditorIdentidade produtoId={id} />
    </>
  );
}
