import { CabecalhoPagina } from "@/components/ui";
import { PainelAssinatura } from "./PainelAssinatura";

export const metadata = { title: "Assinatura" };

export default function Pagina() {
  return (
    <>
      <CabecalhoPagina titulo="Assinatura" descricao="Seu plano, a próxima cobrança e o histórico de pagamentos." />
      <PainelAssinatura />
    </>
  );
}
