import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Creditos" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/creditos"
      descricao="Quanto da sua cota de IA você já usou."
      recursos={["Saldo de créditos do mês","Custo de cada operação (texto, imagem, capítulo)","Histórico de consumo e avisos de limite"]}
      vazio={{ titulo: "Sem consumo registrado", texto: "Cada geração com IA debita créditos e aparece neste histórico." }}
    />
  );
}
