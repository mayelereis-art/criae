import { Suspense } from "react";
import { CabecalhoPagina } from "@/components/ui";
import { PainelIntegracoes } from "./PainelIntegracoes";

export const metadata = { title: "Integrações" };

export default function Integracoes() {
  return (
    <>
      <CabecalhoPagina titulo="Integrações" descricao="Contas conectadas para receber e entregar suas vendas." />
      <Suspense><PainelIntegracoes /></Suspense>
    </>
  );
}
