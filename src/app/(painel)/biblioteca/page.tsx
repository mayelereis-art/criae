import { CabecalhoPagina } from "@/components/ui";
import { MinhaBiblioteca } from "./MinhaBiblioteca";

export const metadata = { title: "Biblioteca" };

export default function Pagina() {
  return (
    <>
      <CabecalhoPagina titulo="Biblioteca" descricao="Capas, imagens, criativos e versões de PDF de cada produto." />
      <MinhaBiblioteca />
    </>
  );
}
