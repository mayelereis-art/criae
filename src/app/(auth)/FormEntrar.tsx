"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { mensagemErro } from "@/lib/firebase/erros";
import { useAuth } from "@/components/ProvedorAuth";
import { Botao, Campo, estiloEntrada } from "@/components/ui";

/** Só aceita caminhos internos, para não virar redirecionamento aberto. */
function destinoSeguro(volta: string | null) {
  return volta && volta.startsWith("/") && !volta.startsWith("//") ? volta : "/visao-geral";
}

export function FormEntrar() {
  const router = useRouter();
  const destino = destinoSeguro(useSearchParams().get("volta"));
  const { usuario, carregando } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Já logado (ou sessão restaurada após o cookie expirar): segue para o painel.
  useEffect(() => {
    if (!carregando && usuario) router.replace(destino);
  }, [carregando, usuario, destino, router]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    } catch (err) {
      setErro(mensagemErro(err));
      setEnviando(false);
    }
  };

  return (
    <>
      <h2 className="font-display text-xl font-bold">Entrar na Criaê</h2>
      <p className="mt-1 text-sm text-suave">Acesse seu painel de criação.</p>
      <form onSubmit={entrar} className="mt-6 space-y-4">
        <Campo rotulo="E-mail">
          <input type="email" required autoComplete="email" className={estiloEntrada} placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo rotulo="Senha">
          <input type="password" required autoComplete="current-password" className={estiloEntrada} placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Campo>
        {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
        <Botao type="submit" className="w-full" disabled={enviando || carregando}>
          {enviando ? "Entrando..." : "Entrar"}
        </Botao>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/recuperar-senha" className="text-suave hover:text-texto">Esqueci a senha</Link>
        <Link href="/cadastro" className="font-semibold text-primaria-clara hover:underline">Criar conta</Link>
      </div>
    </>
  );
}
