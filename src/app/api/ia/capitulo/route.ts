import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { CAPITULOS_POR_EBOOK } from "@/config/catalogo";
import { dbAdmin } from "@/lib/firebase/admin";
import { gerarEstruturado } from "@/lib/ia/claude";
import { aplicarCorrecoes } from "@/lib/ia/correcoes";
import { capituloRedigidoSchema, planejamentoSchema, revisaoSchema } from "@/lib/ia/esquemas";
import { SISTEMA_EDITOR, SISTEMA_REVISOR, pedidoCapitulo, pedidoRevisao } from "@/lib/ia/prompts";
import { rotaIA } from "@/lib/ia/rota";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";

export const maxDuration = 600;

const entrada = z
  .object({
    configuracao: configuracaoProdutoSchema,
    planejamento: planejamentoSchema,
    produtoId: z.string().min(1).max(128).optional(),
    indice: z.number().int().min(0),
    resumosAnteriores: z.array(z.string().max(2000)).max(40),
  })
  .refine((d) => d.indice < d.planejamento.capitulos.length, "Capítulo fora do planejamento.")
  .refine((d) => d.indice < CAPITULOS_POR_EBOOK, `O e-book padrão tem ${CAPITULOS_POR_EBOOK} capítulos.`);

/** Redige um capítulo e passa pela revisão antes de devolver. */
export function POST(req: Request) {
  return rotaIA(req, "capitulo", entrada, async ({ configuracao, planejamento, produtoId, indice, resumosAnteriores }, usuario) => {
    const { dados: rascunho } = await gerarEstruturado({
      modelo: "forte",
      schema: capituloRedigidoSchema,
      sistema: SISTEMA_EDITOR,
      pedido: pedidoCapitulo(configuracao, planejamento, indice, resumosAnteriores),
      esforco: "high",
      maxTokens: 64000,
    });
    const { dados: revisao } = await gerarEstruturado({
      modelo: "medio",
      schema: revisaoSchema,
      sistema: SISTEMA_REVISOR,
      pedido: pedidoRevisao(planejamento, indice, rascunho.conteudo, resumosAnteriores),
      esforco: "medium",
      maxTokens: 12000,
    });
    const corrigido = aplicarCorrecoes(rascunho.conteudo, revisao.correcoes);
    // Correções que encolhem o texto pela metade são suspeitas (corte ou resumo): fica o rascunho.
    const revisaoConfiavel = corrigido.aplicadas === revisao.correcoes.length && corrigido.texto.length > rascunho.conteudo.length * 0.6;
    const resultado = {
      conteudo: corrigido.texto.length > rascunho.conteudo.length * 0.6 ? corrigido.texto : rascunho.conteudo,
      resumo: rascunho.resumo,
      problemas: revisao.problemas,
      revisaoAplicada: revisaoConfiavel,
    };
    // Salva aqui também: se a pessoa recarregar ou fechar a aba, o capítulo já pago não se perde.
    if (produtoId) {
      const ref = dbAdmin().collection("capitulos").doc(`${produtoId}_${String(indice).padStart(2, "0")}`);
      const atual = (await ref.get().catch(() => null))?.data();
      if (atual?.donoId === usuario.uid)
        await ref.update({
          status: "concluido", conteudo: resultado.conteudo, resumo: resultado.resumo, problemas: resultado.problemas,
          revisaoAplicada: resultado.revisaoAplicada, editadoManualmente: false, erro: "", atualizadoEm: FieldValue.serverTimestamp(),
        }).catch((e) => console.error(JSON.stringify({ evento: "salvar-capitulo", ok: false, erro: String(e).slice(0, 200) })));
    }
    return resultado;
  });
}
