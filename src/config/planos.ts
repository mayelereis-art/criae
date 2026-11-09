// Valores iniciais. O administrador muda tudo no painel: o que está salvo no banco vale mais que isto.

export type Plano = {
  id: string; nome: string; descricao: string;
  /** mensal = cobrança recorrente; vitalicio = pagamento único, com créditos renovados todo mês. */
  tipo: "mensal" | "vitalicio";
  precoCentavos: number; creditosMes: number;
  /** Quantos produtos podem ser criados com IA. */
  maxProdutos: number;
  /** Dias em que a conta continua usando a IA depois de uma cobrança falhar. */
  diasTolerancia: number;
  ativo: boolean; ordem: number;
};

export const PLANOS_PADRAO: Plano[] = [
  { id: "mensal", nome: "Mensal", descricao: "Cobrança todo mês, com mais créditos para criar.", tipo: "mensal", precoCentavos: 14700, creditosMes: 1000, maxProdutos: 50, diasTolerancia: 3, ativo: true, ordem: 1 },
  { id: "vitalicio", nome: "Vitalício", descricao: "Pagamento único, sem mensalidade.", tipo: "vitalicio", precoCentavos: 28700, creditosMes: 300, maxProdutos: 50, diasTolerancia: 0, ativo: true, ordem: 2 },
];

// Um crédito vale cerca de US$ 0,01 de IA, pelo custo medido em 05/11/2026.
export const OPERACOES = {
  sugerir_configuracao: { nome: "Preencher configuração com IA", custo: 1 },
  pesquisa_nicho: { nome: "Pesquisa de nicho", custo: 4 },
  planejamento: { nome: "Planejamento do e-book", custo: 5 },
  capitulo: { nome: "Escrever ou refazer um capítulo", custo: 18 },
  capitulo_aprofundado: { nome: "Capítulo aprofundado", custo: 32 },
  imagem_capa: { nome: "Capa em alta qualidade", custo: 17 },
  imagem: { nome: "Imagem de capítulo (opcional)", custo: 4 },
  preco: { nome: "Sugestão de preço", custo: 1 },
  texto_pagina: { nome: "Textos da página de vendas", custo: 4 },
  campanha: { nome: "Campanha de divulgação", custo: 23 },
  comunidades: { nome: "Grupos e comunidades do nicho", custo: 3 },
  criativos: { nome: "Conceitos de um pacote de criativos", custo: 3 },
  arte_criativo: { nome: "Arte de um criativo", custo: 5 },
} as const;
export type Operacao = keyof typeof OPERACOES;

export const custosPadrao = () => Object.fromEntries(Object.entries(OPERACOES).map(([k, v]) => [k, v.custo])) as Record<Operacao, number>;

/** Créditos de quem criou a conta e ainda não assinou. Uma vez só. */
/** Sem plano pago não há acesso, então ninguém começa com créditos grátis. */
export const CREDITOS_INICIAIS_PADRAO = 0;
/** Abaixo desta fração do plano, o painel avisa. */
export const FRACAO_AVISO = 0.2;

export type StatusAssinatura = "pendente" | "ativa" | "inadimplente" | "cancelada";
export const ROTULO_ASSINATURA: Record<StatusAssinatura, string> = { pendente: "Aguardando pagamento", ativa: "Ativa", inadimplente: "Pagamento pendente", cancelada: "Cancelada" };

export const ROTULO_MOVIMENTO: Record<string, string> = {
  debito: "Uso de IA", estorno: "Devolução por falha", inicial: "Créditos iniciais", renovacao: "Créditos do plano", ajuste: "Ajuste do administrador",
};
