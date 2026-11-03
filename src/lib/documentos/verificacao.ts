export type Achado = { nivel: "bloqueante" | "aviso"; mensagem: string };

type CapituloVerificavel = { ordem: number; titulo: string; status: string; conteudo?: string };

const PALAVRAS_MINIMAS = 400;

/** Conferência antes de liberar o PDF. Bloqueante = o PDF sai marcado como RASCUNHO. */
export function verificarMaterial(d: {
  capitulos: CapituloVerificavel[];
  totalPlanejado: number;
  temCapa: boolean;
  imagensCapitulos: number;
  bonusPlanejados: number;
}): Achado[] {
  const achados: Achado[] = [];
  const pendentes = d.capitulos.filter((c) => c.status !== "concluido" || !c.conteudo?.trim());
  if (d.capitulos.length < d.totalPlanejado) achados.push({ nivel: "bloqueante", mensagem: `O planejamento tem ${d.totalPlanejado} capítulos, mas só ${d.capitulos.length} existem na redação. Aprove o planejamento de novo.` });
  if (pendentes.length) achados.push({ nivel: "bloqueante", mensagem: `${pendentes.length} capítulo(s) ainda sem texto: ${pendentes.map((c) => c.ordem + 1).join(", ")}.` });

  for (const c of d.capitulos) {
    if (!c.conteudo?.trim()) continue;
    const palavras = c.conteudo.split(/\s+/).length;
    if (palavras < PALAVRAS_MINIMAS) achados.push({ nivel: "aviso", mensagem: `Capítulo ${c.ordem + 1} está curto (${palavras} palavras). Confira se não ficou superficial.` });
    if (/\[(inserir|preencher|todo|xx+)[^\]]*\]/i.test(c.conteudo)) achados.push({ nivel: "bloqueante", mensagem: `Capítulo ${c.ordem + 1} tem um marcador a preencher (ex.: [inserir...]).` });
    if (/(segundo|de acordo com) (um |uma )?(estudo|pesquisa)|estudos (mostram|comprovam)|\d+ ?% d[aoe]s? /i.test(c.conteudo))
      achados.push({ nivel: "aviso", mensagem: `Capítulo ${c.ordem + 1} cita estudo ou porcentagem. Confirme a fonte ou remova antes de vender.` });
    const ultimo = c.conteudo.trim().slice(-1);
    if (!/[.!?:)"”»*]/.test(ultimo)) achados.push({ nivel: "aviso", mensagem: `Capítulo ${c.ordem + 1} parece terminar no meio de uma frase.` });
  }

  if (!d.temCapa) achados.push({ nivel: "aviso", mensagem: "Sem imagem de capa: será usada a capa em cores da sua identidade visual." });
  if (d.imagensCapitulos < d.totalPlanejado) achados.push({ nivel: "aviso", mensagem: `${d.totalPlanejado - d.imagensCapitulos} capítulo(s) sem imagem de abertura.` });
  if (d.bonusPlanejados) achados.push({ nivel: "aviso", mensagem: `Os ${d.bonusPlanejados} bônus do planejamento ainda não foram criados e não entram no PDF. Não os anuncie na venda até existirem.` });
  return achados;
}
