import { z } from "zod";
import { gerarEstruturado } from "@/lib/ia/claude";
import { planejamentoSchema, sugestaoPrecoSchema } from "@/lib/ia/esquemas";
import { SISTEMA_VENDAS, pedidoPreco } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";

export const maxDuration = 120;

const entrada = z.object({ configuracao: configuracaoProdutoSchema, planejamento: planejamentoSchema });

/** Preços sempre dentro de R$ 5 a R$ 5.000 e em ordem crescente, mesmo que a IA erre. */
const limitar = (c: number) => Math.min(500_000, Math.max(500, Math.round(c)));

export function POST(req: Request) {
  return rotaIA(req, "preco", entrada, async ({ configuracao, planejamento }) => {
    const { dados } = await gerarEstruturado({
      modelo: "leve",
      schema: sugestaoPrecoSchema,
      sistema: SISTEMA_VENDAS,
      pedido: pedidoPreco(configuracao, planejamento),
      esforco: "low",
      maxTokens: 6000,
    });
    const [e, r, p] = [dados.entrada, dados.recomendado, dados.premium].map((f) => ({ ...f, precoCentavos: limitar(f.precoCentavos) }));
    return { ...dados, entrada: e, recomendado: { ...r, precoCentavos: Math.max(r.precoCentavos, e.precoCentavos) }, premium: { ...p, precoCentavos: Math.max(p.precoCentavos, r.precoCentavos) } };
  });
}
