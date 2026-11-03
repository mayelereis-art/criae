import { z } from "zod";

// Schemas das saídas da IA. Sem min/max aqui: restrições de tamanho são conferidas depois, no domínio.

export const oportunidadeSchema = z.object({
  nome: z.string(),
  subnicho: z.string(),
  publicoAlvo: z.string(),
  problema: z.string(),
  transformacao: z.string(),
  formato: z.string().describe("Ex.: e-book, guia prático, checklist, planner"),
  justificativa: z.string().describe("Por que pode vender, sem inventar números de mercado"),
  tituloSugerido: z.string(),
  precoSugeridoCentavos: z.number().int(),
});

export const pesquisaNichoSchema = z.object({
  subnichos: z.array(z.string()),
  problemas: z.array(z.string()),
  desejos: z.array(z.string()),
  compradorIdeal: z.string(),
  temas: z.array(z.string()),
  diferenciais: z.array(z.string()),
  titulos: z.array(z.string()),
  monetizacao: z.array(z.string()),
  oportunidades: z.array(oportunidadeSchema),
  temaSensivel: z.boolean(),
});

export const sugestaoConfiguracaoSchema = z.object({
  nicho: z.string(),
  subnicho: z.string(),
  tema: z.string(),
  tituloProvisorio: z.string(),
  publicoAlvo: z.string(),
  nivelPublico: z.enum(["Iniciante", "Intermediário", "Avançado"]),
  problema: z.string(),
  objetivo: z.string(),
  transformacao: z.string(),
  tom: z.enum(["Acolhedor", "Direto e prático", "Inspirador", "Técnico", "Descontraído", "Profissional"]),
  profundidade: z.enum(["essencial", "completo", "aprofundado"]),
});

export const capituloPlanoSchema = z.object({
  titulo: z.string(),
  objetivo: z.string(),
  topicos: z.array(z.string()),
  exemplos: z.array(z.string()),
  exercicio: z.string().describe("Exercício ou material complementar; vazio se não fizer sentido"),
});

export const planejamentoSchema = z.object({
  tituloComercial: z.string(),
  subtitulo: z.string(),
  propostaValor: z.string(),
  introducao: z.string().describe("O que a introdução vai cobrir, em 2 ou 3 frases"),
  capitulos: z.array(capituloPlanoSchema),
  conclusao: z.string().describe("O que a conclusão vai cobrir"),
  bonus: z.array(z.string()),
  avisoTemaSensivel: z.string().describe("Aviso de limitação para temas de saúde, finanças ou jurídico; vazio se não se aplica"),
});

export const capituloRedigidoSchema = z.object({
  conteudo: z.string().describe("Capítulo completo em Markdown, começando por ## e o título"),
  resumo: z.string().describe("Resumo de 3 a 5 frases para manter a continuidade dos próximos capítulos"),
});

export const revisaoSchema = z.object({
  problemas: z.array(
    z.object({
      tipo: z.enum(["contradicao", "gramatica", "inconsistencia", "repeticao", "incompleto", "continuidade", "afirmacao_sem_base"]),
      descricao: z.string(),
    }),
  ),
  conteudoRevisado: z.string().describe("Capítulo inteiro com as correções aplicadas, em Markdown"),
});

export type PesquisaNicho = z.infer<typeof pesquisaNichoSchema>;
export type Oportunidade = z.infer<typeof oportunidadeSchema>;
export type Planejamento = z.infer<typeof planejamentoSchema>;
export type CapituloPlano = z.infer<typeof capituloPlanoSchema>;
export type Revisao = z.infer<typeof revisaoSchema>;

export const promptImagemSchema = z.object({
  prompt: z.string().describe("Prompt em inglês para o gerador de imagens, 60 a 120 palavras"),
});

const faixaPrecoSchema = z.object({
  precoCentavos: z.number().int(),
  justificativa: z.string().describe("Por que este preço faz sentido, sem inventar dados de mercado"),
});

export const sugestaoPrecoSchema = z.object({
  entrada: faixaPrecoSchema,
  recomendado: faixaPrecoSchema,
  premium: faixaPrecoSchema,
  observacao: z.string().describe("Uma dica curta sobre posicionamento ou teste de preço"),
});

export const textoPaginaSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  problema: z.string().describe("2 a 3 parágrafos curtos sobre a dor do público, separados por linha em branco"),
  paraQuem: z.array(z.string()).describe("4 a 6 perfis de quem deve comprar"),
  naoEParaQuem: z.array(z.string()).describe("2 a 3 perfis de quem NÃO deve comprar, para alinhar expectativas"),
  beneficios: z.array(z.object({ titulo: z.string(), texto: z.string() })).describe("4 a 6 benefícios concretos"),
  oQueVoceRecebe: z.array(z.string()).describe("Itens que realmente existem no produto"),
  sobreOProduto: z.string(),
  faq: z.array(z.object({ pergunta: z.string(), resposta: z.string() })).describe("5 a 7 perguntas frequentes"),
  chamadaCompra: z.string().describe("Texto curto do botão de compra"),
  seoTitulo: z.string().describe("Até 60 caracteres"),
  seoDescricao: z.string().describe("Até 155 caracteres"),
});

export type SugestaoPreco = z.infer<typeof sugestaoPrecoSchema>;
export type TextoPagina = z.infer<typeof textoPaginaSchema>;
