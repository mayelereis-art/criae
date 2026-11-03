import { CabecalhoPagina } from "@/components/ui";
import { ExploradorNichos } from "./ExploradorNichos";

export const metadata = { title: "Explorar nichos" };

export default function Nichos() {
  return (
    <>
      <CabecalhoPagina
        titulo="Explorar nichos"
        descricao="Escolha uma área ou escreva a sua. A IA sugere subnichos, dores do público, ideias de produto e preço inicial."
      />
      <ExploradorNichos />
    </>
  );
}
