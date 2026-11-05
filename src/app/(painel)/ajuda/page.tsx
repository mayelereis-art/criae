import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CabecalhoPagina, Cartao } from "@/components/ui";
import { EMAIL_CONTATO } from "@/config/legal";

export const metadata = { title: "Ajuda e suporte" };

const PASSOS: [string, string, string][] = [
  ["Escolha uma ideia", "Pesquise um nicho e salve as oportunidades que fizerem sentido.", "/nichos"],
  ["Crie o e-book", "Defina o público, aprove o planejamento e deixe a IA escrever os capítulos.", "/criar"],
  ["Monte o visual", "Escolha a identidade, gere a capa e salve a versão final do PDF.", "/produtos"],
  ["Coloque à venda", "Defina o preço, publique a página e escolha como receber.", "/paginas"],
  ["Divulgue", "Gere a campanha, o calendário e os criativos de cada mídia.", "/divulgacao"],
  ["Acompanhe", "Veja pedidos, faturamento e canais em Minhas vendas.", "/vendas"],
];

const DUVIDAS: [string, string][] = [
  ["Como recebo o dinheiro das minhas vendas?", "Em Integrações você conecta o Mercado Pago, e o valor cai na sua conta dele. Também dá para vender pela Kiwify ou pela Hotmart, usando a sua conta nessas plataformas: nesse caso, cole o link de checkout na página de vendas. A Criaê não guarda o seu saldo."],
  ["O que são créditos?", "Cada ação de IA usa créditos. A tabela e o seu histórico estão em Créditos e consumo. Se uma geração falhar, os créditos voltam sozinhos."],
  ["O que acontece quando os créditos acabam?", "A IA para até a próxima renovação, mas suas páginas e vendas continuam funcionando normalmente."],
  ["Qual a diferença entre os planos?", "O Mensal é cobrado todo mês e tem mais créditos. O Vitalício é um pagamento único, sem mensalidade, com uma quantidade menor de créditos renovada todo mês. Veja os valores em Assinatura."],
  ["Como cancelo?", "Em Assinatura, clique em Cancelar assinatura. A cobrança para, e você continua usando até o fim do período já pago."],
  ["Paguei e o plano não apareceu. E agora?", "Abra Assinatura e clique em Já paguei: atualizar meu plano. Se o Mercado Pago ainda estiver confirmando, tente de novo em alguns minutos."],
  ["Posso fechar a aba enquanto a IA escreve?", "Os capítulos em andamento terminam e ficam salvos, mas novos capítulos só começam com a aba aberta. Na volta, clique para continuar os que faltam."],
  ["Preciso revisar o que a IA escreve?", "Sim. A IA pode errar. Leia o material antes de vender, principalmente em temas de saúde, finanças e direito. A responsabilidade pelo conteúdo publicado é de quem vende."],
  ["O comprador não recebeu o e-mail. O que faço?", "Em Minhas vendas, use Reenviar e-mail e peça para conferir o spam. Nas vendas pela Kiwify ou Hotmart, a entrega é feita pela própria plataforma."],
  ["Como exporto ou excluo meus dados?", "Em Minha conta você baixa um arquivo com seus dados ou exclui a conta."],
];

export default function Pagina() {
  return (
    <>
      <CabecalhoPagina titulo="Ajuda e suporte" descricao="O caminho da ideia até a venda, as dúvidas mais comuns e como falar com a gente." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Cartao className="self-start">
          <h2 className="mb-3 font-semibold">Passo a passo</h2>
          <ol className="space-y-3">
            {PASSOS.map(([titulo, texto, href], i) => (
              <li key={titulo} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primaria/15 text-xs font-bold text-primaria-clara">{i + 1}</span>
                <span><Link href={href} className="font-semibold hover:underline">{titulo}</Link><span className="block text-suave">{texto}</span></span>
              </li>
            ))}
          </ol>
        </Cartao>
        <div className="space-y-5">
          <Cartao>
            <h2 className="mb-2 font-semibold">Dúvidas frequentes</h2>
            <div className="divide-y divide-borda">
              {DUVIDAS.map(([p, r]) => (
                <details key={p} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">{p} <ChevronDown size={16} className="shrink-0 transition group-open:rotate-180" /></summary>
                  <p className="mt-2 text-sm leading-relaxed text-suave">{r}</p>
                </details>
              ))}
            </div>
          </Cartao>
          <Cartao>
            <h2 className="font-semibold">Falar com o suporte</h2>
            <p className="mt-1 text-sm text-suave">Escreva para <a href={`mailto:${EMAIL_CONTATO}`} className="text-primaria-clara underline">{EMAIL_CONTATO}</a> e informe o e-mail da sua conta.</p>
            <p className="mt-3 flex gap-4 text-sm"><Link href="/termos" className="text-primaria-clara underline">Termos de uso</Link><Link href="/privacidade" className="text-primaria-clara underline">Política de privacidade</Link></p>
          </Cartao>
        </div>
      </div>
    </>
  );
}
