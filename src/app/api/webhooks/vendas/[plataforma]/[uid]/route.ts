import { NextResponse } from "next/server";
import { assinaturaKiwifyValida, hottokValido, lerHotmart, lerKiwify } from "@/lib/pagamentos/avisos-externos";
import { lerTokenExterno, registrarVendaExterna } from "@/lib/pedidos/externos";

const LIMITE = 1024 * 1024;

/**
 * Aviso de venda da conta do próprio criador na Kiwify ou Hotmart. Só registra para Minhas vendas:
 * pagamento e entrega são da plataforma. Dados do comprador nunca vão para os registros.
 */
export async function POST(req: Request, { params }: { params: Promise<{ plataforma: string; uid: string }> }) {
  const { plataforma, uid } = await params;
  if (plataforma !== "kiwify" && plataforma !== "hotmart") return NextResponse.json({ erro: "Plataforma desconhecida." }, { status: 404 });

  const corpoBruto = await req.text();
  if (corpoBruto.length > LIMITE) return NextResponse.json({ erro: "Aviso grande demais." }, { status: 413 });

  const url = new URL(req.url);
  const assinatura = url.searchParams.get("signature");
  const hottok = req.headers.get("x-hotmart-hottok");
  const token = await lerTokenExterno(uid, plataforma);
  const valido = !!token && (plataforma === "kiwify" ? assinaturaKiwifyValida(corpoBruto, assinatura, token) : hottokValido(hottok, token));
  if (!valido) {
    console.warn(JSON.stringify({ evento: "aviso-venda", plataforma, ok: false, motivo: "token", configurado: !!token, temAssinatura: !!assinatura, temHottok: !!hottok }));
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(corpoBruto);
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }
  const venda = plataforma === "kiwify" ? lerKiwify(corpo) : lerHotmart(corpo);
  if (!venda) return NextResponse.json({ ok: true, ignorado: true });

  try {
    const teste = venda.transacao.startsWith("TESTE-CRIAE-");
    const resultado = await registrarVendaExterna(uid, plataforma, venda, teste);
    // Só os nomes dos campos, para diagnosticar um valor ausente sem registrar dados pessoais.
    console.info(JSON.stringify({ evento: "aviso-venda", plataforma, ok: true, resultado, status: venda.status, comValor: venda.valorCentavos > 0, campos: venda.valorCentavos > 0 ? undefined : Object.keys(corpo as object).slice(0, 40) }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 500 faz a plataforma reenviar depois.
    console.error(JSON.stringify({ evento: "aviso-venda", plataforma, ok: false, erro: String(e).slice(0, 300) }));
    return NextResponse.json({ erro: "Falha ao registrar." }, { status: 500 });
  }
}
