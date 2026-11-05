import { gerarEstruturado } from "@/lib/ia/claude";
import { sugestaoConfiguracaoSchema } from "@/lib/ia/esquemas";
import { SISTEMA_EDITOR, pedidoSugestaoConfiguracao } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { z } from "zod";
import { CONFIGURACAO_VAZIA, LIMITES, encurtar, type ConfiguracaoProduto } from "@/lib/validacao/produto";

export const maxDuration = 120;

// Aceita a configuração pela metade: a IA completa o que falta.
const entrada = z.object(
  Object.fromEntries(Object.keys(CONFIGURACAO_VAZIA).map((k) => [k, z.string().max(500).optional()])) as Record<
    keyof ConfiguracaoProduto,
    z.ZodOptional<z.ZodString>
  >,
);

export function POST(req: Request) {
  return rotaIA(req, "sugerir_configuracao", entrada, async (parcial) => {
    const { dados } = await gerarEstruturado({
      modelo: "leve",
      schema: sugestaoConfiguracaoSchema,
      sistema: SISTEMA_EDITOR,
      pedido: pedidoSugestaoConfiguracao(parcial as Partial<ConfiguracaoProduto>),
      esforco: "low",
      maxTokens: 8000,
    });
    // O que a pessoa escreveu prevalece sobre a sugestão.
    const mantidos = Object.fromEntries(Object.entries(parcial).filter(([, v]) => typeof v === "string" && v.trim()));
    const sugestao = { ...dados } as Record<string, string>;
    for (const [campo, max] of Object.entries(LIMITES)) sugestao[campo] = encurtar(sugestao[campo] ?? "", max);
    return { ...sugestao, ...mantidos };
  });
}
