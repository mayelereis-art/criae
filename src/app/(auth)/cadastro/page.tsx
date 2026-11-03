"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { mensagemErro } from "@/lib/firebase/erros";
import { VERSAO_TERMOS } from "@/config/legal";
import { sincronizarCookie } from "@/components/ProvedorAuth";
import { Botao, Campo, estiloEntrada } from "@/components/ui";

export default function Cadastro() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (nome.trim().length < 2) return setErro("Informe seu nome.");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (!aceite) return setErro("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.");
    setEnviando(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      await updateProfile(user, { displayName: nome.trim() });
      await setDoc(doc(db, "usuarios", user.uid), {
        nome: nome.trim(),
        email: user.email,
        criadoEm: serverTimestamp(),
        aceite: { versao: VERSAO_TERMOS, em: serverTimestamp() },
      });
      await sendEmailVerification(user).catch(() => {});
      await user.getIdToken(true); // renova o token para levar o nome
      await sincronizarCookie(user); // cookie pronto antes de entrar no painel
      router.replace("/visao-geral");
    } catch (err) {
      setErro(mensagemErro(err));
      setEnviando(false);
    }
  };

  return (
    <>
      <h2 className="font-display text-xl font-bold">Criar sua conta</h2>
      <p className="mt-1 text-sm text-suave">Leva menos de um minuto.</p>
      <form onSubmit={cadastrar} className="mt-6 space-y-4">
        <Campo rotulo="Nome">
          <input required autoComplete="name" maxLength={120} className={estiloEntrada} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="E-mail">
          <input type="email" required autoComplete="email" className={estiloEntrada} placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo rotulo="Senha" dica="Mínimo de 8 caracteres.">
          <input type="password" required minLength={8} autoComplete="new-password" className={estiloEntrada} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Campo>
        <label className="flex items-start gap-2.5 text-sm text-suave">
          <input type="checkbox" className="mt-1 accent-primaria" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>
            Li e aceito os <Link href="/termos" target="_blank" className="text-primaria-clara underline">Termos de Uso</Link> e a{" "}
            <Link href="/privacidade" target="_blank" className="text-primaria-clara underline">Política de Privacidade</Link>.
          </span>
        </label>
        {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
        <Botao type="submit" className="w-full" disabled={enviando}>
          {enviando ? "Criando conta..." : "Criar conta"}
        </Botao>
      </form>
      <p className="mt-4 text-center text-sm text-suave">
        Já tem conta? <Link href="/entrar" className="font-semibold text-primaria-clara hover:underline">Entrar</Link>
      </p>
    </>
  );
}
