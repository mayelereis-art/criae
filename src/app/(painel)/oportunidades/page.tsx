import Link from "next/link";
import { Compass } from "lucide-react";
import { CabecalhoPagina, classesBotao } from "@/components/ui";
import { ListaOportunidades } from "./ListaOportunidades";

export const metadata = { title: "Oportunidades" };

export default function Oportunidades() {
  return (
    <>
      <CabecalhoPagina
        titulo="Oportunidades"
        descricao="Ideias de produto que a IA encontrou e você salvou."
        acoes={<Link href="/nichos" className={classesBotao("secundario")}><Compass size={16} /> Explorar nichos</Link>}
      />
      <ListaOportunidades />
    </>
  );
}
