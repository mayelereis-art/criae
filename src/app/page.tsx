import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, BookOpenText, Check, FileText, ImageIcon, Lightbulb, Megaphone, PanelsTopLeft, PenLine, ShieldCheck, Sparkles, Tag, Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { classesBotao } from "@/components/ui";
import { CAPITULOS_POR_EBOOK, PALAVRAS_POR_CAPITULO } from "@/config/catalogo";
import { EMAIL_CONTATO } from "@/config/legal";
import { PLANOS_PADRAO, custosPadrao, type Operacao, type Plano } from "@/config/planos";
import { lerConfiguracao, lerPlanos } from "@/lib/creditos/servidor";
import { formatarPreco } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Criaê — Crie e venda e-books com IA",
  description: "Descubra o que vender, gere o e-book com IA, publique a página de vendas e divulgue com materiais prontos. Tudo em um só painel.",
};

// Preço e créditos vêm do banco: o que a administradora muda no painel aparece aqui sem publicar de novo.
export const dynamic = "force-dynamic";

/** Créditos de um e-book completo no tamanho padrão, pelos custos atuais. */
function creditosPorEbook(custos: Record<Operacao, number>) {
  return custos.sugerir_configuracao + custos.planejamento + CAPITULOS_POR_EBOOK * custos.capitulo + custos.imagem_capa + custos.preco + custos.texto_pagina;
}

async function dados(): Promise<{ planos: Plano[]; porEbook: number }> {
  try {
    const [planos, { custos }] = await Promise.all([lerPlanos(), lerConfiguracao()]);
    return { planos: planos.filter((p) => p.ativo), porEbook: creditosPorEbook(custos) };
  } catch {
    return { planos: PLANOS_PADRAO, porEbook: creditosPorEbook(custosPadrao()) };
  }
}

const PASSOS = [
  { icone: Lightbulb, titulo: "Escolha o que vender", texto: "A IA sugere nichos e temas com público real, ou você parte da sua própria ideia." },
  { icone: PenLine, titulo: "Aprove o planejamento", texto: "Título comercial, sumário e capítulos. Você edita tudo antes de a IA escrever." },
  { icone: BookOpenText, titulo: "Receba o e-book pronto", texto: `${CAPITULOS_POR_EBOOK} capítulos escritos e revisados, capa chamativa e PDF diagramado para vender.` },
  { icone: PanelsTopLeft, titulo: "Publique a página de vendas", texto: "Preço sugerido, página com contagem regressiva e o seu checkout da Kiwify ou da Hotmart." },
  { icone: Megaphone, titulo: "Divulgue com tudo pronto", texto: "Artes de feed e stories, textos, roteiros, calendário de 14 dias e grupos do nicho para compartilhar." },
];

const ENTREGAS = [
  { icone: FileText, texto: `E-book de ${CAPITULOS_POR_EBOOK} capítulos, com ${PALAVRAS_POR_CAPITULO} palavras cada, introdução, conclusão e bônus` },
  { icone: ImageIcon, texto: "Capa profissional gerada para o seu tema" },
  { icone: BookOpenText, texto: "PDF diagramado, pronto para cadastrar na Kiwify ou na Hotmart" },
  { icone: Tag, texto: "Sugestão de preço com faixas de entrada, recomendado e premium" },
  { icone: PanelsTopLeft, texto: "Página de vendas com modelos prontos e oferta com prazo" },
  { icone: Sparkles, texto: "Artes de feed e stories, legendas, roteiros de vídeo e mensagens de WhatsApp" },
  { icone: Users, texto: "Indicação de grupos e comunidades onde o seu público está" },
];

const PARA_QUEM = [
  "Quer uma renda extra com produto digital e não sabe por onde começar",
  "Tem conhecimento para ensinar, mas não tem tempo para escrever e diagramar",
  "Já vende na Kiwify ou na Hotmart e quer lançar produtos novos mais rápido",
  "Não sabe fazer design nem página de vendas",
];

