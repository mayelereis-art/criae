import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { bucketAdmin, dbAdmin } from "@/lib/firebase/admin";
import { dentroDoLimite, ipDe } from "@/lib/limite";
import { MAX_DOWNLOADS, tokenValido } from "@/lib/pedidos/servidor";

export const runtime = "nodejs";

/** Marca cada página (menos a capa) com o e-mail do comprador: desestimula o compartilhamento. */
async function marcar(pdf: Buffer, email: string) {
  const doc = await PDFDocument.load(pdf);
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const texto = `Licenciado para ${email.replace(/[^\x20-\x7e]/g, "?")}. Uso pessoal, proibida a redistribuicao.`;
  doc.getPages().forEach((p, i) => {
    if (i === 0) return;
    const largura = fonte.widthOfTextAtSize(texto, 6);
    p.drawText(texto, { x: (p.getWidth() - largura) / 2, y: 12, size: 6, font: fonte, color: rgb(0.55, 0.55, 0.55) });
  });
  return Buffer.from(await doc.save());
}

export async function GET(req: Request, { params }: { params: Promise<{ pedido: string; item: string }> }) {
  if (!dentroDoLimite(`download:${ipDe(req)}`, 20)) return NextResponse.json({ erro: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  const { pedido, item } = await params;
  const token = new URL(req.url).searchParams.get("t");
  const db = dbAdmin();
  const ref = db.collection("pedidos").doc(pedido);

  try {
    // A contagem e a verificação ficam na mesma transação para o limite valer mesmo com cliques simultâneos.
    const dados = await db.runTransaction(async (tx) => {
      const p = (await tx.get(ref)).data();
      if (!p || !tokenValido(token, p.tokensHash)) return { erro: "Link inválido.", status: 403 };
      if (p.status !== "pago") return { erro: "Este pedido não está liberado para download.", status: 403 };
      if (p.downloads >= MAX_DOWNLOADS) return { erro: "Limite de downloads atingido. Fale com quem vendeu o produto.", status: 429 };
      const alvo = p.itens[Number(item)];
      if (!alvo) return { erro: "Arquivo não encontrado.", status: 404 };
      tx.update(ref, { downloads: FieldValue.increment(1), ultimoDownloadEm: FieldValue.serverTimestamp() });
      return { caminho: alvo.caminho as string, titulo: alvo.titulo as string, email: p.comprador.email as string };
    });
    if ("erro" in dados) return NextResponse.json({ erro: dados.erro }, { status: dados.status });

    const [arquivo] = await bucketAdmin().file(dados.caminho).download();
    const marcado = await marcar(arquivo, dados.email);
    const nome = dados.titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 60) || "produto";
    return new NextResponse(new Uint8Array(marcado), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nome}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (e) {
    console.error(JSON.stringify({ evento: "download", pedido, ok: false, erro: String(e) }));
    return NextResponse.json({ erro: "Não foi possível preparar o arquivo. Tente de novo." }, { status: 500 });
  }
}
