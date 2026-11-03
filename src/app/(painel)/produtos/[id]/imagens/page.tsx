import { CabecalhoPagina } from "@/components/ui";
import { GeradorImagens } from "./GeradorImagens";

export const metadata = { title: "Imagens" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CabecalhoPagina titulo="Imagens" descricao="A IA cria a arte da capa e das aberturas de capítulo a partir do conteúdo. Você pode refazer cada uma." />
      <GeradorImagens produtoId={id} />
    </>
  );
}
