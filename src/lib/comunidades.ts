import type { Comunidades } from "./ia/esquemas";

export const PLATAFORMAS_COMUNIDADE = ["Facebook", "Instagram", "Telegram", "LinkedIn", "Reddit"] as const;
export type PlataformaComunidade = (typeof PLATAFORMAS_COMUNIDADE)[number];

/**
 * Links de busca de verdade em cada rede: o Criaê não lista grupos específicos (a IA inventaria nomes e links).
 * O WhatsApp não tem busca pública de grupos, por isso fica de fora.
 */
export function linkBusca(plataforma: PlataformaComunidade, termo: string) {
  const q = encodeURIComponent(termo);
  switch (plataforma) {
    case "Facebook": return `https://www.facebook.com/search/groups/?q=${q}`;
    case "Instagram": return `https://www.instagram.com/explore/search/keyword/?q=${q}`;
    case "Telegram": return `https://www.google.com/search?q=${encodeURIComponent(`site:t.me ${termo}`)}`;
    case "LinkedIn": return `https://www.linkedin.com/search/results/groups/?keywords=${q}`;
    case "Reddit": return `https://www.reddit.com/search/?q=${q}&type=communities`;
  }
}

/** Hashtag sem # nem espaços, só letras e números (com acento). */
export const limparHashtag = (t: string) => t.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
export const linkHashtag = (t: string) => `https://www.instagram.com/explore/tags/${encodeURIComponent(limparHashtag(t).toLowerCase())}/`;

const lista = (itens: string[]) => itens.map((t, i) => `${i + 1}. ${t}`).join("\n\n");

/** Texto corrido para o ZIP e para "Baixar esta aba". */
export function textoComunidades(c: Comunidades, comLink: (t: string) => string) {
  return [
    `ONDE PROCURAR\n${lista(c.perfis.map((p) => `${p.tipo}\n${p.porQue}\nBuscar por: ${p.termos.join(" | ")}\n${p.plataformas.map((pl) => p.termos.map((t) => `${pl}: ${linkBusca(pl, t)}`).join("\n")).join("\n")}`))}`,
    `HASHTAGS DO NICHO\n${c.hashtags.map((h) => `#${limparHashtag(h)}`).join(" ")}`,
    `PEDIR LICENÇA AO ADMINISTRADOR\n${c.mensagemAdmin}`,
    `POST QUE ENTREGA VALOR\n${comLink(c.postValor)}`,
    `MENSAGEM CURTA PARA O GRUPO\n${comLink(c.mensagemGrupo)}`,
    `CUIDADOS PARA NÃO SER REMOVIDO\n${lista(c.cuidados)}`,
  ].join("\n\n\n");
}
