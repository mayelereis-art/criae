import type { Oportunidade } from "./ia/esquemas";
import { criarProduto } from "./produtos";
import { CONFIGURACAO_VAZIA } from "./validacao/produto";

/** Leva uma oportunidade da pesquisa de nicho direto para a configuração do produto. */
export function criarProdutoDeOportunidade(donoId: string, nicho: string, o: Oportunidade) {
  return criarProduto(donoId, {
    ...CONFIGURACAO_VAZIA,
    nicho: nicho.slice(0, 80),
    subnicho: o.subnicho.slice(0, 80),
    tema: o.nome.slice(0, 140),
    tituloProvisorio: o.tituloSugerido.slice(0, 120),
    publicoAlvo: o.publicoAlvo.slice(0, 400),
    problema: o.problema.slice(0, 500),
    transformacao: o.transformacao.slice(0, 400),
  });
}
