import Link from "next/link";
import { Logo } from "@/components/Logo";
import { VERSAO_TERMOS } from "@/config/legal";

export default function LayoutLegal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fundo-feixes min-h-dvh px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" aria-label="Início"><Logo /></Link>
        <article className="cartao mt-8 p-6 sm:p-10 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-suave [&_ul]:mt-3 [&_ul]:space-y-1 [&_ul]:text-sm [&_ul]:text-suave">
          {children}
          <p className="mt-10! border-t border-borda pt-4 text-xs!">Versão {VERSAO_TERMOS}. Modelo inicial, sujeito a revisão jurídica antes do lançamento.</p>
        </article>
      </div>
    </div>
  );
}
