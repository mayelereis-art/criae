import { FONTES, type Identidade } from "@/config/identidade";
import { MEDIDAS, type FormatoCriativo } from "./dados";

// Monta a peça no navegador: a IA só faz a arte de fundo. Todo texto é do sistema, então não sai com erro de ortografia.

const CAPA = { largura: 600, altura: 900 };

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const corSobre = (hex: string) => (luminancia(hex) > 0.4 ? "#0B1220" : "#FFFFFF");

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const p of texto.trim().split(/\s+/)) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(tentativa).width <= largura || !atual) atual = tentativa;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Maior tamanho de fonte em que o texto cabe, sem nenhuma palavra estourar a largura. */
function ajustar(ctx: CanvasRenderingContext2D, texto: string, o: { peso: number; familia: string; largura: number; maxLinhas: number; maior: number; menor: number }) {
  for (let t = o.maior; t >= o.menor; t -= 2) {
    ctx.font = `${o.peso} ${t}px ${o.familia}`;
    const linhas = quebrar(ctx, texto, o.largura);
    if (linhas.length <= o.maxLinhas && linhas.every((l) => ctx.measureText(l).width <= o.largura)) return { tamanho: t, linhas };
  }
  ctx.font = `${o.peso} ${o.menor}px ${o.familia}`;
  return { tamanho: o.menor, linhas: quebrar(ctx, texto, o.largura) };
}

function escrever(ctx: CanvasRenderingContext2D, linhas: string[], x: number, y: number, entre: number) {
  linhas.forEach((l, i) => ctx.fillText(l, x, y + i * entre));
  return y + linhas.length * entre;
}

function cobrir(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, l: number, a: number) {
  const escala = Math.max(l / img.width, a / img.height);
  const lf = l / escala;
  const af = a / escala;
  ctx.drawImage(img, (img.width - lf) / 2, (img.height - af) / 2, lf, af, x, y, l, a);
}

export async function carregarFontes(id: Identidade) {
  const amostra = "AÁÃÇÉÊÍÓÕÚaáãçéêíóõú!?";
  await Promise.all([
    document.fonts.load(`700 40px ${FONTES[id.fonteTitulo].css}`, amostra),
    document.fonts.load(`400 40px ${FONTES[id.fonteCorpo].css}`, amostra),
    document.fonts.load(`700 40px ${FONTES[id.fonteCorpo].css}`, amostra),
  ]);
}

/** Capa com título, na mesma composição da capa do PDF (ver CapaPrevia). */
export function comporCapa(id: Identidade, titulo: string, subtitulo: string, arte: ImageBitmap | null) {
  const canvas = document.createElement("canvas");
  canvas.width = CAPA.largura;
  canvas.height = CAPA.altura;
  const ctx = canvas.getContext("2d")!;
  const { largura: L, altura: A } = CAPA;
  const fonteT = FONTES[id.fonteTitulo].css;
  const fonteC = FONTES[id.fonteCorpo].css;
  ctx.fillStyle = id.cores.fundo;
  ctx.fillRect(0, 0, L, A);
  const pintarArte = (x: number, y: number, l: number, a: number) => {
    if (arte) return cobrir(ctx, arte, x, y, l, a);
    const g = ctx.createLinearGradient(x, y, x + l, y + a);
    g.addColorStop(0, id.cores.primaria);
    g.addColorStop(1, id.cores.secundaria);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, l, a);
  };
  const bloco = (x: number, y: number, largura: number, cor: string, centro: boolean, paraBaixo: boolean) => {
    const t = ajustar(ctx, titulo, { peso: 700, familia: fonteT, largura, maxLinhas: 5, maior: 56, menor: 30 });
    ctx.font = `400 22px ${fonteC}`;
    const sub = subtitulo ? quebrar(ctx, subtitulo, largura).slice(0, 3) : [];
    const altura = t.linhas.length * t.tamanho * 1.14 + (sub.length ? 16 + sub.length * 28 : 0);
    let yy = paraBaixo ? y : y - altura;
    ctx.fillStyle = cor;
    ctx.textAlign = centro ? "center" : "left";
    ctx.textBaseline = "top";
    const px = centro ? x + largura / 2 : x;
    ctx.font = `700 ${t.tamanho}px ${fonteT}`;
    yy = escrever(ctx, t.linhas, px, yy, t.tamanho * 1.14);
    ctx.font = `400 22px ${fonteC}`;
    if (sub.length) escrever(ctx, sub, px, yy + 16, 28);
    return altura;
  };
  if (id.layoutCapa === "faixa") {
    pintarArte(0, 0, L, A * 0.58);
    ctx.fillStyle = id.cores.primaria;
    ctx.fillRect(0, A * 0.58, L, A * 0.42);
    bloco(44, A * 0.58 + 40, L - 88, corSobre(id.cores.primaria), false, true);
  } else if (id.layoutCapa === "moldura") {
    const altura = bloco(44, 44, L - 88, id.cores.texto, false, true);
    ctx.fillStyle = id.cores.primaria;
    ctx.fillRect(44, 44 + altura + 20, L - 88, 4);
    pintarArte(44, A * 0.42, L - 88, A * 0.58 - 44);
  } else {
    pintarArte(0, 0, L, A);
    const g = ctx.createLinearGradient(0, 0, 0, A);
    g.addColorStop(0, "rgba(0,0,0,.15)");
    g.addColorStop(1, "rgba(0,0,0,.72)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
    bloco(44, A - 56, L - 88, "#FFFFFF", true, false);
  }
  return canvas;
}

