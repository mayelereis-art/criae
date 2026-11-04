import { z } from "zod";
import { gerarEstruturado } from "@/lib/ia/claude";
import { calendarioSchema, canaisDiretosSchema, estrategiaSchema, instagramSchema, planejamentoSchema, tiktokSchema } from "@/lib/ia/esquemas";
import { SISTEMA_DIVULGACAO, pedidoCampanha } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";

export const maxDuration = 300;

const entrada = z.object({
  configuracao: configuracaoProdutoSchema,
  planejamento: planejamentoSchema,
  oferta: z.object({ precoCentavos: z.number().int().min(500).max(500_000), garantiaDias: z.number().int().min(7).max(90) }),
});

/** Estratégia primeiro; depois os canais em paralelo, todos seguindo a mesma estratégia. */
export function POST(req: Request) {
  return rotaIA(req, "campanha", entrada, async ({ configuracao, planejamento, oferta }) => {
    const gerar = <S extends z.ZodType>(schema: S, pedido: string, maxTokens: number) =>
      gerarEstruturado({ schema, sistema: SISTEMA_DIVULGACAO, pedido, esforco: "low", maxTokens }).then((r) => r.dados);

    const estrategia = await gerar(estrategiaSchema, pedidoCampanha("estrategia", configuracao, planejamento, oferta), 8000);
    const [instagram, tiktok, canais, agenda] = await Promise.all([
      gerar(instagramSchema, pedidoCampanha("instagram", configuracao, planejamento, oferta, estrategia), 16000),
      gerar(tiktokSchema, pedidoCampanha("tiktok", configuracao, planejamento, oferta, estrategia), 16000),
      gerar(canaisDiretosSchema, pedidoCampanha("canais", configuracao, planejamento, oferta, estrategia), 16000),
      gerar(calendarioSchema, pedidoCampanha("calendario", configuracao, planejamento, oferta, estrategia), 12000),
    ]);
    return { estrategia, instagram, tiktok, ...canais, calendario: agenda.calendario };
  });
}
