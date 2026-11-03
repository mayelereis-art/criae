import { CabecalhoPagina } from "@/components/ui";
import { ListaVendas } from "./ListaVendas";

export const metadata = { title: "Minhas vendas" };

export default function Vendas() {
  return (
    <>
      <CabecalhoPagina titulo="Minhas vendas" descricao="Pedidos, pagamentos e entregas dos seus produtos." />
      <ListaVendas />
    </>
  );
}
