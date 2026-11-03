import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Ajuda" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/ajuda"
      descricao="Dúvidas frequentes e contato com o suporte."
      recursos={["Guias passo a passo de cada etapa","Termos de uso e política de privacidade","Canal de suporte"]}
      vazio={{ titulo: "Central de ajuda em preparação", texto: "Os guias são escritos quando cada módulo estiver funcionando." }}
    />
  );
}
