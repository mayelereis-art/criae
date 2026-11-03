"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NAVEGACAO } from "@/config/navegacao";
import { Logo } from "./Logo";
import { useAuth } from "./ProvedorAuth";

type UsuarioBarra = { nome: string; email: string };

const iniciais = (nome: string, email: string) =>
  (nome || email).split(/[s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

function Conteudo({ usuario, aoNavegar }: { usuario: UsuarioBarra; aoNavegar?: () => void }) {
  const caminho = usePathname();
  const { sair } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-4">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Menu principal">
        {NAVEGACAO.map((grupo) => (
          <div key={grupo.titulo} className="mt-4">
            <p className="px-3 pb-1.5 font-mono text-[10px] tracking-[0.2em] text-apagado uppercase">{grupo.titulo}</p>
            <ul className="space-y-0.5">
              {grupo.itens.map(({ href, rotulo, icone: Icone }) => {
                const ativo = caminho === href || caminho.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={aoNavegar}
                      aria-current={ativo ? "page" : undefined}
                      className={clsx(
                        "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition",
                        ativo
                          ? "border-primaria/45 bg-primaria/12 font-semibold text-primaria-clara shadow-[inset_0_0_20px_rgb(47_107_255/0.12)]"
                          : "border-transparent text-suave hover:bg-superficie-2 hover:text-texto",
                      )}
                    >
                      <Icone size={17} strokeWidth={ativo ? 2.2 : 1.8} />
                      {rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-borda p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full border border-borda bg-superficie-2 text-xs font-bold text-primaria-clara">
            {iniciais(usuario.nome, usuario.email)}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-semibold text-texto">{usuario.nome || "Sem nome"}</p>
            <p className="truncate text-apagado">{usuario.email}</p>
          </div>
          <button onClick={sair} className="rounded-lg p-2 text-suave hover:bg-superficie-2 hover:text-texto" aria-label="Sair" title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function BarraLateral({ usuario }: { usuario: UsuarioBarra }) {
  const [aberta, setAberta] = useState(false);
  const caminho = usePathname();
  useEffect(() => setAberta(false), [caminho]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-borda bg-fundo/85 backdrop-blur lg:block">
        <Conteudo usuario={usuario} />
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-borda bg-fundo/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo subtitulo={false} />
        <button onClick={() => setAberta(true)} className="rounded-lg p-2 text-suave hover:bg-superficie-2" aria-label="Abrir menu">
          <Menu size={20} />
        </button>
      </div>

      {aberta && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/60" onClick={() => setAberta(false)} aria-label="Fechar menu" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-borda bg-fundo animate-surgir">
            <button onClick={() => setAberta(false)} className="absolute top-5 right-3 rounded-lg p-2 text-suave hover:bg-superficie-2" aria-label="Fechar menu">
              <X size={18} />
            </button>
            <Conteudo usuario={usuario} aoNavegar={() => setAberta(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
