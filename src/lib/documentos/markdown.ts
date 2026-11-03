import { marked, type Token, type Tokens } from "marked";

/** Tokens de bloco do Markdown do capítulo (mesma origem que a tela de leitura). */
export function blocosMarkdown(texto: string): Token[] {
  return marked.lexer(texto, { gfm: true });
}

/** Remove o "## Título" inicial quando repete o título do capítulo (o PDF já desenha a abertura). */
export function semTituloRepetido(texto: string, titulo: string) {
  const primeira = texto.trimStart().split("\n", 1)[0];
  const limpa = (s: string) => s.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim().toLowerCase();
  return /^#{1,2}\s/.test(primeira) && limpa(primeira) === limpa(titulo) ? texto.trimStart().slice(primeira.length).trimStart() : texto;
}

export type { Token, Tokens };
