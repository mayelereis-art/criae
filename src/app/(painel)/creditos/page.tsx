import { CabecalhoPagina } from "@/components/ui";
import { PainelCreditos } from "./PainelCreditos";

export const metadata = { title: "Créditos e consumo" };

export default function Pagina() {
  return (
    <>
      <CabecalhoPagina titulo="Créditos e consumo" descricao="Quanto você tem, quanto custa cada ação e tudo o que já foi usado." />
      <PainelCreditos />
    </>
  );
}
