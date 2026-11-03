import { CabecalhoPagina } from "@/components/ui";
import { AssistenteCriacao } from "./AssistenteCriacao";

export const metadata = { title: "Criar com IA" };

export default async function Criar({ searchParams }: { searchParams: Promise<{ nicho?: string; id?: string }> }) {
  const { nicho, id } = await searchParams;
  return (
    <>
      <CabecalhoPagina
        titulo="Criar produto com IA"
        descricao="Um passo de cada vez. Você aprova o planejamento antes de a IA escrever o material completo."
      />
      <AssistenteCriacao nichoInicial={nicho?.slice(0, 80)} produtoId={id} />
    </>
  );
}
