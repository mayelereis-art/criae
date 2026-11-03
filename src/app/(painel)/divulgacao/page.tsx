import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Divulgacao" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/divulgacao"
      descricao="Estratégia e materiais de divulgação para cada produto."
      recursos={["Posts, carrosséis, stories e legendas para Instagram","Roteiros e ganchos para TikTok","Anúncios e textos para Facebook","Mensagens para WhatsApp e grupos","Calendário de publicações e download em ZIP"]}
      vazio={{ titulo: "Nenhuma campanha", texto: "Escolha um produto publicado para gerar a estratégia de divulgação." }}
    />
  );
}
