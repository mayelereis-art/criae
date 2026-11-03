import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/firebase/admin";
import { dentroDoLimite, ipDe } from "@/lib/limite";
import { ErroCheckout, montarPedido } from "@/lib/pedidos/montagem";

const entrada = z.object({ slug: z.string().regex(/^[a-z0-9-]{3,60}$/), cupom: z.string().max(20).optional(), comBump: z.boolean().optional() });

/** Total da compra para mostrar na tela. Sem dados pessoais e sem criar nada. */
export async function POST(req: Request) {
  if (!dentroDoLimite(`cotacao:${ipDe(req)}`, 30)) return NextResponse.json({ erro: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  const p = entrada.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  try {
    const m = await montarPedido(dbAdmin(), p.data.slug, p.data);
    return NextResponse.json({
      subtotalCentavos: m.subtotalCentavos, descontoCentavos: m.descontoCentavos, totalCentavos: m.totalCentavos,
      itens: m.itens.map((i) => ({ titulo: i.titulo, precoCentavos: i.precoCentavos })),
    });
  } catch (e) {
    if (e instanceof ErroCheckout) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error(JSON.stringify({ evento: "cotacao", ok: false, erro: String(e) }));
    return NextResponse.json({ erro: "Não foi possível calcular agora. Tente de novo." }, { status: 500 });
  }
}
