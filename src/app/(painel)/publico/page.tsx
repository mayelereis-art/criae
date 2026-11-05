import { CabecalhoPagina } from "@/components/ui";
import { PublicosProdutos } from "./PublicosProdutos";

export const metadata = { title: "Público-alvo" };

export default function Pagina() {
  return (
    <>
      <CabecalhoPagina titulo="Público-alvo" descricao="Para quem é cada produto: o problema, o objetivo e a transformação que orientam os textos." />
      <PublicosProdutos />
    </>
  );
}
