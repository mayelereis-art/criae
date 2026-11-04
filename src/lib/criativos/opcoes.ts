// Opções do pacote de criativos. Sem Firebase: usadas na tela, na rota e no schema da IA.

export const MIDIAS = ["Feed", "Stories", "Reels (capa)", "Anúncio no feed", "Anúncio em stories"] as const;
export type Midia = (typeof MIDIAS)[number];

export const EMOCOES = ["Identificação", "Curiosidade", "Humor", "Alívio", "Desejo", "Confiança", "Inspiração"] as const;
export type Emocao = (typeof EMOCOES)[number];

export const TIPOS_GANCHO = ["Pergunta direta", "Erro comum", "Antes e depois", "Quebra de crença", "Confissão", "Lista rápida", "Situação engraçada"] as const;

/** Stories e Reels são sempre verticais; o feed aceita quadrado ou retrato. */
export const midiaVertical = (m: Midia) => m === "Stories" || m === "Reels (capa)" || m === "Anúncio em stories";
