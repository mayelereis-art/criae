import { comLink, dataDoDia, type DocCampanha } from "../campanhas";
import type { Campanha } from "../ia/esquemas";
import { MEDIDAS, type Criativo } from "./dados";

const lista = (itens: string[]) => itens.map((t, i) => `${i + 1}. ${t}`).join("\n\n");

/** Cada canal em texto corrido, com o link real: é o conteúdo que vai para o ZIP. */
export function textosPorCanal(d: Campanha, url: string | null): Record<string, string> {
  const ig = (t: string) => comLink(t, url, "instagram");
  const tt = (t: string) => comLink(t, url, "tiktok");
  const fb = (t: string) => comLink(t, url, "facebook");
  const wa = (t: string) => comLink(t, url, "whatsapp");
  const ad = (t: string) => comLink(t, url, "anuncios");
  return {
    "estrategia.txt": [
      `POSICIONAMENTO\n${d.estrategia.posicionamento}`,
      `MENSAGEM CENTRAL\n${d.estrategia.mensagemCentral}`,
      `ÂNGULOS\n${lista(d.estrategia.angulos)}`,
      `CANAIS PRIORITÁRIOS\n${lista(d.estrategia.canaisPrioritarios.map((c) => `${c.canal}: ${c.motivo}`))}`,
      `OBJEÇÕES\n${lista(d.estrategia.objecoes.map((o) => `${o.objecao}\n${o.resposta}`))}`,
    ].join("\n\n\n"),
    "instagram.txt": [
      `POSTS\n${lista(d.instagram.posts.map((p) => `${p.ideia}\n\n${ig(p.legenda)}\n\n${p.hashtags.join(" ")}`))}`,
      `CARROSSÉIS\n${lista(d.instagram.carrosseis.map((c) => `${c.titulo}\n${c.slides.map((s, i) => `Slide ${i + 1}: ${s.titulo}\n${s.texto}`).join("\n")}\n\nLegenda: ${ig(c.legenda)}`))}`,
      `STORIES\n${lista(d.instagram.stories.map((s) => `${s.tema}\n${s.telas.map((t, i) => `Tela ${i + 1}: ${t}`).join("\n")}\nChamada: ${ig(s.chamada)}`))}`,
      `CHAMADAS COMERCIAIS\n${lista(d.instagram.chamadas.map(ig))}`,
    ].join("\n\n\n"),
    "tiktok.txt": [
      `ROTEIROS\n${lista(d.tiktok.roteiros.map((r) => `${r.titulo}\nGancho: ${r.gancho}\n${r.cenas.map((c) => `[${c.tempo}] Fala: ${c.fala}\nNa tela: ${c.naTela}`).join("\n")}\nCTA: ${tt(r.cta)}\n\nTexto da publicação: ${tt(r.textoPublicacao)}`))}`,
      `IDEIAS DE CONTEÚDO\n${lista(d.tiktok.ideias)}`,
      `GANCHOS DE ABERTURA\n${lista(d.tiktok.ganchos)}`,
    ].join("\n\n\n"),
    "facebook.txt": [
      `ANÚNCIOS\n${lista(d.facebook.anuncios.map((a) => `${a.titulo}\n${fb(a.texto)}`))}`,
      `TEXTOS COMERCIAIS\n${lista(d.facebook.textos.map(fb))}`,
    ].join("\n\n\n"),
    "whatsapp.txt": [
      `DIVULGAÇÃO\n${lista(d.whatsapp.divulgacao.map(wa))}`,
      `APRESENTAÇÃO\n${lista(d.whatsapp.apresentacao.map(wa))}`,
      `GRUPOS\n${lista(d.whatsapp.grupos.map(wa))}`,
      `LANÇAMENTO\n${lista(d.whatsapp.lancamento.map(wa))}`,
    ].join("\n\n\n"),
    "anuncios.txt": lista(d.anuncios.map((a) => `Headline: ${a.headline}\nTexto principal: ${ad(a.textoPrincipal)}\nDescrição: ${a.descricao}\nCTA: ${a.cta}`)),
  };
}

const celula = (t: string) => `"${t.replaceAll('"', '""')}"`;

export function calendarioCsv(c: DocCampanha) {
  const linhas = [...c.dados.calendario].sort((a, b) => a.dia - b.dia).map((i) =>
    [dataDoDia(c.dataInicio, i.dia).toLocaleDateString("pt-BR"), i.canal, i.formato, i.tema, i.orientacao].map(celula).join(";"));
  // Marca BOM: o Excel em português só reconhece os acentos com ela.
  return `﻿${["Data", "Canal", "Formato", "Tema", "O que publicar"].map(celula).join(";")}\n${linhas.join("\n")}`;
}

export const nomeArquivo = (c: Criativo, indice: number) =>
  `${String(indice + 1).padStart(2, "0")}-${MEDIDAS[c.formato].rotulo.replace("×", "x")}-${c.plataforma.normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 30)}.jpg`;

export function textoCriativo(c: Criativo, indice: number, url: string | null) {
  return [
    `PEÇA ${indice + 1} (${MEDIDAS[c.formato].rotulo}): ${nomeArquivo(c, indice)}`,
    `Mídia: ${c.midia ?? "-"} | Plataforma: ${c.plataforma}`,
    `Gancho: ${c.tipoGancho ?? "-"} | Emoção: ${c.emocao ?? "-"}`,
    `Como usar: ${comLink(c.comoUsar ?? "-", url, "criativo")}`,
    `Título: ${c.titulo}`,
    `Apoio: ${c.apoio}`,
    `CTA: ${c.cta}`,
    `Texto principal: ${comLink(c.textoPrincipal, url, "criativo")}`,
    `Legenda: ${comLink(c.legenda, url, "criativo")}`,
  ].join("\n");
}
