import type { Oportunidade } from "./ia/esquemas";
import { criarProduto } from "./produtos";
import { CONFIGURACAO_VAZIA, LIMITES, encurtar } from "./validacao/produto";

/** Leva uma oportunidade da pesquisa de nicho direto para a configuração do produto. */
export function criarProdutoDeOportunidade(donoId: string, nicho: string, o: Oportunidade) {
  return criarProduto(donoId, {
    ...CONFIGURACAO_VAZIA,
    nicho: encurtar(nicho, LIMITES.nicho),
    subnicho: encurtar(o.subnicho, LIMITES.subnicho),
    tema: encurtar(o.nome, LIMITES.tema),
    tituloProvisorio: encurtar(o.tituloSugerido, LIMITES.tituloProvisorio),
    publicoAlvo: encurtar(o.publicoAlvo, LIMITES.publicoAlvo),
    problema: encurtar(o.problema, LIMITES.problema),
    transformacao: encurtar(o.transformacao, LIMITES.transformacao),
  });
}
