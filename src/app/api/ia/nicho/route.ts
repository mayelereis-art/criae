import { z } from "zod";
import { gerarEstruturado } from "@/lib/ia/claude";
import { pesquisaNichoSchema } from "@/lib/ia/esquemas";
import { SISTEMA_MERCADO, pedidoPesquisaNicho } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";

export const maxDuration = 300;

const entrada = z.object({
  nicho: z.string().trim().min(2, "Informe o nicho.").max(140),
  detalhe: z.string().trim().max(400).optional(),
});

export function POST(req: Request) {
  return rotaIA(req, "pesquisa_nicho", entrada, async ({ nicho, detalhe }) => {
    const { dados } = await gerarEstruturado({
      schema: pesquisaNichoSchema,
      sistema: SISTEMA_MERCADO,
      pedido: pedidoPesquisaNicho(nicho, detalhe),
      esforco: "medium",
    });
    return dados;
  });
}
