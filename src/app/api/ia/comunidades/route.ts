import { z } from "zod";
import { gerarEstruturado } from "@/lib/ia/claude";
import { comunidadesSchema, planejamentoSchema } from "@/lib/ia/esquemas";
import { SISTEMA_DIVULGACAO, pedidoCampanha } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";

export const maxDuration = 120;

const entrada = z.object({
  configuracao: configuracaoProdutoSchema,
  planejamento: planejamentoSchema,
  oferta: z.object({ precoCentavos: z.number().int().min(500).max(500_000), garantiaDias: z.number().int().min(7).max(90) }),
});

/** Grupos e comunidades do nicho, para campanhas geradas antes dessa parte existir. */
export function POST(req: Request) {
  return rotaIA(req, "comunidades", entrada, async ({ configuracao, planejamento, oferta }) => {
    const { dados } = await gerarEstruturado({
      modelo: "medio", schema: comunidadesSchema, sistema: SISTEMA_DIVULGACAO,
      pedido: pedidoCampanha("comunidades", configuracao, planejamento, oferta), esforco: "low", maxTokens: 8000,
    });
    return dados;
  });
}
