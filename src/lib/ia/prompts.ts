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
- Outros capítulos podem estar sendo escritos agora, então não desenvolva aqui os tópicos deles:
${p.capitulos.map((x, i) => (i === indice ? "" : `  ${i + 1}. ${x.titulo}: ${x.topicos.join("; ")}`)).filter(Boolean).join("\n")}
- Tamanho: ${{ essencial: "800 a 1.200", completo: "1.000 a 1.500", aprofundado: "1.800 a 2.500" }[c.profundidade]} palavras. Direto, sem enchimento: cada parágrafo precisa ensinar algo.${p.avisoTemaSensivel ? `\n- Tema sensível: respeite este limite: ${p.avisoTemaSensivel}` : ""}`;
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

Liste cada problema encontrado (tipo e descrição curta) e, para cada um, a correção: o trecho exato copiado do capítulo e o texto que entra no lugar. Não devolva o capítulo inteiro. Mude só o necessário, sem reescrever por gosto de estilo. Se não houver problemas, devolva as duas listas vazias.`;
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
  return `Crie o prompt da ${d.tipo === "capa" ? "arte da CAPA (formato retrato 2:3; deixe área mais calma no terço inferior para o título). A capa é o que vende o e-book: precisa chamar a atenção mesmo em miniatura, no celular. Um único assunto forte e reconhecível do tema, composição marcante, contraste alto, cores vibrantes da paleta, luz dramática e acabamento de capa profissional" : "imagem de ABERTURA DE CAPÍTULO (formato paisagem 3:2)"}.

E-book: "${d.titulo}" — ${d.subtitulo}
Tema: ${d.tema}
Público: ${d.publico}
${d.capitulo ? `Capítulo: ${d.capitulo.titulo} — ${d.capitulo.objetivo}\n` : ""}Estilo visual definido pela autora/autor: ${d.estilo}
Paleta da identidade (use como cores dominantes): ${d.cores.join(", ")}`;
}

export const SISTEMA_VENDAS = `${BASE}

Sua função agora: estrategista de ofertas e copywriter de páginas de vendas de alta conversão para produtos digitais de baixo ticket no Brasil. Escreva com força e emoção: título que para a rolagem, dor descrita com as palavras do próprio público, contraste entre hoje e o depois, benefícios concretos, quebra de objeções e chamadas diretas para a compra. Frases curtas, ritmo de conversa. Persuasão honesta: toda a força vem da especificidade do tema, nunca de algo inventado.
Proibido: depoimentos ou números de alunos/vendas inventados, escassez ou urgência falsa ("últimas vagas", contador), promessas de renda, cura ou resultado garantido, comparação com concorrentes nomeados, citar o produto como "best-seller".`;

export function pedidoPreco(c: ConfiguracaoProduto, p: Planejamento) {
  return `Sugira três preços para este e-book, em centavos de real.

${descreverConfiguracao(c)}
Título: ${p.tituloComercial} — ${p.subtitulo}
Capítulos: ${p.capitulos.length} (${c.profundidade})
Exercícios práticos em ${p.capitulos.filter((x) => x.exercicio).length} capítulos.

Faixas: preço de ENTRADA (para vender volume e validar), RECOMENDADO (equilíbrio) e PREMIUM (posicionamento mais alto, justificado pela profundidade).
${"Use R$ 19,90 como referência de preço de entrada, ajustando para cima quando a profundidade ou o nicho justificarem."} Prefira finais ,90 ou ,97. Justifique cada faixa pelo valor percebido (profundidade, especificidade, transformação), sem citar pesquisas ou preços de concorrentes.`;
}

export function pedidoTextoPagina(c: ConfiguracaoProduto, p: Planejamento, oferta: { precoCentavos: number; garantiaDias: number; bonusExistentes: string[] }) {
  return `Escreva os textos da página de vendas deste e-book.

${descreverConfiguracao(c)}
Título: ${p.tituloComercial}
Subtítulo: ${p.subtitulo}
Proposta de valor: ${p.propostaValor}
Sumário:
${p.capitulos.map((x, i) => `${i + 1}. ${x.titulo} — ${x.objetivo}`).join("\n")}
Preço: R$ ${(oferta.precoCentavos / 100).toFixed(2).replace(".", ",")}
Garantia: ${oferta.garantiaDias} dias (direito de arrependimento; reembolso integral no período)
Bônus que já existem: ${oferta.bonusExistentes.length ? oferta.bonusExistentes.join("; ") : "nenhum (não mencione bônus)"}
${p.avisoTemaSensivel ? `Tema sensível: ${p.avisoTemaSensivel}. Reflita esse limite no texto e no FAQ.` : ""}

Formato: e-book em PDF, com acesso liberado logo após a confirmação do pagamento. Não cite a forma de pagamento nem o nome de plataformas: isso depende da configuração do vendedor.
"O que você recebe" só pode listar o que existe: o e-book (com o número real de capítulos e exercícios) e os bônus listados acima.
FAQ deve responder de verdade: formato, como recebe, garantia, para quem é, e as dúvidas típicas do público.`;
}

