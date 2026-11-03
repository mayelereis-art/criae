import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/firebase/admin";
import { dentroDoLimite, ipDe } from "@/lib/limite";

const entrada = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
  tipo: z.enum(["visualizacoes", "cliques"]),
  canal: z.string().regex(/^[a-z0-9_-]{1,40}$/i).optional(),
});

/** Contador de visitas e cliques. Público; o freio por IP segura repetição simples. */
export async function POST(req: Request) {
  const p = entrada.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false }, { status: 400 });
  if (!dentroDoLimite(`metrica:${ipDe(req)}:${p.data.slug}:${p.data.tipo}`, 5)) return NextResponse.json({ ok: true });
  try {
    const db = dbAdmin();
    const pagina = (await db.collection("paginas_vendas").doc(p.data.slug).get()).data();
    if (!pagina?.publicada) return NextResponse.json({ ok: false }, { status: 404 });
    const canal = (p.data.canal ?? "direto").toLowerCase();
    await db.collection("metricas").doc(p.data.slug).set(
      { donoId: pagina.donoId, produtoId: pagina.produtoId, [p.data.tipo]: FieldValue.increment(1), porCanal: { [canal]: { [p.data.tipo]: FieldValue.increment(1) } } },
      { merge: true },
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(JSON.stringify({ evento: "metrica", ok: false, erro: String(e) }));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
