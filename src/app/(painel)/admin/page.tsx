import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/ui";
import { adminAtual } from "@/lib/admin";
import { PainelAdmin } from "./PainelAdmin";

export const metadata = { title: "Administração" };

export default async function Pagina() {
  if (!(await adminAtual())) redirect("/visao-geral");
  return (
    <>
      <CabecalhoPagina titulo="Administração" descricao="Usuários, planos, créditos e consumo da plataforma, com dados reais do banco." />
      <PainelAdmin />
    </>
  );
}
