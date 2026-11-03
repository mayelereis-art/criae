import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Assinatura" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/assinatura"
      descricao="Seu plano na Criaê."
      recursos={["Planos Mensal, Pro e Premium","Histórico de pagamentos, renovação e cancelamento","Bloqueio de criação em caso de inadimplência"]}
      vazio={{ titulo: "Sem assinatura", texto: "Os planos e o pagamento da assinatura são ligados ao Mercado Pago." }}
    />
  );
}
