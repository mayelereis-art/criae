import { z } from "zod";

const texto = (min: number, max: number, nome: string) =>
  z.string().trim().min(min, `${nome}: escreva pelo menos ${min} caracteres`).max(max, `${nome}: máximo de ${max} caracteres`);

/** Etapa 1 da Fábrica de Produtos. Mesmo schema valida o formulário e, depois, a API. */
export const configuracaoProdutoSchema = z.object({
  nicho: texto(2, 80, "Nicho"),
  subnicho: texto(2, 80, "Subnicho"),
  tema: texto(3, 140, "Tema"),
  tituloProvisorio: texto(3, 120, "Título provisório"),
  publicoAlvo: texto(10, 400, "Público-alvo"),
  nivelPublico: z.enum(["Iniciante", "Intermediário", "Avançado"]),
  problema: texto(10, 500, "Problema"),
  objetivo: texto(5, 300, "Objetivo"),
  transformacao: texto(10, 400, "Transformação"),
  tom: z.enum(["Acolhedor", "Direto e prático", "Inspirador", "Técnico", "Descontraído", "Profissional"]),
  profundidade: z.enum(["essencial", "completo", "aprofundado"]),
});

export type ConfiguracaoProduto = z.infer<typeof configuracaoProdutoSchema>;

export const CONFIGURACAO_VAZIA: ConfiguracaoProduto = {
  nicho: "", subnicho: "", tema: "", tituloProvisorio: "", publicoAlvo: "",
  nivelPublico: "Iniciante", problema: "", objetivo: "", transformacao: "",
  tom: "Acolhedor", profundidade: "completo",
};
