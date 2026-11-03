/** Fontes disponíveis no e-book. Todas embutidas no PDF (pacotes @fontsource, licença OFL). */
export const FONTES = {
  inter: { nome: "Inter", css: "'Inter', sans-serif", tipo: "sem serifa" },
  montserrat: { nome: "Montserrat", css: "'Montserrat', sans-serif", tipo: "sem serifa" },
  nunito: { nome: "Nunito", css: "'Nunito', sans-serif", tipo: "arredondada" },
  lora: { nome: "Lora", css: "'Lora', serif", tipo: "serifa" },
  merriweather: { nome: "Merriweather", css: "'Merriweather', serif", tipo: "serifa" },
  playfair: { nome: "Playfair Display", css: "'Playfair Display', serif", tipo: "serifa de contraste" },
} as const;
export type ChaveFonte = keyof typeof FONTES;

export const LAYOUTS_CAPA = {
  centralizada: "Título centralizado sobre a imagem",
  faixa: "Imagem em cima, faixa de cor com o título embaixo",
  moldura: "Imagem emoldurada, título no topo",
} as const;
export type LayoutCapa = keyof typeof LAYOUTS_CAPA;

export const ELEMENTOS = {
  filete: "Filetes finos nos títulos",
  bloco: "Blocos de cor nos destaques",
  minimo: "Sem enfeites",
} as const;
export type Elementos = keyof typeof ELEMENTOS;

export type Cores = { primaria: string; secundaria: string; fundo: string; texto: string; destaque: string };

export type Identidade = {
  estilo: string;
  cores: Cores;
  fonteTitulo: ChaveFonte;
  fonteCorpo: ChaveFonte;
  layoutCapa: LayoutCapa;
  elementos: Elementos;
  estiloImagens: string;
  autor: string;
};

type Preset = Omit<Identidade, "autor" | "estilo">;

export const ESTILOS: Record<string, Preset> = {
  Minimalista: {
    cores: { primaria: "#111827", secundaria: "#6B7280", fundo: "#FFFFFF", texto: "#1F2937", destaque: "#F3F4F6" },
    fonteTitulo: "inter", fonteCorpo: "inter", layoutCapa: "moldura", elementos: "minimo",
    estiloImagens: "fotografia clean, fundo neutro claro, muito espaço vazio, luz natural suave",
  },
  Editorial: {
    cores: { primaria: "#7C2D12", secundaria: "#A16207", fundo: "#FFFBF5", texto: "#292524", destaque: "#F5EDE0" },
    fonteTitulo: "playfair", fonteCorpo: "lora", layoutCapa: "moldura", elementos: "filete",
    estiloImagens: "fotografia editorial de revista, composição elegante, tons quentes",
  },
  Elegante: {
    cores: { primaria: "#1E1B4B", secundaria: "#B08D57", fundo: "#FFFFFF", texto: "#1F2937", destaque: "#F6F1E7" },
    fonteTitulo: "playfair", fonteCorpo: "lora", layoutCapa: "centralizada", elementos: "filete",
    estiloImagens: "fotografia sofisticada, luz suave, detalhes em dourado, tons profundos",
  },
  Moderno: {
    cores: { primaria: "#2F6BFF", secundaria: "#0EA5E9", fundo: "#FFFFFF", texto: "#0F172A", destaque: "#EAF1FF" },
    fonteTitulo: "montserrat", fonteCorpo: "inter", layoutCapa: "faixa", elementos: "bloco",
    estiloImagens: "ilustração digital moderna, formas geométricas, cores vibrantes e chapadas",
  },
  Corporativo: {
    cores: { primaria: "#0F3D6E", secundaria: "#3B82F6", fundo: "#FFFFFF", texto: "#1E293B", destaque: "#EEF3F9" },
    fonteTitulo: "montserrat", fonteCorpo: "inter", layoutCapa: "faixa", elementos: "filete",
    estiloImagens: "fotografia profissional de ambiente de trabalho, sóbria, bem iluminada",
  },
  Feminino: {
    cores: { primaria: "#9D3A5E", secundaria: "#D98FA6", fundo: "#FFFAFB", texto: "#3B2A30", destaque: "#FBEAF0" },
    fonteTitulo: "playfair", fonteCorpo: "nunito", layoutCapa: "centralizada", elementos: "bloco",
    estiloImagens: "fotografia delicada, tons rosados e nude, luz suave, flores e texturas macias",
  },
  Criativo: {
    cores: { primaria: "#E4572E", secundaria: "#17BEBB", fundo: "#FFFDF7", texto: "#1D1D1F", destaque: "#FFF1D6" },
    fonteTitulo: "montserrat", fonteCorpo: "nunito", layoutCapa: "faixa", elementos: "bloco",
    estiloImagens: "ilustração colorida estilo colagem, texturas de papel, traço solto",
  },
  Premium: {
    cores: { primaria: "#0B0B0F", secundaria: "#C9A227", fundo: "#FFFFFF", texto: "#18181B", destaque: "#F5F0E1" },
    fonteTitulo: "playfair", fonteCorpo: "merriweather", layoutCapa: "centralizada", elementos: "filete",
    estiloImagens: "fotografia de luxo, fundo escuro, iluminação dramática, reflexos dourados",
  },
  Didático: {
    cores: { primaria: "#047857", secundaria: "#F59E0B", fundo: "#FFFFFF", texto: "#1F2937", destaque: "#ECFDF5" },
    fonteTitulo: "nunito", fonteCorpo: "inter", layoutCapa: "faixa", elementos: "bloco",
    estiloImagens: "ilustração explicativa limpa, estilo infográfico, cores claras",
  },
  Infantil: {
    cores: { primaria: "#7C3AED", secundaria: "#F97316", fundo: "#FFFDF5", texto: "#2E1065", destaque: "#F3E8FF" },
    fonteTitulo: "nunito", fonteCorpo: "nunito", layoutCapa: "centralizada", elementos: "bloco",
    estiloImagens: "ilustração infantil fofa, traço arredondado, cores alegres, personagens simpáticos",
  },
};

export const identidadePadrao = (estilo: string, autor: string): Identidade => ({ estilo, autor, ...ESTILOS[estilo] });
