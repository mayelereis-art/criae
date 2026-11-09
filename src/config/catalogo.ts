export const NICHOS_INICIAIS = [
  { id: "beleza", nome: "Beleza e estética", emoji: "💅" },
  { id: "saude", nome: "Saúde e bem-estar", emoji: "🌿", sensivel: true },
  { id: "fitness", nome: "Fitness e emagrecimento", emoji: "🏃", sensivel: true },
  { id: "educacao", nome: "Educação", emoji: "📚" },
  { id: "desenvolvimento", nome: "Desenvolvimento pessoal", emoji: "🧭" },
  { id: "financas", nome: "Finanças", emoji: "💰", sensivel: true },
  { id: "empreendedorismo", nome: "Empreendedorismo", emoji: "🚀" },
  { id: "culinaria", nome: "Culinária", emoji: "🍳" },
  { id: "maternidade", nome: "Maternidade", emoji: "🍼", sensivel: true },
  { id: "relacionamentos", nome: "Relacionamentos", emoji: "💬" },
  { id: "organizacao", nome: "Organização e produtividade", emoji: "🗂️" },
  { id: "pets", nome: "Pets", emoji: "🐾" },
  { id: "hobbies", nome: "Hobbies", emoji: "🎨" },
  { id: "marketing", nome: "Marketing digital", emoji: "📈" },
] as const;

export const ESTILOS_VISUAIS = [
  "Minimalista", "Editorial", "Elegante", "Moderno", "Corporativo",
  "Feminino", "Criativo", "Premium", "Didático", "Infantil",
] as const;

export const TONS = ["Acolhedor", "Direto e prático", "Inspirador", "Técnico", "Descontraído", "Profissional"] as const;
export const NIVEIS_PUBLICO = ["Iniciante", "Intermediário", "Avançado"] as const;
/** Tamanho padrão de todo e-book: mantém o consumo de créditos previsível (cerca de 172 por e-book). */
export const CAPITULOS_POR_EBOOK = 8;
export const PALAVRAS_POR_CAPITULO = "1.000 a 1.500";

/** Valores sugeridos; o administrador altera em configuracoes/planos (Etapa 7). */
export const PLANOS_PADRAO = [
  { id: "mensal", nome: "Mensal", precoCentavos: 4990, creditosMes: 300 },
  { id: "pro", nome: "Pro", precoCentavos: 8990, creditosMes: 800 },
  { id: "premium", nome: "Premium", precoCentavos: 14990, creditosMes: 1800 },
] as const;
