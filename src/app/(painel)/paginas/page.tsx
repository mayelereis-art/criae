import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Paginas" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/paginas"
      descricao="Páginas de vendas geradas para seus produtos."
      recursos={["Três modelos visuais, cores e seções editáveis","Prévia no computador e no celular","URL própria /p/nome-do-produto, SEO e Open Graph","Publicar e despublicar"]}
      vazio={{ titulo: "Nenhuma página", texto: "Defina o preço de um produto para gerar a página de vendas." }}
    />
  );
}
