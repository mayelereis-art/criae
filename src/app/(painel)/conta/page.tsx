import { TelaPlanejada } from "@/components/TelaPlanejada";

export const metadata = { title: "Conta" };

export default function Pagina() {
  return (
    <TelaPlanejada
      href="/conta"
      descricao="Seus dados de acesso e preferências."
      recursos={["Nome, e-mail e senha","Exportar ou excluir seus dados (LGPD)","Aceite dos termos e da política de privacidade"]}
      vazio={{ titulo: "Conta não conectada", texto: "O cadastro e o login entram com o Firebase Authentication." }}
    />
  );
}
