import { redirect } from "next/navigation";
import { BarraLateral } from "@/components/BarraLateral";
import { AvisoConta } from "@/components/AvisoConta";
import { ehAdmin } from "@/lib/admin";
import { usuarioAtual } from "@/lib/sessao";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  // Cookie expirado ou adulterado: volta ao login, que restaura a sessão do Firebase e renova o cookie.
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  return (
    <div className="fundo-feixes min-h-dvh">
      <BarraLateral usuario={{ nome: usuario.nome, email: usuario.email, admin: ehAdmin(usuario.uid) }} />
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10"><AvisoConta />{children}</div>
      </main>
    </div>
  );
}
