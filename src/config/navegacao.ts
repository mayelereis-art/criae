import {
  LayoutDashboard, Package, Sparkles, Library, Compass, Lightbulb, Users, Wand2,
  Megaphone, Image as ImageIcon, PanelsTopLeft, CreditCard, Receipt,
  UserCircle, BadgeCheck, Coins, Plug, LifeBuoy, type LucideIcon,
} from "lucide-react";

export type ItemNav = { rotulo: string; href: string; icone: LucideIcon; etapa: number };
export type GrupoNav = { titulo: string; itens: ItemNav[] };

/** `etapa` = etapa do plano em que a tela passa a funcionar de verdade (ver docs/ARQUITETURA.md). */
export const NAVEGACAO: GrupoNav[] = [
  {
    titulo: "Gerenciamento",
    itens: [
      { rotulo: "Visão geral", href: "/visao-geral", icone: LayoutDashboard, etapa: 3 },
      { rotulo: "Meus produtos", href: "/produtos", icone: Package, etapa: 3 },
      { rotulo: "Criar com IA", href: "/criar", icone: Sparkles, etapa: 4 },
      { rotulo: "Biblioteca", href: "/biblioteca", icone: Library, etapa: 4 },
    ],
  },
  {
    titulo: "Inteligência de mercado",
    itens: [
      { rotulo: "Explorar nichos", href: "/nichos", icone: Compass, etapa: 4 },
      { rotulo: "Oportunidades", href: "/oportunidades", icone: Lightbulb, etapa: 4 },
      { rotulo: "Público-alvo", href: "/publico", icone: Users, etapa: 4 },
      { rotulo: "Sugestões de produtos", href: "/sugestoes", icone: Wand2, etapa: 4 },
    ],
  },
  {
    titulo: "Crescimento",
    itens: [
      { rotulo: "Central de divulgação", href: "/divulgacao", icone: Megaphone, etapa: 6 },
      { rotulo: "Criativos", href: "/criativos", icone: ImageIcon, etapa: 6 },
      { rotulo: "Páginas de vendas", href: "/paginas", icone: PanelsTopLeft, etapa: 5 },
      { rotulo: "Checkouts", href: "/checkouts", icone: CreditCard, etapa: 5 },
      { rotulo: "Minhas vendas", href: "/vendas", icone: Receipt, etapa: 5 },
    ],
  },
  {
    titulo: "Configurações",
    itens: [
      { rotulo: "Minha conta", href: "/conta", icone: UserCircle, etapa: 3 },
      { rotulo: "Assinatura", href: "/assinatura", icone: BadgeCheck, etapa: 7 },
      { rotulo: "Créditos e consumo", href: "/creditos", icone: Coins, etapa: 7 },
      { rotulo: "Integrações", href: "/integracoes", icone: Plug, etapa: 5 },
      { rotulo: "Ajuda e suporte", href: "/ajuda", icone: LifeBuoy, etapa: 8 },
    ],
  },
];

export const TODOS_ITENS = NAVEGACAO.flatMap((g) => g.itens);
export const itemPorHref = (href: string) => TODOS_ITENS.find((i) => i.href === href);
