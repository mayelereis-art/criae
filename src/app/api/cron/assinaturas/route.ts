import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase/admin";
import { recarregarVitalicio, sincronizarAssinatura } from "@/lib/pagamentos/assinaturas";

export const maxDuration = 300;

const verificador = new OAuth2Client();

/**
 * Conferência diária, chamada pelo Cloud Scheduler com um token do Google (OIDC) da conta de serviço própria.
 * Sem chave guardada: o token prova quem chamou e para qual endereço.
 */
async function chamadaDoAgendador(req: Request) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const conta = process.env.CRON_SA_EMAIL?.trim();
  if (!token || !conta) return false;
  try {
    const ticket = await verificador.verifyIdToken({ idToken: token, audience: `${process.env.NEXT_PUBLIC_URL_SITE}/api/cron/assinaturas` });
    const p = ticket.getPayload();
    return p?.email === conta && p.email_verified === true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!(await chamadaDoAgendador(req))) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const inicio = Date.now();
  const contas = (await dbAdmin().collection("assinaturas").where("status", "in", ["ativa", "inadimplente"]).get()).docs;
  let conferidas = 0;
  let falhas = 0;
  for (const d of contas) {
    // Folga para terminar dentro do tempo da requisição; o que sobrar fica para o dia seguinte.
    if (Date.now() - inicio > 240_000) break;
    const a = d.data();
    try {
      if (a.tipo === "vitalicio") await recarregarVitalicio(d.id);
      else if (!a.renovaEm || a.renovaEm.toMillis() <= Date.now() || a.status === "inadimplente") await sincronizarAssinatura(d.id);
      conferidas++;
    } catch (e) {
      falhas++;
      console.error(JSON.stringify({ evento: "cron-assinaturas", uid: d.id, ok: false, erro: String(e).slice(0, 200) }));
    }
  }
  console.info(JSON.stringify({ evento: "cron-assinaturas", total: contas.length, conferidas, falhas, ms: Date.now() - inicio }));
  return NextResponse.json({ total: contas.length, conferidas, falhas });
}
