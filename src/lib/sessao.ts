import "server-only";
import { cookies } from "next/headers";
import { authAdmin } from "./firebase/admin";

export const COOKIE_SESSAO = "__session";

export type UsuarioSessao = { uid: string; email: string; nome: string; emailVerificado: boolean };

/** Lê e verifica o token do cookie. null = sem sessão válida. */
export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  try {
    const t = await authAdmin.verifyIdToken(token);
    return { uid: t.uid, email: t.email ?? "", nome: (t.name as string | undefined) ?? "", emailVerificado: !!t.email_verified };
  } catch {
    return null;
  }
}
