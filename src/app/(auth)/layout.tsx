import { BookOpenText, PanelsTopLeft, Megaphone } from "lucide-react";
import { Logo } from "@/components/Logo";

const RECURSOS = [
  { icone: BookOpenText, titulo: "E-book escrito e revisado pela IA", texto: "Do planejamento ao PDF diagramado, capítulo por capítulo, com capa e imagens do seu tema." },
  { icone: PanelsTopLeft, titulo: "Página de vendas com checkout", texto: "Modelos prontos, Pix e cartão pelo Mercado Pago e entrega automática do arquivo." },
  { icone: Megaphone, titulo: "Divulgação pronta para postar", texto: "Posts, stories, roteiros e mensagens de WhatsApp com a identidade do seu produto." },
];

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="fundo-feixes grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:py-12">
        <Logo />
        <div className="my-10 max-w-xl animate-surgir">
          <h1 className="font-display text-3xl leading-[1.12] font-extrabold tracking-tight sm:text-5xl">
            Da ideia ao produto digital vendido, <span className="text-primaria-clara">sem trocar de ferramenta.</span>
          </h1>
          <p className="mt-4 text-suave">
            Descubra o que vender, crie o material com IA, publique a página e acompanhe as vendas em um só painel.
          </p>
          <ul className="mt-8 space-y-5">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-borda bg-superficie-2 text-primaria-clara">
                  <Icone size={18} />
                </span>
                <div>
                  <p className="font-semibold">{titulo}</p>
                  <p className="text-sm text-suave">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-apagado">© 2026 Criaê</p>
      </section>

      <section className="flex items-center justify-center px-4 pb-12 sm:px-8 lg:py-12">
        <div className="cartao w-full max-w-md p-7 animate-surgir">{children}</div>
      </section>
    </div>
  );
}
