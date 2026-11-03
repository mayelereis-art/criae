import { CabecalhoPagina } from "@/components/ui";
import { EditorPlanejamento } from "./EditorPlanejamento";

export const metadata = { title: "Planejamento" };

export default async function Planejamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CabecalhoPagina
        titulo="Planejamento do conteúdo"
        descricao="A IA propõe a estrutura. Você edita, reorganiza e aprova antes de o material ser escrito."
      />
      <EditorPlanejamento produtoId={id} />
    </>
  );
}
