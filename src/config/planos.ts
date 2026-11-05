// Valores iniciais. O administrador muda tudo no painel: o que está salvo no banco vale mais que isto.

export type Plano = {
  id: string; nome: string; descricao: string; precoCentavos: number; creditosMes: number;
  /** Quantos produtos podem ser criados com IA. */
  maxProdutos: number;
  /** Dias em que a conta continua usando a IA depois de uma cobrança falhar. */
  diasTolerancia: number;
  ativo: boolean; ordem: number;
};

export const PLANOS_PADRAO: Plano[] = [
  { id: "mensal", nome: "Mensal", descricao: "Para criar e vender seus primeiros produtos.", precoCentavos: 4990, creditosMes: 300, maxProdutos: 5, diasTolerancia: 3, ativo: true, ordem: 1 },
  { id: "pro", nome: "Pro", descricao: "Para quem lança com frequência.", precoCentavos: 8990, creditosMes: 800, maxProdutos: 20, diasTolerancia: 3, ativo: true, ordem: 2 },
  { id: "premium", nome: "Premium", descricao: "Para operar vários produtos e nichos.", precoCentavos: 14990, creditosMes: 2000, maxProdutos: 100, diasTolerancia: 3, ativo: true, ordem: 3 },
];

export const OPERACOES = {
  sugerir_configuracao: { nome: "Preencher configuração com IA", custo: 1 },
  pesquisa_nicho: { nome: "Pesquisa de nicho", custo: 3 },
  planejamento: { nome: "Planejamento do e-book", custo: 5 },
  capitulo: { nome: "Escrever ou refazer um capítulo", custo: 8 },
  imagem: { nome: "Imagem de capa ou capítulo", custo: 4 },
  preco: { nome: "Sugestão de preço", custo: 1 },
  texto_pagina: { nome: "Textos da página de vendas", custo: 3 },
  campanha: { nome: "Campanha de divulgação", custo: 10 },
  criativos: { nome: "Conceitos de um pacote de criativos", custo: 3 },
  arte_criativo: { nome: "Arte de um criativo", custo: 4 },
} as const;
export type Operacao = keyof typeof OPERACOES;

export const custosPadrao = () => Object.fromEntries(Object.entries(OPERACOES).map(([k, v]) => [k, v.custo])) as Record<Operacao, number>;

/** Créditos de quem criou a conta e ainda não assinou. Uma vez só. */
export const CREDITOS_INICIAIS_PADRAO = 30;
/** Abaixo desta fração do plano, o painel avisa. */
export const FRACAO_AVISO = 0.2;

export type StatusAssinatura = "pendente" | "ativa" | "inadimplente" | "cancelada";
export const ROTULO_ASSINATURA: Record<StatusAssinatura, string> = { pendente: "Aguardando pagamento", ativa: "Ativa", inadimplente: "Pagamento pendente", cancelada: "Cancelada" };

export const ROTULO_MOVIMENTO: Record<string, string> = {
  debito: "Uso de IA", estorno: "Devolução por falha", inicial: "Créditos iniciais", renovacao: "Renovação do plano", ajuste: "Ajuste do administrador",
};
