import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/700.css";
import "@fontsource/merriweather/400.css";
import "@fontsource/merriweather/700.css";
import "@fontsource/playfair-display/700.css";
import { FONTES, type Identidade } from "@/config/identidade";

/**
 * Prévia da capa em HTML. A composição espelha a capa do PDF (src/lib/documentos/pdf.tsx):
 * a IA gera só a arte; título, subtítulo e autor são texto do sistema, sem erro de ortografia.
 */
export function CapaPrevia({ id, titulo, subtitulo, imagemUrl, largura = 300 }: {
  id: Identidade; titulo: string; subtitulo: string; imagemUrl?: string; largura?: number;
}) {
  const { cores, layoutCapa } = id;
  const fonteT = FONTES[id.fonteTitulo].css;
  const fonteC = FONTES[id.fonteCorpo].css;
  const escala = largura / 300;
  const arte = imagemUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${cores.primaria}, ${cores.secundaria})` }} />
  );
  const blocoTitulo = (claro: boolean) => (
    <div style={{ color: claro ? "#fff" : cores.texto }}>
      <p style={{ fontFamily: fonteT, fontWeight: 700, fontSize: 26 * escala, lineHeight: 1.12 }}>{titulo}</p>
      {subtitulo && <p style={{ fontFamily: fonteC, fontSize: 11 * escala, marginTop: 8 * escala, opacity: 0.9, lineHeight: 1.35 }}>{subtitulo}</p>}
      {id.autor && <p style={{ fontFamily: fonteC, fontSize: 10 * escala, marginTop: 14 * escala, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.85 }}>{id.autor}</p>}
    </div>
  );

  return (
    <div
      className="relative overflow-hidden rounded-md shadow-2xl ring-1 ring-black/10"
      style={{ width: largura, aspectRatio: "2 / 3", background: cores.fundo }}
      aria-label={`Prévia da capa: ${titulo}`}
      role="img"
    >
      {layoutCapa === "centralizada" && (
        <>
          <div className="absolute inset-0">{arte}</div>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.65))" }} />
          <div className="absolute inset-x-0 bottom-0 text-center" style={{ padding: 24 * escala }}>{blocoTitulo(true)}</div>
        </>
      )}
      {layoutCapa === "faixa" && (
        <>
          <div className="absolute inset-x-0 top-0" style={{ height: "58%" }}>{arte}</div>
          <div className="absolute inset-x-0 bottom-0" style={{ height: "42%", background: cores.primaria, padding: 22 * escala }}>{blocoTitulo(true)}</div>
        </>
      )}
      {layoutCapa === "moldura" && (
        <div className="absolute inset-0 flex flex-col" style={{ padding: 22 * escala }}>
          <div style={{ borderBottom: `${2 * escala}px solid ${cores.primaria}`, paddingBottom: 12 * escala }}>{blocoTitulo(false)}</div>
          <div className="mt-auto overflow-hidden" style={{ height: "56%", border: `${1.5 * escala}px solid ${cores.secundaria}` }}>{arte}</div>
        </div>
      )}
    </div>
  );
}
