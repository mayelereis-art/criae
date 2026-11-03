import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Oportunidades" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/oportunidades"
      descricao="Oportunidades de produto que a IA encontrou e você salvou."
      recursos={["Nome, público, problema e transformação de cada oportunidade","Formato recomendado e preço inicial sugerido","Enviar direto para a criação do produto"]}
      vazio={{ titulo: "Nenhuma oportunidade salva", texto: "Explore um nicho e salve as ideias que fizerem sentido para você." }}
    />
  );
}