export const SISTEMA_DIVULGACAO = `${BASE}

Sua função agora: estrategista de divulgação e social media de produtos digitais de baixo ticket no Brasil. Escreva em português do Brasil, natural e específico do tema, sem clichês de marketing.
Proibido: depoimentos, números de alunos ou de vendas inventados, escassez ou urgência falsa, promessas de renda, cura ou resultado garantido, concorrentes nomeados, "best-seller", preço riscado, desconto ou bônus que não estejam na oferta informada.
Quando precisar do endereço de compra, escreva exatamente [LINK]. Nunca invente um endereço, arroba ou nome de perfil.`;

function descreverOferta(c: ConfiguracaoProduto, p: Planejamento, oferta: { precoCentavos: number; garantiaDias: number }) {
  return `${descreverConfiguracao(c)}
Título: ${p.tituloComercial}
Subtítulo: ${p.subtitulo}
Proposta de valor: ${p.propostaValor}
Sumário:
${p.capitulos.map((x, i) => `${i + 1}. ${x.titulo}`).join("\n")}
Preço: R$ ${(oferta.precoCentavos / 100).toFixed(2).replace(".", ",")}
Garantia: ${oferta.garantiaDias} dias
Formato: e-book em PDF, com acesso logo após a confirmação do pagamento por Pix ou cartão.
${p.avisoTemaSensivel ? `Tema sensível: ${p.avisoTemaSensivel}. Respeite esse limite em todos os textos.` : ""}`;
}

const PARTES_CAMPANHA = {
  estrategia: "a estratégia de divulgação: posicionamento, mensagem central, ângulos, canais prioritários e objeções. Este texto é interno, para o criador: não use [LINK] nele",
  instagram: "os materiais de Instagram: posts, carrosséis, stories e chamadas comerciais. Conteúdo que ensina algo real do tema vem antes da venda",
  tiktok: "os materiais de TikTok: roteiros de vídeo com cenas, ganchos de abertura, ideias de conteúdo e textos para publicação. Roteiros que uma pessoa comum grava com o celular",
  canais: "os materiais de Facebook, WhatsApp e as variações de anúncio pago. WhatsApp com tom de conversa, sem parecer spam",
  calendario: "o calendário de 14 dias: comece aquecendo o público, apresente o produto depois e distribua lembretes sem pressão falsa. Cada item precisa dizer o que publicar, de forma que a pessoa consiga executar sem pensar de novo",
} as const;

export function pedidoCampanha(
  parte: keyof typeof PARTES_CAMPANHA, c: ConfiguracaoProduto, p: Planejamento, oferta: { precoCentavos: number; garantiaDias: number },
  estrategia?: { posicionamento: string; mensagemCentral: string; angulos: string[] },
) {
  return `Crie ${PARTES_CAMPANHA[parte]}. Respeite as quantidades descritas em cada campo.

${descreverOferta(c, p, oferta)}
${estrategia ? `
Estratégia já definida, que os materiais devem seguir:
Posicionamento: ${estrategia.posicionamento}
Mensagem central: ${estrategia.mensagemCentral}
Ângulos: ${estrategia.angulos.join("; ")}` : ""}`;
}

export function pedidoCriativos(
  c: ConfiguracaoProduto, p: Planejamento, oferta: { precoCentavos: number; garantiaDias: number },
  visual: { estilo: string; cores: string[] }, escolha: { quantidade: number; midias: string[]; emocoes: string[] },
) {
  return `Crie ${escolha.quantidade} peças publicitárias para este e-book, distribuídas entre as mídias: ${escolha.midias.join(", ")}.

${descreverOferta(c, p, oferta)}

Estilo visual da identidade: ${visual.estilo}
Paleta: ${visual.cores.join(", ")}
Emoções a despertar: ${escolha.emocoes.length ? escolha.emocoes.join(", ") : "escolha a melhor para cada peça, variando entre elas"}.

Cada peça usa um ângulo, um tipo de gancho e uma combinação diferentes. Adapte tudo à mídia:
- Feed: formato quadrado ou retrato. Gancho que funciona parado, legenda mais longa que conta uma pequena história ou ensina algo, terminando com chamada e [LINK].
- Stories: formato story. Texto muito curto, leitura em 3 segundos, tom de conversa, com interação sugerida em "comoUsar" (enquete, caixa de pergunta, figurinha de link). Legenda de 1 a 2 frases.
- Reels (capa): formato story. Gancho que promete o que o vídeo mostra. Legenda curta e pergunta para gerar comentário.
- Anúncio no feed: formato quadrado ou retrato. Benefício claro já no gancho, sem depender de contexto, texto principal objetivo.
- Anúncio em stories: formato story. Uma ideia só e chamada imediata.

A emoção precisa aparecer de verdade no texto. Humor: situação engraçada e reconhecível do tema, leve, sem zombar da pessoa. Identificação: descreva a cena exata que ela vive. Alívio: tire a culpa e mostre que tem saída. Curiosidade: abra uma pergunta que só o conteúdo fecha, sem enganar. Em tema sensível, prefira acolhimento e não use humor.
Título, apoio e CTA são colocados na imagem pelo nosso sistema, então não dependem da arte.
Regras do promptArte: em inglês; cena ligada ao tema, com objetos e gestos reais, no clima da emoção escolhida; paleta da identidade; área calma para receber texto; sem texto, letras, números, logotipos, marcas d'água, livros ou capas (o e-book é colocado depois pelo sistema); evite rostos em close de pessoas reais ou famosas.`;
}
