import { z } from "zod";
import { gerarEstruturado } from "@/lib/ia/claude";
import { promptImagemSchema } from "@/lib/ia/esquemas";
import { exigirChaveImagem, gerarImagem } from "@/lib/ia/imagem";
import { SISTEMA_DIRETOR_ARTE, pedidoPromptImagem } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";

export const maxDuration = 300;

const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const entrada = z.object({
  tipo: z.enum(["capa", "capitulo"]),
  titulo: z.string().max(200),
  subtitulo: z.string().max(400),
  tema: z.string().max(200),
  publico: z.string().max(500),
  estilo: z.string().max(300),
  cores: z.array(cor).max(5),
  capitulo: z.object({ titulo: z.string().max(200), objetivo: z.string().max(1000) }).optional(),
});

/** Claude escreve o prompt a partir do conteúdo; o gerador de imagens desenha. Devolve a imagem em base64. */
export function POST(req: Request) {
  return rotaIA(req, (d) => (d.tipo === "capa" ? "imagem_capa" : "imagem"), entrada, async (d) => {
    exigirChaveImagem();
    const { dados } = await gerarEstruturado({
      modelo: d.tipo === "capa" ? "medio" : "leve", // na capa, a direção de arte pesa mais que o custo
      schema: promptImagemSchema,
      sistema: SISTEMA_DIRETOR_ARTE,
      pedido: pedidoPromptImagem(d),
      esforco: "low",
      maxTokens: 4000,
    });
    const prompt = `${dados.prompt}\n\nNo text, no letters, no numbers, no logos, no watermark.`;
    const base64 = await gerarImagem(prompt, d.tipo === "capa" ? "retrato" : "paisagem", d.tipo === "capa" ? "high" : "medium");
    return { base64, prompt };
  });
}
