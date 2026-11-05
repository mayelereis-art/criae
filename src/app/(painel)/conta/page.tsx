import { CabecalhoPagina } from "@/components/ui";
import { PainelConta } from "./PainelConta";

export const metadata = { title: "Minha conta" };

export default function Pagina() {
  return (
    <>
      <CabecalhoPagina titulo="Minha conta" descricao="Seus dados de acesso e seus direitos sobre os dados que a Criaê guarda." />
      <PainelConta />
    </>
  );
}
