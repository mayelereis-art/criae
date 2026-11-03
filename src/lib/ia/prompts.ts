import "server-only";
import { LIMITES, type ConfiguracaoProduto } from "../validacao/produto";
import type { CapituloPlano, Planejamento } from "./esquemas";

// Regras fixas no início do system prompt: ficam iguais entre chamadas (bom para cache) e valem para tudo.
const BASE = `Você trabalha na Criaê, plataforma brasileira que ajuda pessoas comuns a criar e vender produtos digitais (e-books, guias, checklists).
Escreva sempre em português do Brasil, natural e claro, sem jargão de marketing vazio.

Regras que valem para qualquer resposta:
- Não invente estatísticas, pesquisas, estudos, números de mercado, volume de buscas, depoimentos ou referências. Se um dado seria útil e você não tem fonte, escreva de forma qualitativa ou diga que é uma hipótese.
- Não faça promessas de resultado garantido (dinheiro, cura, emagrecimento, prazos certos).
- Em saúde, nutrição, exercícios, gestação, finanças e direito: dê informação geral e prudente, indique os limites do material e quando procurar um profissional. Não prescreva tratamentos, doses, dietas restritivas, investimentos específicos ou estratégias jurídicas.
- Conteúdo original. Não copie nem imite obras, marcas ou autores reais.`;

export const SISTEMA_MERCADO = `${BASE}

Sua função agora: analista de oportunidades de produtos digitais. Você não tem acesso a dados de pesquisa em tempo real, então trate demanda e concorrência como hipóteses fundamentadas no comportamento do público, nunca como números.`;

export const SISTEMA_EDITOR = `${BASE}

Sua função agora: editor e autor de e-books práticos. O leitor precisa terminar cada capítulo sabendo fazer algo que não sabia. Prefira passos concretos, exemplos do cotidiano brasileiro e explicações do porquê. Nada de parágrafos que só repetem a ideia anterior ou que existem para ocupar espaço.`;

export const SISTEMA_REVISOR = `${BASE}

Sua função agora: revisor editorial rigoroso. Você recebe um capítulo e o contexto do livro. Procure e corrija: contradições com o resto do livro, erros gramaticais e de concordância, informações inconsistentes, repetições, trechos incompletos, quebras de continuidade e afirmações apresentadas como fato sem base (estatísticas, "estudos mostram", etc.). Preserve a voz e a estrutura do autor; não reescreva o que já está bom.`;

const PRECO_REFERENCIA = "Use R$ 19,90 como referência de preço de entrada, ajustando para cima quando a profundidade ou o nicho justificarem.";

export function pedidoPesquisaNicho(nicho: string, detalhe?: string) {
  return `Nicho escolhido: ${nicho}${detalhe ? `\nContexto adicional de quem vai criar: ${detalhe}` : ""}

Faça uma análise para quem quer criar um produto digital neste nicho:
- 5 a 8 subnichos promissores
- 5 a 8 problemas reais que esse público enfrenta
- 5 a 8 desejos e necessidades
- o perfil do comprador ideal (um parágrafo)
- 5 temas com potencial comercial
- 4 a 6 diferenciais competitivos possíveis
- 6 sugestões de títulos (até 80 caracteres cada)
- 3 a 5 possibilidades de monetização (produto principal, order bump, upsell, etc.)
- 4 a 6 oportunidades concretas de produto, cada uma com público, problema, transformação prometida (realista), formato, justificativa comercial qualitativa, título sugerido (até 80 caracteres) e preço inicial em centavos. Nome da oportunidade com até 100 caracteres; público, problema e transformação com até 300 caracteres cada. ${PRECO_REFERENCIA}
Marque temaSensivel como true se o nicho envolver saúde, finanças, direito, gestação ou crianças.`;
}

export function pedidoSugestaoConfiguracao(parcial: Partial<ConfiguracaoProduto>) {
  const preenchidos = Object.entries(parcial).filter(([, v]) => typeof v === "string" && v.trim());
  return `Preencha a configuração de um e-book a partir do que a pessoa já escreveu. Mantenha exatamente os campos que ela preencheu e complete os vazios de forma coerente com eles.

Campos já preenchidos:
${preenchidos.length ? preenchidos.map(([k, v]) => `- ${k}: ${v}`).join("\n") : "- (nenhum: proponha um produto viável e específico)"}

Seja específico: público com idade/situação, problema concreto, transformação realista e mensurável pelo próprio leitor.
Respeite o tamanho máximo de cada campo, em caracteres: ${Object.entries(LIMITES).map(([k, n]) => `${k} ${n}`).join(", ")}.`;
}

export function pedidoPlanejamento(c: ConfiguracaoProduto) {
  const capitulos = { essencial: "5 a 7", completo: "8 a 12", aprofundado: "12 a 16" }[c.profundidade];
  return `Monte o planejamento editorial deste e-book para aprovação da autora/autor.

${descreverConfiguracao(c)}

Entregue: título comercial (forte, sem exagero), subtítulo, proposta de valor em uma frase, o que a introdução cobre, ${capitulos} capítulos em ordem lógica de aprendizado (cada um com título, objetivo, 3 a 6 tópicos, exemplos práticos sugeridos e um exercício ou material complementar quando fizer sentido), o que a conclusão cobre, 1 a 3 bônus que façam sentido (checklist, planilha, roteiro) e, se o tema for sensível, um aviso de limitação.
Títulos dos capítulos sem numeração (o sistema numera). Cada capítulo deve avançar o leitor; não crie capítulos que repetem outro com outras palavras.`;
}

