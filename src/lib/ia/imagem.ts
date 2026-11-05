import "server-only";
import OpenAI from "openai";
import { ErroIA } from "./claude";
import { medir } from "./medidor";

const MODELO_IMAGEM = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

let cliente: OpenAI | null = null;
function obterCliente() {
  if (!process.env.OPENAI_API_KEY) throw new ErroIA("A chave da IA de imagens (OPENAI_API_KEY) não está configurada no servidor.", 503);
  return (cliente ??= new OpenAI());
}

/** Falha cedo, antes de gastar uma chamada de texto para montar o prompt. */
export function exigirChaveImagem() {
  obterCliente();
}

export type Formato = "retrato" | "paisagem" | "quadrado";

/** Gera uma imagem e devolve em base64 (JPEG: o motor de PDF aceita só JPEG e PNG). Texto nunca é desenhado pela IA: o sistema sobrepõe depois. */
export async function gerarImagem(prompt: string, formato: Formato, qualidade: "medium" | "high" = "medium"): Promise<string> {
  try {
    const r = await obterCliente().images.generate({
      model: MODELO_IMAGEM,
      prompt,
      size: formato === "retrato" ? "1024x1536" : formato === "quadrado" ? "1024x1024" : "1536x1024",
      quality: qualidade,
      output_format: "jpeg",
      n: 1,
    });
    const b64 = r.data?.[0]?.b64_json;
    if (!b64) throw new ErroIA("A IA de imagens não devolveu a imagem. Tente de novo.", 502);
    medir({ imagens: 1 });
    return b64;
  } catch (e) {
    if (e instanceof ErroIA) throw e;
    if (e instanceof OpenAI.AuthenticationError) throw new ErroIA("Chave da IA de imagens inválida no servidor.", 503);
    if (e instanceof OpenAI.RateLimitError) {
      // 429 serve para dois casos bem diferentes: conta sem saldo ou excesso momentâneo de pedidos.
      if (e.type === "insufficient_quota") throw new ErroIA("A conta da IA de imagens (OpenAI) está sem créditos. Adicione saldo no painel da OpenAI.", 402);
      throw new ErroIA("A IA de imagens está com muitos pedidos agora. Aguarde um minuto e tente de novo.", 429);
    }
    if (e instanceof OpenAI.BadRequestError) throw new ErroIA("A IA de imagens recusou este pedido. Ajuste o estilo das imagens e tente de novo.", 422);
    if (e instanceof OpenAI.APIError) throw new ErroIA(`Erro da IA de imagens (${e.status}). Tente de novo.`, 502);
    throw e;
  }
}
