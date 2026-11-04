import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { dbAdmin } from "../firebase/admin";
import type { Credenciais } from "./gateway";
import { mercadoPago } from "./mercadopago";

// Tokens de vendedores nunca ficam em texto puro: AES-256-GCM com chave derivada de um segredo do servidor.
// A coleção conexoes_mp não tem regra de leitura: só o servidor acessa.
const chave = () => scryptSync(process.env.MP_CLIENT_SECRET?.trim() ?? "", "criae-conexoes-mp", 32);

function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64")).join(".");
}

function decifrar(valor: string) {
  const [iv, tag, dados] = valor.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}

export async function guardarConexao(uid: string, c: Credenciais) {
  const db = dbAdmin();
  await db.collection("conexoes_mp").doc(uid).set({
    contaId: c.contaId, token: cifrar(c.accessToken), refresh: cifrar(c.refreshToken), expiraEm: c.expiraEm, atualizadoEm: new Date(),
  });
  await db.collection("integracoes").doc(uid).set({ mercadoPago: { conectado: true, contaId: c.contaId, conectadoEm: new Date() } }, { merge: true });
}

export async function removerConexao(uid: string) {
  const db = dbAdmin();
  await db.collection("conexoes_mp").doc(uid).delete();
  await db.collection("integracoes").doc(uid).set({ mercadoPago: { conectado: false } }, { merge: true });
}

/** Token válido do vendedor; renova sozinho quando faltam menos de 7 dias para expirar. null = não conectado. */
export async function tokenDoVendedor(uid: string): Promise<string | null> {
  const ref = dbAdmin().collection("conexoes_mp").doc(uid);
  const s = await ref.get();
  if (!s.exists) return null;
  const d = s.data()!;
  if (d.expiraEm - Date.now() > 7 * 24 * 3600 * 1000) return decifrar(d.token);
  const novas = await mercadoPago.renovar(decifrar(d.refresh));
  await guardarConexao(uid, novas);
  return novas.accessToken;
}

/** O aviso do gateway traz a conta do vendedor; achamos quem é na Criaê. */
export async function vendedorDaConta(contaId: string): Promise<string | null> {
  const q = await dbAdmin().collection("conexoes_mp").where("contaId", "==", contaId).limit(1).get();
  return q.empty ? null : q.docs[0].id;
}
