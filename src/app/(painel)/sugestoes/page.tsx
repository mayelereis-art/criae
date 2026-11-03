import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Sugestoes" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/sugestoes"
      descricao="Ideias de produtos digitais a partir do seu nicho e do seu público."
      recursos={["Títulos com apelo comercial","Formatos: e-book, guia, checklist, planner","Diferenciais em relação ao que já existe"]}
      vazio={{ titulo: "Sem sugestões ainda", texto: "As sugestões aparecem depois que você escolhe um nicho." }}
    />
  );
}
