import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Checkouts" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/checkouts"
      descricao="Ofertas, cupons e formas de pagamento de cada produto."
      recursos={["Pix e cartão pelo Mercado Pago","Cupons, descontos, order bump e upsell","Aprovação só por webhook autenticado do gateway"]}
      vazio={{ titulo: "Nenhum checkout", texto: "Conecte sua conta Mercado Pago em Integrações para começar a vender." }}
    />
  );
}
