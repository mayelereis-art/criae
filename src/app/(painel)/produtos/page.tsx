import Link from "next/link";
import { Plus } from "lucide-react";
import { CabecalhoPagina, classesBotao } from "@/components/ui";
import { ListaProdutos } from "./ListaProdutos";

export const metadata = { title: "Meus produtos" };

export default function Produtos() {
  return (
    <>
      <CabecalhoPagina
        titulo="Meus produtos"
        descricao="Todos os seus produtos digitais, do rascunho ao publicado."
        acoes={<Link href="/criar" className={classesBotao()}><Plus size={16} /> Novo produto</Link>}
      />
      <ListaProdutos />
    </>
  );
}
