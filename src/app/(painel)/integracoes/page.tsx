import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Integracoes" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/integracoes"
      descricao="Contas conectadas para vender e divulgar."
      recursos={["Mercado Pago (receber pelas vendas na sua própria conta)","E-mail de entrega ao comprador","Domínio próprio para as páginas"]}
      vazio={{ titulo: "Nenhuma integração", texto: "A conexão com o Mercado Pago entra com o módulo de checkout." }}
    />
  );
}
