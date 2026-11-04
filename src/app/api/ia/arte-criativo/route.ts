import { z } from "zod";
import { exigirChaveImagem, gerarImagem } from "@/lib/ia/imagem";
import { rotaIA } from "@/lib/ia/rota";

export const maxDuration = 300;

const entrada = z.object({ prompt: z.string().min(10).max(4000), formato: z.enum(["quadrado", "retrato", "story"]) });

/** Arte de fundo do criativo, sem texto: título e CTA são colocados depois pelo sistema. */
export function POST(req: Request) {
  return rotaIA(req, "arte_criativo", entrada, async ({ prompt, formato }) => {
    exigirChaveImagem();
    const base64 = await gerarImagem(`${prompt}\n\nNo text, no letters, no numbers, no logos, no watermark, no books.`, formato === "quadrado" ? "quadrado" : "retrato");
    return { base64 };
  });
}
