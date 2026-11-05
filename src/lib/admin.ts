import "server-only";
import { usuarioAtual } from "./sessao";

/**
 * Administradores por uid, vindos do servidor. Nunca por e-mail: quem cria conta com um e-mail
 * ainda não confirmado não prova que é dono dele.
 */
export function ehAdmin(uid: string) {
  return (process.env.ADMIN_UIDS ?? "").split(",").map((x) => x.trim()).filter(Boolean).includes(uid);
}

export async function adminAtual() {
  const usuario = await usuarioAtual();
  return usuario && ehAdmin(usuario.uid) ? usuario : null;
}
