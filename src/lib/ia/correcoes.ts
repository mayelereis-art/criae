export type Correcao = { trecho: string; substituicao: string };

/**
 * Aplica as correções da revisão ao texto original, sem pedir o capítulo inteiro de novo.
 * Trecho que não for encontrado exatamente fica de fora: o texto original nunca se perde.
 */
export function aplicarCorrecoes(texto: string, correcoes: Correcao[]) {
  let resultado = texto;
  let aplicadas = 0;
  for (const { trecho, substituicao } of correcoes) {
    const posicao = trecho ? resultado.indexOf(trecho) : -1;
    if (posicao < 0) continue;
    resultado = resultado.slice(0, posicao) + substituicao + resultado.slice(posicao + trecho.length);
    aplicadas++;
  }
  return { texto: resultado, aplicadas };
}
