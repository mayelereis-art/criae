import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Vendas" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/vendas"
      descricao="Pedidos, pagamentos e entregas dos seus produtos."
      recursos={["Pedidos com status e forma de pagamento","Link de download seguro enviado por e-mail","Reembolsos revogam o acesso automaticamente"]}
      vazio={{ titulo: "Nenhuma venda", texto: "As vendas confirmadas pelo gateway aparecem aqui." }}
    />
  );
}