export default async function PaginaInicial() {
  const { planos, porEbook } = await dados();
  const perguntas: [string, string][] = [
    ["Preciso saber escrever?", "Não. Você define o tema e o público, aprova o planejamento e a IA escreve e revisa cada capítulo. Você pode editar o que quiser antes de gerar o PDF."],
    ["O e-book é meu?", "Sim. O produto final é de sua autoria e você vende com o seu nome, na sua conta da Kiwify ou da Hotmart."],
    ["Como recebo o dinheiro das vendas?", "Pela sua conta na Kiwify ou na Hotmart. Elas fazem a cobrança, entregam o arquivo ao comprador e o dinheiro cai direto para você. O Criaê não fica com nenhuma parte das suas vendas."],
    ["O que são os créditos?", `Cada ação da IA usa créditos. Um e-book completo, do planejamento à página de vendas, usa cerca de ${porEbook} créditos. Os créditos renovam todo mês no seu plano.`],
    ["O que significa vitalício?", "Você paga uma vez e recebe créditos todo mês, sem mensalidade, enquanto a plataforma estiver em operação. Vitalício não significa uso ilimitado da IA."],
    ["Posso cancelar?", "O plano Mensal pode ser cancelado a qualquer momento pelo painel, e o acesso continua até o fim do período pago. Compras pela internet podem ser desfeitas em até 7 dias, com reembolso integral, como garante o Código de Defesa do Consumidor."],
  ];

  return (
    <div className="fundo-feixes min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-borda bg-fundo/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Criaê, início"><Logo subtitulo={false} /></Link>
          <nav className="hidden items-center gap-6 text-sm text-suave md:flex">
            <a href="#como-funciona" className="hover:text-texto">Como funciona</a>
            <a href="#planos" className="hover:text-texto">Planos</a>
            <a href="#perguntas" className="hover:text-texto">Perguntas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/entrar" className={classesBotao("fantasma")}>Entrar</Link>
            <span className="hidden sm:block"><Link href="/cadastro" className={classesBotao()}>Começar agora</Link></span>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-20">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-borda bg-superficie-2 px-3 py-1 text-xs text-suave">
            <Sparkles size={13} className="text-primaria-clara" /> E-books com IA, da ideia à venda
          </p>
          <h1 className="mx-auto max-w-4xl font-display text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-6xl">
            Crie e venda o seu e-book <span className="text-primaria-clara">sem escrever, diagramar nem fazer design.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-suave sm:text-lg">
            O Criaê encontra o tema, escreve o e-book, cria a capa, monta a página de vendas e entrega os materiais de divulgação. Você só aprova e vende.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/cadastro" className={classesBotao("primario", "w-full justify-center px-6 py-3 text-base sm:w-auto")}>
              Quero criar meu e-book <ArrowRight size={18} />
            </Link>
            <a href="#planos" className={classesBotao("secundario", "w-full justify-center px-6 py-3 text-base sm:w-auto")}>Ver planos</a>
          </div>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-suave">
            {["Venda na sua Kiwify ou Hotmart", "O dinheiro das vendas é todo seu", "E-book pronto em poucos minutos"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check size={15} className="text-sucesso" /> {t}</li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">Como funciona</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-suave">Cinco etapas guiadas, no mesmo painel. Você decide; a IA faz o trabalho pesado.</p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
              <li key={titulo} className="cartao p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-borda bg-superficie-2 text-primaria-clara"><Icone size={18} /></span>
                  <span className="font-mono text-xs text-apagado">0{i + 1}</span>
                </div>
                <p className="mt-4 font-semibold">{titulo}</p>
                <p className="mt-1.5 text-sm text-suave">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div className="cartao p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">O que você recebe em cada e-book</h2>
            <ul className="mt-6 grid gap-4">
              {ENTREGAS.map(({ icone: Icone, texto }) => (
                <li key={texto} className="flex gap-3 text-sm sm:text-base">
                  <Icone size={18} className="mt-0.5 shrink-0 text-primaria-clara" /> <span>{texto}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="cartao p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">É para você que…</h2>
            <ul className="mt-6 grid gap-4">
              {PARA_QUEM.map((t) => (
                <li key={t} className="flex gap-3 text-sm sm:text-base"><Check size={18} className="mt-0.5 shrink-0 text-sucesso" /> <span>{t}</span></li>
              ))}
            </ul>
            <p className="mt-6 rounded-xl border border-borda bg-superficie-2 p-4 text-sm text-suave">
              Sem promessa de renda: o resultado das vendas depende do seu produto e da sua divulgação. O Criaê tira do caminho a parte técnica e o tempo de produção.
            </p>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">Planos</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-suave">Todas as ferramentas em todos os planos. A diferença é a forma de pagar e quantos créditos você recebe por mês.</p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
            {planos.map((p) => {
              const destaque = p.tipo === "vitalicio";
              return (
                <div key={p.id} className={`cartao relative flex flex-col p-6 sm:p-8 ${destaque ? "border-primaria-clara" : ""}`}>
                  {destaque && <span className="absolute -top-3 left-6 rounded-full bg-primaria px-3 py-1 text-xs font-semibold text-white">Pague uma vez</span>}
                  <p className="font-display text-xl font-bold">{p.nome}</p>
                  <p className="mt-1 text-sm text-suave">{p.descricao}</p>
                  <p className="mt-6 flex items-end gap-1.5">
                    <span className="font-display text-4xl font-extrabold">{formatarPreco(p.precoCentavos)}</span>
                    <span className="pb-1 text-sm text-suave">{p.tipo === "vitalicio" ? "pagamento único" : "por mês"}</span>
                  </p>
                  <ul className="mt-6 grid gap-3 text-sm">
                    <li className="flex gap-2"><Check size={17} className="shrink-0 text-sucesso" /> {p.creditosMes.toLocaleString("pt-BR")} créditos por mês</li>
                    <li className="flex gap-2"><Check size={17} className="shrink-0 text-sucesso" /> E-books completos, com capa e PDF</li>
                    <li className="flex gap-2"><Check size={17} className="shrink-0 text-sucesso" /> Até {p.maxProdutos} produtos</li>
                    <li className="flex gap-2"><Check size={17} className="shrink-0 text-sucesso" /> Página de vendas, criativos e divulgação</li>
                    <li className="flex gap-2"><Check size={17} className="shrink-0 text-sucesso" /> {p.tipo === "vitalicio" ? "Sem mensalidade" : "Cancele quando quiser"}</li>
                  </ul>
                  <Link href="/cadastro" className={classesBotao(destaque ? "primario" : "secundario", "mt-8 w-full justify-center py-3")}>Assinar o {p.nome}</Link>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 text-center text-sm text-suave">
            <ShieldCheck size={16} className="shrink-0 text-sucesso" /> Pagamento seguro pelo Mercado Pago, com Pix ou cartão. Até 7 dias para desistir, com reembolso integral.
          </p>
        </section>

        <section id="perguntas" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
          <div className="mt-8 grid gap-3">
            {perguntas.map(([p, r]) => (
              <details key={p} className="cartao group p-5">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="flex items-center justify-between gap-3">{p} <span className="text-primaria-clara transition group-open:rotate-45">+</span></span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-suave">{r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pt-8 pb-20 text-center sm:px-6">
          <div className="cartao p-8 sm:p-12">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Seu primeiro e-book pode estar pronto hoje.</h2>
            <p className="mx-auto mt-3 max-w-xl text-suave">Crie a conta, escolha o plano e comece pela ideia. O Criaê guia cada etapa até a página de vendas no ar.</p>
            <Link href="/cadastro" className={classesBotao("primario", "mt-8 inline-flex justify-center px-6 py-3 text-base")}>
              Começar agora <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-borda">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-apagado sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 Criaê</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/termos" className="hover:text-texto">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-texto">Privacidade</Link>
            <a href={`mailto:${EMAIL_CONTATO}`} className="hover:text-texto">{EMAIL_CONTATO}</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
