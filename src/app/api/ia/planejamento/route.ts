import { gerarEstruturado } from "@/lib/ia/claude";
import { planejamentoSchema } from "@/lib/ia/esquemas";
import { SISTEMA_EDITOR, pedidoPlanejamento } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";

export const maxDuration = 300;

export function POST(req: Request) {
  return rotaIA(req, "planejamento", configuracaoProdutoSchema, async (configuracao) => {
    const { dados } = await gerarEstruturado({
      schema: planejamentoSchema,
      sistema: SISTEMA_EDITOR,
      pedido: pedidoPlanejamento(configuracao),
      esforco: "high",
    });
    return dados;
  });
}
