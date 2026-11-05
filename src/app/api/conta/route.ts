import { NextResponse } from "next/server";
import { z } from "zod";
import { authAdmin, bucketAdmin, dbAdmin } from "@/lib/firebase/admin";
import { cancelarAssinatura } from "@/lib/pagamentos/assinaturas";
import { usuarioAtual } from "@/lib/sessao";

const DO_DONO = ["produtos", "capitulos", "imagens", "arquivos", "oportunidades", "cupons", "campanhas", "criativos", "paginas_vendas", "movimentos_creditos", "pagamentos_assinatura", "metricas"];
const POR_ID = ["usuarios", "creditos", "assinaturas", "integracoes"];
// Só o servidor lê: tokens cifrados nunca saem na exportação.
const SO_SERVIDOR = ["conexoes_mp", "conexoes_externas"];

const limpar = (d: Record<string, unknown>) => JSON.parse(JSON.stringify(d, (k, v) => (k === "tokensHash" || k === "caminho" ? undefined : v)));

/** LGPD: portabilidade. Tudo o que é da pessoa, em um arquivo. */
export async function GET() {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  const db = dbAdmin();
  const dados: Record<string, unknown> = { exportadoEm: new Date().toISOString(), conta: { uid: usuario.uid, email: usuario.email, nome: usuario.nome } };
  for (const c of POR_ID) dados[c] = limpar((await db.collection(c).doc(usuario.uid).get()).data() ?? {});
  for (const c of DO_DONO) dados[c] = (await db.collection(c).where("donoId", "==", usuario.uid).get()).docs.map((d) => limpar({ id: d.id, ...d.data() }));
  dados.vendas = (await db.collection("pedidos").where("vendedorId", "==", usuario.uid).get()).docs.map((d) => limpar({ id: d.id, ...d.data() }));
  console.info(JSON.stringify({ evento: "conta", acao: "exportar", uid: usuario.uid }));
  return new NextResponse(JSON.stringify(dados, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="meus-dados-criae.json"', "Cache-Control": "no-store" } });
}

/**
 * LGPD: exclusão. Pedidos ficam guardados para cumprir obrigações legais e para o comprador manter o histórico,
 * como a política de privacidade explica. Sem conta de vendedor, deixam de ser acessados pelo painel.
 */
export async function DELETE(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  const p = z.object({ confirmacao: z.literal("EXCLUIR") }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: "Digite EXCLUIR para confirmar." }, { status: 400 });
  const uid = usuario.uid;
  const db = dbAdmin();
  try {
    const assinatura = (await db.collection("assinaturas").doc(uid).get()).data();
    if (assinatura?.gatewayId && assinatura.status !== "cancelada") await cancelarAssinatura(uid);

    for (const c of DO_DONO) {
      const docs = (await db.collection(c).where("donoId", "==", uid).get()).docs;
      const escritor = db.bulkWriter();
      docs.forEach((d) => escritor.delete(d.ref));
      await escritor.close();
    }
    await Promise.all([...POR_ID, ...SO_SERVIDOR].map((c) => db.collection(c).doc(uid).delete()));
    await bucketAdmin().deleteFiles({ prefix: `criadores/${uid}/` });
    await authAdmin.deleteUser(uid);
    console.info(JSON.stringify({ evento: "conta", acao: "excluir", uid }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(JSON.stringify({ evento: "conta", acao: "excluir", uid, ok: false, erro: String(e).slice(0, 300) }));
    return NextResponse.json({ erro: "Não foi possível concluir a exclusão. Fale com o suporte." }, { status: 500 });
  }
}
