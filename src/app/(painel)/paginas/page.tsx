import { CabecalhoPagina } from "@/components/ui";
import { ListaPaginas } from "./ListaPaginas";

export const metadata = { title: "Páginas de vendas" };

export default function Paginas() {
  return (
    <>
      <CabecalhoPagina titulo="Páginas de vendas" descricao="As páginas geradas para os seus produtos." />
      <ListaPaginas />
    </>
  );
}
