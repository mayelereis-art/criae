import { z } from "zod";
import { gerarEstruturado } from "@/lib/ia/claude";
import { planejamentoSchema, textoPaginaSchema } from "@/lib/ia/esquemas";
import { SISTEMA_VENDAS, pedidoTextoPagina } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { configuracaoProdutoSchema, encurtar } from "@/lib/validacao/produto";

export const maxDuration = 300;

const entrada = z.object({
  configuracao: configuracaoProdutoSchema,
  planejamento: planejamentoSchema,
  oferta: z.object({ precoCentavos: z.number().int().min(500).max(500_000), garantiaDias: z.number().int().min(7).max(90), bonusExistentes: z.array(z.string().max(200)).max(10) }),
});

export function POST(req: Request) {
  return rotaIA(req, "texto_pagina", entrada, async ({ configuracao, planejamento, oferta }) => {
    const { dados } = await gerarEstruturado({
      schema: textoPaginaSchema,
      sistema: SISTEMA_VENDAS,
      pedido: pedidoTextoPagina(configuracao, planejamento, oferta),
      esforco: "medium",
      maxTokens: 16000,
    });
    return { ...dados, seoTitulo: encurtar(dados.seoTitulo, 60), seoDescricao: encurtar(dados.seoDescricao, 155) };
  });
}
