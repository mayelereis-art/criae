import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/** Um só lugar para trocar de modelo. */
export const MODELO = "claude-opus-5-5";

export class ErroIA extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

let cliente: Anthropic | null = null;
function obterCliente() {
  if (!process.env.ANTHROPIC_API_KEY) throw new ErroIA("A chave da IA (ANTHROPIC_API_KEY) não está configurada no servidor.", 503);
  return (cliente ??= new Anthropic());
}

type Esforco = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Chamada com saída estruturada validada pelo schema zod.
 * Usa streaming (respostas longas não estouram o timeout HTTP) e o fallback
 * automático do servidor caso o classificador de segurança recuse por engano.
 */
export async function gerarEstruturado<S extends z.ZodType>(opcoes: {
  schema: S;
  sistema: string;
  pedido: string;
  esforco?: Esforco;
  maxTokens?: number;
}): Promise<{ dados: z.infer<S>; uso: { entrada: number; saida: number } }> {
  const { schema, sistema, pedido, esforco = "medium", maxTokens = 32000 } = opcoes;
  try {
    const stream = obterCliente().beta.messages.stream({
      model: MODELO,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: sistema,
      messages: [{ role: "user", content: pedido }],
      output_config: { effort: esforco, format: betaZodOutputFormat(schema) },
    });
    const resposta = await stream.finalMessage();

    if (resposta.stop_reason === "refusal")
      throw new ErroIA("A IA não pôde atender a este pedido. Revise o tema ou reformule o texto.", 422);
    if (resposta.stop_reason === "max_tokens")
      throw new ErroIA("A resposta da IA ficou longa demais e foi cortada. Tente de novo.", 502);
    if (!resposta.parsed_output) throw new ErroIA("A IA devolveu uma resposta fora do formato esperado. Tente de novo.", 502);

    return {
      dados: resposta.parsed_output as z.infer<S>,
      uso: { entrada: resposta.usage.input_tokens, saida: resposta.usage.output_tokens },
    };
  } catch (e) {
    if (e instanceof ErroIA) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new ErroIA("Chave da IA inválida no servidor.", 503);
    if (e instanceof Anthropic.RateLimitError) throw new ErroIA("A IA está com muitos pedidos agora. Aguarde um minuto e tente de novo.", 429);
    if (e instanceof Anthropic.APIConnectionError) throw new ErroIA("Não foi possível falar com a IA. Tente de novo.", 502);
    if (e instanceof Anthropic.APIError) {
      console.error(JSON.stringify({ evento: "ia-api", status: e.status, mensagem: e.message.slice(0, 400) }));
      throw new ErroIA(`Erro da IA (${e.status}). Tente de novo.`, 502);
    }
    throw e;
  }
}
