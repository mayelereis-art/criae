import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Biblioteca" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/biblioteca"
      descricao="Capas, imagens, PDFs e textos gerados, organizados por produto."
      recursos={["Arquivos por produto e por tipo","Baixar e reaproveitar imagens","Histórico de versões dos PDFs"]}
      vazio={{ titulo: "Biblioteca vazia", texto: "Os materiais gerados pela IA ficam guardados aqui." }}
    />
  );
}
