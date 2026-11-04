import { z } from "zod";
import { gerarEstruturado } from "@/lib/ia/claude";
import { pacoteCriativosSchema, planejamentoSchema } from "@/lib/ia/esquemas";
import { exigirChaveImagem } from "@/lib/ia/imagem";
import { SISTEMA_DIVULGACAO, pedidoCriativos } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { configuracaoProdutoSchema, encurtar } from "@/lib/validacao/produto";

export const maxDuration = 300;

const entrada = z.object({
  configuracao: configuracaoProdutoSchema,
  planejamento: planejamentoSchema,
  oferta: z.object({ precoCentavos: z.number().int().min(500).max(500_000), garantiaDias: z.number().int().min(7).max(90) }),
  visual: z.object({ estilo: z.string().max(300), cores: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(5) }),
});

/** Só os conceitos e textos. As artes vêm depois, uma a uma, por /api/ia/arte-criativo. */
export function POST(req: Request) {
  return rotaIA(req, "criativos", entrada, async ({ configuracao, planejamento, oferta, visual }) => {
    exigirChaveImagem();
    const { dados } = await gerarEstruturado({
      schema: pacoteCriativosSchema,
      sistema: SISTEMA_DIVULGACAO,
      pedido: pedidoCriativos(configuracao, planejamento, oferta, visual, 2),
      esforco: "low",
      maxTokens: 16000,
    });
    return {
      criativos: dados.criativos.slice(0, 9).map((c) => ({
        ...c,
        plataforma: encurtar(c.plataforma, 80), angulo: encurtar(c.angulo, 300), titulo: encurtar(c.titulo, 100), apoio: encurtar(c.apoio, 160),
        textoPrincipal: encurtar(c.textoPrincipal, 3000), legenda: encurtar(c.legenda, 3000), cta: encurtar(c.cta, 40), promptArte: encurtar(c.promptArte, 3900),
      })),
    };
  });
}