function livro(ctx: CanvasRenderingContext2D, capa: HTMLCanvasElement, x: number, y: number, altura: number) {
  const largura = (altura * capa.width) / capa.height;
  ctx.save();
  ctx.translate(x + largura / 2, y + altura / 2);
  ctx.rotate(-0.045);
  ctx.translate(-largura / 2, -altura / 2);
  ctx.shadowColor = "rgba(0,0,0,.55)";
  ctx.shadowBlur = 46;
  ctx.shadowOffsetX = 14;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = "#F4F1EA"; // miolo aparecendo na lateral
  ctx.fillRect(10, 8, largura, altura - 8);
  ctx.shadowColor = "transparent";
  ctx.drawImage(capa, 0, 0, largura, altura);
  const lombada = ctx.createLinearGradient(0, 0, largura * 0.06, 0);
  lombada.addColorStop(0, "rgba(0,0,0,.32)");
  lombada.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = lombada;
  ctx.fillRect(0, 0, largura * 0.06, altura);
  ctx.restore();
}

export type DadosComposicao = {
  formato: FormatoCriativo; titulo: string; apoio: string; cta: string; identidade: Identidade;
  fundo: ImageBitmap; capa: HTMLCanvasElement | null;
};

/** Gera o JPEG final. No story, topo e base ficam livres para a interface do aplicativo. */
export async function comporCriativo(d: DadosComposicao): Promise<Blob> {
  const { largura: L, altura: A } = MEDIDAS[d.formato];
  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext("2d")!;
  cobrir(ctx, d.fundo, 0, 0, L, A);

  const margem = 72;
  const topo = d.formato === "story" ? 250 : margem;
  const base = d.formato === "story" ? A - 340 : A - margem;
  const larguraTexto = L - margem * 2;
  const fonteT = FONTES[d.identidade.fonteTitulo].css;
  const fonteC = FONTES[d.identidade.fonteCorpo].css;
  const comLivro = !!d.capa;

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const t = ajustar(ctx, d.titulo, { peso: 700, familia: fonteT, largura: larguraTexto, maxLinhas: comLivro ? 3 : 4, maior: d.formato === "quadrado" ? 76 : 88, menor: 44 });
  const entreTitulo = t.tamanho * 1.12;
  const a = d.apoio ? ajustar(ctx, d.apoio, { peso: 400, familia: fonteC, largura: larguraTexto, maxLinhas: 3, maior: 38, menor: 28 }) : null;
  const entreApoio = (a?.tamanho ?? 0) * 1.3;
  const alturaTexto = t.linhas.length * entreTitulo + (a ? 24 + a.linhas.length * entreApoio : 0);

  ctx.font = `700 34px ${fonteC}`;
  const larguraBotao = Math.min(ctx.measureText(d.cta).width + 88, comLivro ? 470 : larguraTexto);
  const alturaBotao = 92;
  const corBotao = d.identidade.cores.primaria;

  // Véu escuro onde há texto: garante leitura sobre qualquer arte.
  const veu = ctx.createLinearGradient(0, 0, 0, A);
  if (comLivro) {
    const fim = Math.min(0.8, (topo + alturaTexto + 120) / A);
    veu.addColorStop(0, "rgba(5,10,20,.86)");
    veu.addColorStop(fim * 0.75, "rgba(5,10,20,.74)");
    veu.addColorStop(fim, "rgba(5,10,20,.18)");
    veu.addColorStop(Math.max(fim, 0.82), "rgba(5,10,20,.35)");
    veu.addColorStop(1, "rgba(5,10,20,.8)");
  } else {
    const inicio = Math.max(0, (base - alturaTexto - alturaBotao - 170) / A);
    veu.addColorStop(0, "rgba(5,10,20,.1)");
    veu.addColorStop(inicio, "rgba(5,10,20,.16)");
    veu.addColorStop(Math.min(1, inicio + 0.16), "rgba(5,10,20,.78)");
    veu.addColorStop(1, "rgba(5,10,20,.9)");
  }
  ctx.fillStyle = veu;
  ctx.fillRect(0, 0, L, A);

  const yTexto = comLivro ? topo : base - alturaBotao - 40 - alturaTexto;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${t.tamanho}px ${fonteT}`;
  let y = escrever(ctx, t.linhas, margem, yTexto, entreTitulo);
  if (a) {
    ctx.font = `400 ${a.tamanho}px ${fonteC}`;
    ctx.fillStyle = "rgba(255,255,255,.92)";
    y = escrever(ctx, a.linhas, margem, y + 24, entreApoio);
  }

  const yBotao = base - alturaBotao;
  if (d.capa) {
    const yLivro = y + 36;
    const alturaLivro = Math.min(base - yLivro, d.formato === "story" ? 860 : 640);
    const larguraLivro = (alturaLivro * d.capa.width) / d.capa.height;
    if (alturaLivro > 160) livro(ctx, d.capa, L - margem - larguraLivro - 12, yLivro, alturaLivro);
  }

  ctx.fillStyle = corBotao;
  ctx.beginPath();
  ctx.roundRect(margem, yBotao, larguraBotao, alturaBotao, 20);
  ctx.fill();
  ctx.fillStyle = corSobre(corBotao);
  ctx.font = `700 34px ${fonteC}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(d.cta, margem + larguraBotao / 2, yBotao + alturaBotao / 2 + 1, larguraBotao - 32);

  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Não foi possível montar a imagem."))), "image/jpeg", 0.92));
}
