"use client";

import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";

type Estado = { usuario: User | null; carregando: boolean; sair: () => Promise<void> };
const Contexto = createContext<Estado | null>(null);

export async function sincronizarCookie(usuario: User | null) {
  if (usuario) {
    const token = await usuario.getIdToken();
    await fetch("/api/sessao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
  } else {
    await fetch("/api/sessao", { method: "DELETE" });
  }
}

export function ProvedorAuth({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(
    () =>
      onIdTokenChanged(auth, async (u) => {
        await sincronizarCookie(u).catch(() => {});
        setUsuario(u);
        setCarregando(false);
      }),
    [],
  );

  const sair = async () => {
    await signOut(auth);
    await sincronizarCookie(null);
    window.location.href = "/";
  };

  return <Contexto.Provider value={{ usuario, carregando, sair }}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useAuth fora do ProvedorAuth");
  return c;
}
