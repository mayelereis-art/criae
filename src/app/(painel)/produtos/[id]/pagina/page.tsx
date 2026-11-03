import { CabecalhoPagina } from "@/components/ui";
import { EditorPagina } from "./EditorPagina";

export const metadata = { title: "Página de vendas" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CabecalhoPagina titulo="Página de vendas" descricao="A IA escreve a página a partir do seu produto. Você edita, escolhe o visual e publica." />
      <EditorPagina produtoId={id} />
    </>
  );
}
