import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Publico" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/publico"
      descricao="Perfil do comprador ideal: quem é, o que sente, o que deseja."
      recursos={["Dores, desejos e objeções do público","Linguagem e canais onde ele está","Perfil reaproveitado na página de vendas e nos criativos"]}
      vazio={{ titulo: "Nenhum público definido", texto: "Gere um perfil a partir de um nicho ou de uma oportunidade salva." }}
    />
  );
}
