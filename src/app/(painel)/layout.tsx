import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { acessoLiberado, rotaSemPlano } from "@/lib/acesso";
import { dbAdmin } from "@/lib/firebase/admin";
import { BarraLateral } from "@/components/BarraLateral";
import { AvisoConta } from "@/components/AvisoConta";
import { ehAdmin } from "@/lib/admin";
import { usuarioAtual } from "@/lib/sessao";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  // Cookie expirado ou adulterado: volta ao login, que restaura a sessão do Firebase e renova o cookie.
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  // Sem plano pago, só a assinatura, a conta e a ajuda abrem.
  const admin = ehAdmin(usuario.uid);
  const liberado = admin || acessoLiberado((await dbAdmin().collection("assinaturas").doc(usuario.uid).get()).data());
  const caminho = (await headers()).get("x-caminho") ?? "";
  if (!liberado && !rotaSemPlano(caminho)) redirect("/assinatura");

  return (
    <div className="fundo-feixes min-h-dvh">
      <BarraLateral usuario={{ nome: usuario.nome, email: usuario.email, admin }} />
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{liberado ? <AvisoConta /> : <p className="mb-5 rounded-xl border border-primaria/40 bg-primaria/10 p-3 text-sm" role="status">Escolha um plano para liberar o Criaê. O acesso abre assim que o pagamento for confirmado.</p>}{children}</div>
      </main>
    </div>
  );
}
