import { gerarEstruturado } from "@/lib/ia/claude";
import { planejamentoSchema } from "@/lib/ia/esquemas";
import { SISTEMA_EDITOR, pedidoPlanejamento } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";

export const maxDuration = 300;

export function POST(req: Request) {
  return rotaIA(req, "planejamento", configuracaoProdutoSchema, async (configuracao) => {
    const { dados } = await gerarEstruturado({
      modelo: "medio",
      schema: planejamentoSchema,
      sistema: SISTEMA_EDITOR,
      pedido: pedidoPlanejamento(configuracao),
      esforco: "high",
    });
    // A numeração é do sistema (sumário e PDF); tira "Capítulo 3 –" que a IA às vezes põe no título.
    const semNumero = (t: string) => t.replace(/^\s*cap[ií]tulo\s*\d+\s*[–—:.\-]\s*/i, "").trim();
    return { ...dados, capitulos: dados.capitulos.map((c) => ({ ...c, titulo: semNumero(c.titulo) })) };
  });
}
