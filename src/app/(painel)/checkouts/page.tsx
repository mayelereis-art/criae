import { CabecalhoPagina } from "@/components/ui";
import { ListaCheckouts } from "./ListaCheckouts";

export const metadata = { title: "Checkouts" };

export default function Pagina() {
  return (
    <>
      <CabecalhoPagina titulo="Checkouts" descricao="Como cada produto está sendo vendido: plataforma, preço, oferta e se as vendas estão abertas." />
      <ListaCheckouts />
    </>
  );
}
