import { CabecalhoPagina } from "@/components/ui";
import { EditorPreco } from "./EditorPreco";

export const metadata = { title: "Preço e oferta" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CabecalhoPagina titulo="Preço e oferta" descricao="A IA sugere três faixas de preço com justificativa. Você escolhe o valor e monta a oferta." />
      <EditorPreco produtoId={id} />
    </>
  );
}
