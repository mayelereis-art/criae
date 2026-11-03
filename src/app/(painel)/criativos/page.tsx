import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Criativos" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/criativos"
      descricao="Imagens publicitárias com a identidade visual do produto."
      recursos={["Formatos 1080×1080, 1080×1350 e 1080×1920","Texto sobreposto pelo sistema, sem erro de ortografia","Legenda, CTA e plataforma recomendada em cada peça"]}
      vazio={{ titulo: "Nenhum criativo", texto: "Os criativos são gerados a partir de um produto com capa pronta." }}
    />
  );
}
