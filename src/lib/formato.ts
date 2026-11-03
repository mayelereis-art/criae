const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Dinheiro sempre em centavos no sistema; formata só na tela. */
export const formatarPreco = (centavos: number) => moeda.format(Math.round(centavos) / 100);
