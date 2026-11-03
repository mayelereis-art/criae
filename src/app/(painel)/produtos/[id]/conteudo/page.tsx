import { CabecalhoPagina } from "@/components/ui";
import { RedacaoConteudo } from "./RedacaoConteudo";

export const metadata = { title: "Redação" };

export default async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CabecalhoPagina
        titulo="Redação do material"
        descricao="A IA escreve um capítulo por vez e revisa cada um antes de salvar. Você pode ler, editar e reescrever qualquer capítulo."
      />
      <RedacaoConteudo produtoId={id} />
    </>
  );
}