export function pedidoCapitulo(
  c: ConfiguracaoProduto,
  p: Planejamento,
  indice: number,
  resumosAnteriores: string[],
) {
  const cap = p.capitulos[indice];
  return `Escreva o capítulo ${indice + 1} de ${p.capitulos.length} do e-book "${p.tituloComercial}" — ${p.subtitulo}.

${descreverConfiguracao(c)}

Sumário completo (para você saber o que vem antes e depois e não antecipar nem repetir):
${p.capitulos.map((x, i) => `${i + 1}. ${x.titulo} — ${x.objetivo}`).join("\n")}

${resumosAnteriores.length ? `O que os capítulos anteriores já cobriram:\n${resumosAnteriores.map((r, i) => `Cap. ${i + 1}: ${r}`).join("\n")}\n` : "Este é o primeiro capítulo depois da introdução.\n"}
Capítulo a escrever:
${descreverCapitulo(cap)}

Como escrever:
- Comece com "## ${cap.titulo}" e use ### para seções internas.
- Explique com profundidade e passos práticos; inclua os exemplos sugeridos (ou melhores) situados no Brasil.
- Use quadros de destaque como citação Markdown iniciada por "> **Dica:**", "> **Atenção:**" ou "> **Na prática:**" quando ajudarem.
- ${cap.exercicio ? `Feche com uma seção "### Exercício" baseada em: ${cap.exercicio}` : "Inclua um exercício curto no final só se fizer sentido."}
- Faça uma transição natural para o próximo capítulo na última frase, sem resumir o capítulo inteiro.
- Tamanho: o necessário para ensinar bem (em geral 1.500 a 3.000 palavras). Nada de enchimento.${p.avisoTemaSensivel ? `\n- Tema sensível: respeite este limite: ${p.avisoTemaSensivel}` : ""}`;
}

export function pedidoRevisao(p: Planejamento, indice: number, conteudo: string, resumosAnteriores: string[]) {
  return `Revise o capítulo ${indice + 1} do e-book "${p.tituloComercial}".

Plano deste capítulo:
${descreverCapitulo(p.capitulos[indice])}

${resumosAnteriores.length ? `Capítulos anteriores (para checar contradições e repetições):\n${resumosAnteriores.map((r, i) => `Cap. ${i + 1}: ${r}`).join("\n")}\n` : ""}
Capítulo:
<capitulo>
${conteudo}
</capitulo>

Liste cada problema encontrado (tipo e descrição curta) e devolva o capítulo inteiro já corrigido. Se não houver problemas, devolva a lista vazia e o texto igual.`;
}

function descreverConfiguracao(c: ConfiguracaoProduto) {
  return `Configuração do produto:
- Nicho / subnicho: ${c.nicho} / ${c.subnicho}
- Tema: ${c.tema}
- Público-alvo: ${c.publicoAlvo} (nível ${c.nivelPublico.toLowerCase()})
- Problema que resolve: ${c.problema}
- Objetivo do material: ${c.objetivo}
- Transformação desejada: ${c.transformacao}
- Tom: ${c.tom}`;
}

function descreverCapitulo(cap: CapituloPlano) {
  return `Título: ${cap.titulo}
Objetivo: ${cap.objetivo}
Tópicos: ${cap.topicos.join("; ")}
Exemplos sugeridos: ${cap.exemplos.join("; ") || "(livre)"}`;
}

export const SISTEMA_DIRETOR_ARTE = `${BASE}

Sua função agora: diretor de arte. Você escreve prompts para um gerador de imagens criar a arte de capas e aberturas de capítulo de e-books. A arte precisa ter relação direta com o conteúdo (objetos, cenas e gestos do tema), nada genérico.
Regras do prompt: escreva em inglês; descreva cena, enquadramento, luz, paleta e estilo; diga explicitamente que a imagem não deve ter texto, letras, números, logotipos nem marcas d'água (o título é colocado depois pelo sistema); evite rostos em close de pessoas reais ou famosas; nada de conteúdo médico explícito.`;

export function pedidoPromptImagem(d: {
  tipo: "capa" | "capitulo"; titulo: string; subtitulo: string; tema: string; publico: string;
  estilo: string; cores: string[]; capitulo?: { titulo: string; objetivo: string };
}) {
  return `Crie o prompt da ${d.tipo === "capa" ? "arte da CAPA (formato retrato 2:3; deixe área mais calma no terço inferior para o título)" : "imagem de ABERTURA DE CAPÍTULO (formato paisagem 3:2)"}.

E-book: "${d.titulo}" — ${d.subtitulo}
Tema: ${d.tema}
Público: ${d.publico}
${d.capitulo ? `Capítulo: ${d.capitulo.titulo} — ${d.capitulo.objetivo}\n` : ""}Estilo visual definido pela autora/autor: ${d.estilo}
Paleta da identidade (use como cores dominantes): ${d.cores.join(", ")}`;
}
