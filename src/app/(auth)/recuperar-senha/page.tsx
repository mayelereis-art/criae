"use client";

import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import { auth } from "@/lib/firebase/client";
import { mensagemErro } from "@/lib/firebase/erros";
import { Botao, Campo, estiloEntrada } from "@/components/ui";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"livre" | "enviando" | "enviado">("livre");
  const [erro, setErro] = useState("");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setEstado("enviando");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setEstado("enviado");
    } catch (err) {
      setErro(mensagemErro(err));
      setEstado("livre");
    }
  };

  return (
    <>
      <h2 className="font-display text-xl font-bold">Recuperar senha</h2>
      {estado === "enviado" ? (
        <p className="mt-4 text-sm text-suave">
          Se existir uma conta com <strong className="text-texto">{email}</strong>, você vai receber um link para criar uma nova senha. Confira também o spam.
        </p>
      ) : (
        <form onSubmit={enviar} className="mt-6 space-y-4">
          <Campo rotulo="E-mail da conta">
            <input type="email" required autoComplete="email" className={estiloEntrada} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
          <Botao type="submit" className="w-full" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Enviando..." : "Enviar link"}
          </Botao>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link href="/entrar" className="text-primaria-clara hover:underline">Voltar para o login</Link>
      </p>
    </>
  );
}
