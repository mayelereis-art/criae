import { z } from "zod";
import { gerarEstruturado } from "@/lib/ia/claude";
import { capituloRedigidoSchema, planejamentoSchema, revisaoSchema } from "@/lib/ia/esquemas";
import { SISTEMA_EDITOR, SISTEMA_REVISOR, pedidoCapitulo, pedidoRevisao } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";

export const maxDuration = 600;

const entrada = z
  .object({
    configuracao: configuracaoProdutoSchema,
    planejamento: planejamentoSchema,
    indice: z.number().int().min(0),
    resumosAnteriores: z.array(z.string().max(2000)).max(40),
  })
  .refine((d) => d.indice < d.planejamento.capitulos.length, "Capítulo fora do planejamento.");

/** Redige um capítulo e passa pela revisão antes de devolver. */
export function POST(req: Request) {
  return rotaIA(req, "capitulo", entrada, async ({ configuracao, planejamento, indice, resumosAnteriores }) => {
    const { dados: rascunho } = await gerarEstruturado({
      modelo: "forte",
      schema: capituloRedigidoSchema,
      sistema: SISTEMA_EDITOR,
      pedido: pedidoCapitulo(configuracao, planejamento, indice, resumosAnteriores),
      esforco: "high",
      maxTokens: 64000,
    });
    const { dados: revisao } = await gerarEstruturado({
      modelo: "medio",
      schema: revisaoSchema,
      sistema: SISTEMA_REVISOR,
      pedido: pedidoRevisao(planejamento, indice, rascunho.conteudo, resumosAnteriores),
      esforco: "medium",
      maxTokens: 64000,
    });
    // Revisão que encolhe o texto pela metade é suspeita (corte ou resumo): fica o rascunho.
    const revisaoConfiavel = revisao.conteudoRevisado.length > rascunho.conteudo.length * 0.6;
    return {
      conteudo: revisaoConfiavel ? revisao.conteudoRevisado : rascunho.conteudo,
      resumo: rascunho.resumo,
      problemas: revisao.problemas,
      revisaoAplicada: revisaoConfiavel,
    };
  });
}
