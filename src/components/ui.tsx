import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "secundario" | "fantasma";

/** Mesmas classes do Botao, para usar em <Link> sem aninhar botão dentro de link. */
export const classesBotao = (variante: Variante = "primario", extra?: string) =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-45",
    variante === "primario" && "bg-primaria text-white brilho-primario hover:bg-primaria-clara",
    variante === "secundario" && "border border-borda-forte bg-superficie-2/60 text-texto hover:border-primaria-clara",
    variante === "fantasma" && "text-suave hover:bg-superficie-2 hover:text-texto",
    extra,
  );

export function Botao({
  variante = "primario", className, children, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={classesBotao(variante, className)}
    >
      {children}
    </button>
  );
}

export function Cartao({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("cartao p-5", className)}>{children}</div>;
}

export function CabecalhoPagina({ titulo, descricao, acoes }: { titulo: string; descricao?: string; acoes?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1.5 max-w-2xl text-sm text-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

export function Selo({ children, tom = "neutro" }: { children: ReactNode; tom?: "neutro" | "azul" | "verde" | "amarelo" | "vermelho" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        tom === "neutro" && "border-borda text-suave",
        tom === "azul" && "border-primaria/40 bg-primaria/10 text-primaria-clara",
        tom === "verde" && "border-sucesso/40 bg-sucesso/10 text-sucesso",
        tom === "amarelo" && "border-alerta/40 bg-alerta/10 text-alerta",
        tom === "vermelho" && "border-erro/40 bg-erro/10 text-erro",
      )}
    >
      {children}
    </span>
  );
}

export function EstadoVazio({ icone: Icone, titulo, texto, children }: { icone: LucideIcon; titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div className="cartao flex flex-col items-center px-6 py-12 text-center animate-surgir">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl border border-borda bg-superficie-2 text-primaria-clara">
        <Icone size={22} />
      </div>
      <h2 className="font-display text-lg font-semibold">{titulo}</h2>
      <p className="mt-1.5 max-w-md text-sm text-suave">{texto}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/** Aviso honesto de que a tela ainda não está ligada ao backend. */
export function AvisoEtapa({ etapa, oQueFalta }: { etapa: number; oQueFalta: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-alerta/30 bg-alerta/5 px-4 py-3 text-sm">
      <Selo tom="amarelo">Etapa {etapa}</Selo>
      <p className="text-suave">{oQueFalta}</p>
    </div>
  );
}

export function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-apagado">{dica}</span>}
    </label>
  );
}

export const estiloEntrada =
  "w-full rounded-xl border border-borda bg-fundo/60 px-3.5 py-2.5 text-sm text-texto placeholder:text-apagado outline-none transition focus:border-primaria-clara focus:ring-2 focus:ring-primaria/25";
