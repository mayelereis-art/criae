import Link from "next/link";
import { CabecalhoPagina, classesBotao } from "@/components/ui";
import { ListaOportunidades } from "../oportunidades/ListaOportunidades";

export const metadata = { title: "Sugestões de produtos" };

export default function Pagina() {
  return (
    <>
      <CabecalhoPagina
        titulo="Sugestões de produtos"
        descricao="As ideias que a IA sugeriu e você salvou. Escolha uma para começar a criar."
        acoes={<Link href="/nichos" className={classesBotao("secundario")}>Pedir novas sugestões</Link>}
      />
      <ListaOportunidades />
    </>
  );
}
