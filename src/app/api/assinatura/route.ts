import { NextResponse } from "next/server";
import { z } from "zod";
import { lerPlanos } from "@/lib/creditos/servidor";
import { cancelarAssinatura, iniciarAssinatura, sincronizarAssinatura } from "@/lib/pagamentos/assinaturas";
import { ErroGateway } from "@/lib/pagamentos/gateway";
import { usuarioAtual } from "@/lib/sessao";

const entrada = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("assinar"), planoId: z.string().max(40), email: z.email("Informe um e-mail válido.").max(200) }),
  z.object({ acao: z.literal("cancelar") }),
  z.object({ acao: z.literal("sincronizar") }),
]);

export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  const p = entrada.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: p.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  try {
    if (p.data.acao === "cancelar") {
      await cancelarAssinatura(usuario.uid);
      console.info(JSON.stringify({ evento: "assinatura", acao: "cancelar", uid: usuario.uid }));
      return NextResponse.json({ ok: true });
    }
    if (p.data.acao === "sincronizar") {
      const encontradas = await sincronizarAssinatura(usuario.uid);
      console.info(JSON.stringify({ evento: "assinatura", acao: "sincronizar", uid: usuario.uid, encontradas }));
      return NextResponse.json({ encontradas });
    }
    const { planoId, email } = p.data;
    // O preço vem sempre do banco, nunca do navegador.
    const plano = (await lerPlanos()).find((x) => x.id === planoId && x.ativo);
    if (!plano) return NextResponse.json({ erro: "Este plano não está disponível." }, { status: 404 });
    const url = await iniciarAssinatura(usuario.uid, email, plano);
    console.info(JSON.stringify({ evento: "assinatura", acao: "iniciar", uid: usuario.uid, planoId }));
    return NextResponse.json({ url });
  } catch (e) {
    console.error(JSON.stringify({ evento: "assinatura", uid: usuario.uid, ok: false, erro: String(e).slice(0, 300) }));
    return NextResponse.json({ erro: e instanceof ErroGateway ? e.message : "Não foi possível concluir agora. Tente de novo." }, { status: 502 });
  }
}
