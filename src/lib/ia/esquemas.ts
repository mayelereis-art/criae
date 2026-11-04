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

// Etapa 6: central de divulgação e criativos.
// A campanha é gerada por partes: um schema só seria grande demais para a saída estruturada.
export const estrategiaSchema = z.object({
  posicionamento: z.string(),
  mensagemCentral: z.string(),
  angulos: z.array(z.string()).describe("3 a 5 ângulos de comunicação"),
  canaisPrioritarios: z.array(z.object({ canal: z.string(), motivo: z.string() })).describe("2 a 4 canais em ordem de prioridade"),
  objecoes: z.array(z.object({ objecao: z.string(), resposta: z.string() })).describe("3 a 4 objeções do público"),
});
export const instagramSchema = z.object({
  posts: z.array(z.object({ ideia: z.string(), legenda: z.string(), hashtags: z.array(z.string()) })).describe("3 posts"),
  carrosseis: z.array(z.object({ titulo: z.string(), slides: z.array(z.object({ titulo: z.string(), texto: z.string() })), legenda: z.string() })).describe("2 carrosséis de 5 a 7 slides"),
  stories: z.array(z.object({ tema: z.string(), telas: z.array(z.string()), chamada: z.string() })).describe("2 sequências de 3 a 5 telas"),
  chamadas: z.array(z.string()).describe("4 chamadas comerciais curtas"),
});
export const tiktokSchema = z.object({
  roteiros: z.array(z.object({
    titulo: z.string(), gancho: z.string(),
    cenas: z.array(z.object({ tempo: z.string().describe("Ex.: 0-3s"), fala: z.string(), naTela: z.string() })),
    cta: z.string(), textoPublicacao: z.string(),
  })).describe("3 roteiros de 20 a 45 segundos"),
  ideias: z.array(z.string()).describe("5 ideias de conteúdo"),
  ganchos: z.array(z.string()).describe("6 ganchos de abertura"),
});
export const canaisDiretosSchema = z.object({
  facebook: z.object({
    anuncios: z.array(z.object({ titulo: z.string(), texto: z.string() })).describe("2 anúncios"),
    textos: z.array(z.string()).describe("3 textos comerciais para publicação"),
  }),
  whatsapp: z.object({
    divulgacao: z.array(z.string()).describe("2 mensagens"),
    apresentacao: z.array(z.string()).describe("2 mensagens"),
    grupos: z.array(z.string()).describe("2 mensagens"),
    lancamento: z.array(z.string()).describe("2 mensagens"),
  }),
  anuncios: z.array(z.object({ headline: z.string(), textoPrincipal: z.string(), descricao: z.string(), cta: z.string() })).describe("4 variações"),
});
export const calendarioSchema = z.object({
  calendario: z.array(z.object({
    dia: z.number().int().describe("Dia da campanha, começando em 1"),
    canal: z.enum(["Instagram", "TikTok", "Facebook", "WhatsApp", "Anúncios"]),
    formato: z.string(), tema: z.string(), orientacao: z.string(),
  })).describe("14 dias de publicações, de 1 a 2 por dia"),
});

export const campanhaSchema = z.object({
  estrategia: estrategiaSchema,
  instagram: instagramSchema,
  tiktok: tiktokSchema,
  facebook: canaisDiretosSchema.shape.facebook,
  whatsapp: canaisDiretosSchema.shape.whatsapp,
  anuncios: canaisDiretosSchema.shape.anuncios,
  calendario: calendarioSchema.shape.calendario,
});

export const pacoteCriativosSchema = z.object({
  criativos: z.array(z.object({
    formato: z.enum(["quadrado", "retrato", "story"]),
    plataforma: z.string().describe("Plataforma recomendada. Ex.: Instagram Feed, Facebook Ads, Stories"),
    angulo: z.string(),
    titulo: z.string().describe("Frase principal na arte, até 60 caracteres"),
    apoio: z.string().describe("Frase de apoio na arte, até 90 caracteres"),
    textoPrincipal: z.string().describe("Texto principal do anúncio ou publicação"),
    legenda: z.string().describe("Legenda pronta, pode usar [LINK]"),
    cta: z.string().describe("Texto do botão na arte, até 24 caracteres"),
    usarMockup: z.boolean().describe("true quando mostrar o e-book ajuda a peça"),
    promptArte: z.string().describe("Prompt em inglês para a arte de fundo, sem nenhum texto na imagem"),
  })),
});

export type Campanha = z.infer<typeof campanhaSchema>;
export type ConceitoCriativo = z.infer<typeof pacoteCriativosSchema>["criativos"][number];
