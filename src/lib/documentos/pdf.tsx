/* eslint-disable jsx-a11y/alt-text -- o Image do @react-pdf não tem atributo alt */
import "server-only";
import path from "node:path";
import { Document, Font, Image, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { FONTES, type ChaveFonte, type Identidade } from "@/config/identidade";
import type { Planejamento } from "../ia/esquemas";
import { blocosMarkdown, semTituloRepetido, type Token, type Tokens } from "./markdown";

// ---------- Fontes (embutidas no PDF) ----------

const PACOTE: Record<ChaveFonte, string> = {
  inter: "inter", montserrat: "montserrat", nunito: "nunito", lora: "lora", merriweather: "merriweather", playfair: "playfair-display",
};
let fontesRegistradas = false;
function registrarFontes() {
  if (fontesRegistradas) return;
  const arquivo = (pacote: string, peso: number, estilo: "normal" | "italic") =>
    path.join(process.cwd(), "node_modules", "@fontsource", pacote, "files", `${pacote}-latin-${peso}-${estilo}.woff`);
  for (const [chave, pacote] of Object.entries(PACOTE)) {
    Font.register({
      family: chave,
      fonts: [
        { src: arquivo(pacote, 400, "normal"), fontWeight: 400 },
        { src: arquivo(pacote, 400, "italic"), fontWeight: 400, fontStyle: "italic" },
        { src: arquivo(pacote, 700, "normal"), fontWeight: 700 },
        { src: arquivo(pacote, 700, "italic"), fontWeight: 700, fontStyle: "italic" },
      ],
    });
  }
  Font.register({ family: "mono", src: arquivo("jetbrains-mono", 400, "normal") });
  // Sem hifenização automática (o padrão é do inglês e quebra palavras em português de forma errada).
  Font.registerHyphenationCallback((palavra) => [palavra]);
  fontesRegistradas = true;
}

// ---------- Tipos de entrada ----------

export type EntradaPdf = {
  planejamento: Planejamento;
  identidade: Identidade;
  capitulos: { ordem: number; titulo: string; conteudo: string }[];
  imagens: { capa?: string; capitulos: Record<number, string> };
  rascunho: boolean;
};

// ---------- Markdown → componentes ----------

function inline(tokens: Token[] | undefined, s: Estilos): ReactNode[] {
  return (tokens ?? []).map((t, i) => {
    switch (t.type) {
      case "strong": return <Text key={i} style={{ fontWeight: 700 }}>{inline((t as Tokens.Strong).tokens, s)}</Text>;
      case "em": return <Text key={i} style={{ fontStyle: "italic" }}>{inline((t as Tokens.Em).tokens, s)}</Text>;
      case "codespan": return <Text key={i} style={s.codigoInline}>{(t as Tokens.Codespan).text}</Text>;
      case "link": return <Link key={i} src={(t as Tokens.Link).href} style={s.link}>{inline((t as Tokens.Link).tokens, s)}</Link>;
      case "br": return <Text key={i}>{"\n"}</Text>;
      case "del": return <Text key={i} style={{ textDecoration: "line-through" }}>{inline((t as Tokens.Del).tokens, s)}</Text>;
      case "text": {
        const tt = t as Tokens.Text;
        return tt.tokens ? <Text key={i}>{inline(tt.tokens, s)}</Text> : <Text key={i}>{decodificar(tt.text)}</Text>;
      }
      default: return <Text key={i}>{decodificar((t as { text?: string }).text ?? t.raw)}</Text>;
    }
  });
}

const decodificar = (t: string) =>
  t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function blocos(tokens: Token[], s: Estilos): ReactNode[] {
  return tokens.map((t, i) => {
    switch (t.type) {
      case "heading": {
        const h = t as Tokens.Heading;
        // Título nunca fica sozinho no pé da página: exige espaço para o texto que vem depois.
        return <Text key={i} style={h.depth <= 2 ? s.h2 : s.h3} minPresenceAhead={60}>{inline(h.tokens, s)}</Text>;
      }
      case "paragraph": return <Text key={i} style={s.p}>{inline((t as Tokens.Paragraph).tokens, s)}</Text>;
      case "list": {
        const l = t as Tokens.List;
        return (
          <View key={i} style={s.lista}>
            {l.items.map((it, j) => (
              <View key={j} style={s.itemLista} wrap={false}>
                <Text style={s.marcador}>{l.ordered ? `${(Number(l.start) || 1) + j}.` : "•"}</Text>
                <Text style={s.textoItem}>{inline(it.tokens.flatMap((x) => (x.type === "text" || x.type === "paragraph") && "tokens" in x ? (x.tokens as Token[]) : [x]), s)}</Text>
              </View>
            ))}
          </View>
        );
      }
      case "blockquote": return <View key={i} style={s.destaque} wrap={false}>{blocos((t as Tokens.Blockquote).tokens, s)}</View>;
      // Espaços viram não separáveis: o react-pdf colapsa espaços e desalinharia diagramas em texto.
      case "code": return <View key={i} style={s.codigo} wrap={false}><Text style={s.textoCodigo}>{(t as Tokens.Code).text.replace(/ /g, " ")}</Text></View>;
      case "table": {
        const tb = t as Tokens.Table;
        return (
          <View key={i} style={s.tabela}>
            <View style={[s.linhaTabela, s.cabecalhoTabela]} wrap={false}>
              {tb.header.map((c, j) => <Text key={j} style={s.celula}>{inline(c.tokens, s)}</Text>)}
            </View>
            {tb.rows.map((r, j) => (
              <View key={j} style={s.linhaTabela} wrap={false}>
                {r.map((c, k) => <Text key={k} style={s.celula}>{inline(c.tokens, s)}</Text>)}
              </View>
            ))}
          </View>
        );
      }
      case "hr": return <View key={i} style={s.hr} />;
      case "space": return null;
      default: return t.raw.trim() ? <Text key={i} style={s.p}>{decodificar(t.raw)}</Text> : null;
    }
  });
}

// ---------- Estilos a partir da identidade ----------

function criarEstilos(id: Identidade) {
  const { cores } = id;
  const filete = id.elementos === "filete";
  const bloco = id.elementos === "bloco";
  return StyleSheet.create({
    pagina: { backgroundColor: cores.fundo, color: cores.texto, fontFamily: id.fonteCorpo, fontSize: 10.5, paddingTop: 54, paddingBottom: 56, paddingHorizontal: 46 },
    cabecalho: { position: "absolute", top: 22, left: 46, right: 46, fontSize: 7.5, color: cores.secundaria, textAlign: "right" },
    rodape: { position: "absolute", bottom: 24, left: 46, right: 46, fontSize: 8, color: cores.secundaria, flexDirection: "row", justifyContent: "space-between" },
    h1: { fontFamily: id.fonteTitulo, fontWeight: 700, fontSize: 22, color: cores.primaria, lineHeight: 1.2, marginBottom: 14 },
    h2: { fontFamily: id.fonteTitulo, fontWeight: 700, fontSize: 15, color: cores.primaria, marginTop: 16, marginBottom: 6, lineHeight: 1.25, ...(filete ? { borderBottomWidth: 0.8, borderBottomColor: cores.secundaria, paddingBottom: 3 } : {}) },
    h3: { fontFamily: id.fonteTitulo, fontWeight: 700, fontSize: 12, color: cores.primaria, marginTop: 12, marginBottom: 4 },
    // lineHeight só nos textos do corpo: se ficar na Page, o react-pdf remultiplica o valor herdado
    // nos elementos "fixed" (cabeçalho/rodapé) a cada página até estourar.
    p: { marginBottom: 7, textAlign: "justify", lineHeight: "15.5pt" },
    link: { color: cores.primaria, textDecoration: "underline" },
    lista: { marginBottom: 7 },
    itemLista: { flexDirection: "row", marginBottom: 3, lineHeight: "15.5pt" },
    marcador: { width: 16, color: cores.primaria },
    textoItem: { flex: 1 },
    destaque: bloco
      ? { backgroundColor: cores.destaque, borderRadius: 6, padding: 10, marginVertical: 8 }
      : { borderLeftWidth: 2.5, borderLeftColor: cores.primaria, paddingLeft: 10, paddingVertical: 4, marginVertical: 8 },
    codigo: { backgroundColor: cores.destaque, padding: 8, borderRadius: 4, marginVertical: 6 },
    textoCodigo: { fontFamily: "mono", fontSize: 7.5, lineHeight: "10pt" },
    codigoInline: { fontFamily: "mono", fontSize: 9, backgroundColor: cores.destaque },
    tabela: { marginVertical: 8, borderTopWidth: 0.5, borderLeftWidth: 0.5, borderColor: cores.secundaria },
    linhaTabela: { flexDirection: "row" },
    cabecalhoTabela: { backgroundColor: cores.destaque, fontWeight: 700 },
    celula: { flex: 1, padding: 4, fontSize: 9, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: cores.secundaria },
    hr: { borderBottomWidth: 0.5, borderBottomColor: cores.secundaria, marginVertical: 10 },
    rotuloCapitulo: { fontSize: 9, letterSpacing: 2, color: cores.secundaria, textTransform: "uppercase", marginBottom: 6 },
    imagemCapitulo: { width: "100%", height: 190, objectFit: "cover", borderRadius: 6, marginBottom: 16 },
    itemSumario: { flexDirection: "row", marginBottom: 7, fontSize: 10.5 },
  });
}
type Estilos = ReturnType<typeof criarEstilos>;

// ---------- Capa ----------

function Capa({ e }: { e: EntradaPdf }) {
  const { identidade: id, planejamento: p } = e;
  const { cores } = id;
  const arte = e.imagens.capa
    ? <Image src={e.imagens.capa} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    : <View style={{ width: "100%", height: "100%", backgroundColor: cores.primaria }}><View style={{ position: "absolute", right: -60, bottom: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: cores.secundaria, opacity: 0.35 }} /></View>;
  const bloco = (claro: boolean) => (
    <View style={{ color: claro ? "#FFFFFF" : cores.texto }}>
      <Text style={{ fontFamily: id.fonteTitulo, fontWeight: 700, fontSize: 30, lineHeight: 1.12 }}>{p.tituloComercial}</Text>
      {p.subtitulo ? <Text style={{ fontFamily: id.fonteCorpo, fontSize: 11.5, marginTop: 10, lineHeight: 1.4 }}>{p.subtitulo}</Text> : null}
      {id.autor ? <Text style={{ fontFamily: id.fonteCorpo, fontSize: 9.5, marginTop: 16, letterSpacing: 1.5, textTransform: "uppercase" }}>{id.autor}</Text> : null}
    </View>
  );
  return (
    <Page size="A5" style={{ backgroundColor: cores.fundo, fontFamily: id.fonteCorpo }}>
      {id.layoutCapa === "centralizada" && (
        <View style={{ flex: 1 }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>{arte}</View>
          {e.imagens.capa ? <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%", backgroundColor: "#000000", opacity: 0.5 }} /> : null}
          <View style={{ position: "absolute", left: 30, right: 30, bottom: 36, textAlign: "center" }}>{bloco(true)}</View>
        </View>
      )}
      {id.layoutCapa === "faixa" && (
        <View style={{ flex: 1 }}>
          <View style={{ height: "58%" }}>{arte}</View>
          <View style={{ height: "42%", backgroundColor: cores.primaria, padding: 28, justifyContent: "center" }}>{bloco(true)}</View>
        </View>
      )}
      {id.layoutCapa === "moldura" && (
        <View style={{ flex: 1, padding: 30 }}>
          <View style={{ borderBottomWidth: 2, borderBottomColor: cores.primaria, paddingBottom: 14 }}>{bloco(false)}</View>
          <View style={{ marginTop: "auto", height: "56%", borderWidth: 1.5, borderColor: cores.secundaria }}>{arte}</View>
        </View>
      )}
    </Page>
  );
}

// ---------- Documento ----------

type Secao = { id: string; titulo: string };

function Livro({ e, paginas, aoPosicionar }: { e: EntradaPdf; paginas: Record<string, number>; aoPosicionar: (id: string, pagina: number) => void }) {
  registrarFontes();
  const s = criarEstilos(e.identidade);
  const p = e.planejamento;
  const ano = new Date().getFullYear();
  const caps = [...e.capitulos].sort((a, b) => a.ordem - b.ordem);
  const secoes: Secao[] = [
    { id: "introducao", titulo: "Introdução" },
    ...caps.map((c) => ({ id: `cap-${c.ordem}`, titulo: `${c.ordem + 1}. ${c.titulo}` })),
    { id: "conclusao", titulo: "Conclusão" },
  ];
  // Título da seção = âncora do link do sumário. O marcador mínimo ao lado informa a página real
  // (texto dinâmico não reserva espaço no layout, então o título em si não pode ser dinâmico).
  const tituloSecao = (id: string, texto: string) => (
    <View id={id} minPresenceAhead={80}>
      <Text style={{ fontSize: 1, color: e.identidade.cores.fundo }} render={({ pageNumber }) => { aoPosicionar(id, pageNumber); return "."; }} />
      <Text style={s.h1}>{texto}</Text>
    </View>
  );

  const cabecalhoRodape = (
    <>
      <Text style={s.cabecalho} fixed>{p.tituloComercial}</Text>
      <View style={s.rodape} fixed>
        <Text>{e.rascunho ? "RASCUNHO — material incompleto" : (e.identidade.autor || "")}</Text>
        <Text render={({ pageNumber }) => String(pageNumber)} />
      </View>
    </>
  );

  return (
    <Document title={p.tituloComercial} author={e.identidade.autor || undefined} subject={p.subtitulo} creator="Criaê" producer="Criaê" language="pt-BR">
      <Capa e={e} />

      <Page size="A5" style={s.pagina}>
        {cabecalhoRodape}
        {/* Apresentação */}
        <View style={{ marginTop: 40 }}>
          <Text style={s.h1}>{p.tituloComercial}</Text>
          <Text style={[s.p, { fontSize: 12, textAlign: "left" }]}>{p.subtitulo}</Text>
          <View style={[s.destaque, { marginTop: 20 }]}><Text>{p.propostaValor}</Text></View>
        </View>

        {/* Direitos e avisos */}
        <View break style={{ marginTop: 200, fontSize: 8.5, color: e.identidade.cores.secundaria }}>
          <Text style={{ marginBottom: 6 }}>© {ano} {e.identidade.autor || "Autoria do produto"}. Todos os direitos reservados.</Text>
          <Text style={{ marginBottom: 6 }}>Nenhuma parte deste material pode ser reproduzida, distribuída ou revendida sem autorização por escrito.</Text>
          <Text style={{ marginBottom: 6 }}>Este conteúdo foi elaborado com apoio de inteligência artificial e revisado antes da publicação. Ele tem caráter informativo e não garante resultados específicos.</Text>
          {p.avisoTemaSensivel ? <Text style={{ marginBottom: 6, color: e.identidade.cores.texto }}>Aviso importante: {p.avisoTemaSensivel}</Text> : null}
        </View>

        {/* Sumário com links e páginas */}
        <View break>
          <Text style={s.h1}>Sumário</Text>
          {secoes.map((sec) => (
            <View key={sec.id} style={s.itemSumario}>
              <Link src={`#${sec.id}`} style={{ flex: 1, color: e.identidade.cores.texto, textDecoration: "none" }}>{sec.titulo}</Link>
              <Text style={{ width: 28, textAlign: "right", color: e.identidade.cores.primaria }}>{paginas[sec.id] ?? ""}</Text>
            </View>
          ))}
        </View>

        {/* Introdução: montada do planejamento aprovado */}
        <View break>
          {tituloSecao("introducao", "Introdução")}
          <Text style={s.p}>{p.introducao}</Text>
          <Text style={s.h3}>O que você vai encontrar</Text>
          {caps.map((c) => (
            <View key={c.ordem} style={s.itemLista} wrap={false}>
              <Text style={s.marcador}>{c.ordem + 1}.</Text>
              <Text style={s.textoItem}><Text style={{ fontWeight: 700 }}>{c.titulo}.</Text> {p.capitulos[c.ordem]?.objetivo ?? ""}</Text>
            </View>
          ))}
        </View>

        {caps.map((c) => (
          <View key={c.ordem} break>
            <Text style={s.rotuloCapitulo}>Capítulo {c.ordem + 1}</Text>
            {tituloSecao(`cap-${c.ordem}`, c.titulo)}
            {e.imagens.capitulos[c.ordem] ? <Image src={e.imagens.capitulos[c.ordem]} style={s.imagemCapitulo} /> : null}
            {blocos(blocosMarkdown(semTituloRepetido(c.conteudo, c.titulo)), s)}
          </View>
        ))}

        <View break>
          {tituloSecao("conclusao", "Conclusão")}
          <Text style={s.p}>{p.conclusao}</Text>
        </View>

        {/* Página final */}
        <View break style={{ marginTop: 160, textAlign: "center" }}>
          <Text style={[s.h2, { borderBottomWidth: 0, textAlign: "center" }]}>Que bom que você chegou até aqui</Text>
          <Text style={{ marginTop: 6 }}>{p.tituloComercial}</Text>
          {e.identidade.autor ? <Text style={{ marginTop: 4, color: e.identidade.cores.secundaria }}>{e.identidade.autor}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}

/**
 * Renderiza em duas passadas: a 1ª descobre em que página cai cada seção; a 2ª escreve o sumário com esses números.
 * Se o sumário mudar a paginação (raro), a 3ª passada corrige.
 */
export async function gerarPdf(e: EntradaPdf) {
  let paginas: Record<string, number> = {};
  let buffer: Buffer = Buffer.alloc(0);
  for (let passada = 0; passada < 3; passada++) {
    const encontradas: Record<string, number> = {};
    buffer = await renderToBuffer(<Livro e={e} paginas={paginas} aoPosicionar={(id, n) => (encontradas[id] = n)} />);
    const estavel = Object.keys(encontradas).every((k) => encontradas[k] === paginas[k]);
    paginas = encontradas;
    if (estavel && passada > 0) break;
  }
  const totalPaginas = (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  return { buffer, paginas, totalPaginas };
}

export { FONTES };
