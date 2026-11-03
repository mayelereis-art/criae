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
