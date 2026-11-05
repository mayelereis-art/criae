import { NextResponse } from "next/server";
import { tokenDoVendedor, vendedorDaConta } from "@/lib/pagamentos/conexoes";
import { chaveWebhookValida, mercadoPago } from "@/lib/pagamentos/mercadopago";
import { processarAvisoAssinatura, processarAvisoCobranca } from "@/lib/pagamentos/assinaturas";
import { aplicarPagamento } from "@/lib/pedidos/servidor";

/**
 * Único caminho que confirma pagamento. A chave da URL ou a assinatura provam que o aviso veio do
 * Mercado Pago; mesmo assim o status é lido de novo na API, nunca do corpo do aviso.
 * A URL traz a chave: nunca registrá-la nos logs.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const idDado = url.searchParams.get("data.id");
  const valido = chaveWebhookValida(url.searchParams.get("chave"))
    || mercadoPago.validarAssinatura({ assinatura: req.headers.get("x-signature"), requestId: req.headers.get("x-request-id"), idDado });
  if (!valido) {
    // Só presença e tamanho, nunca os valores: separa segredo errado de cabeçalho perdido no caminho.
    console.warn(JSON.stringify({
      evento: "webhook", ok: false, motivo: "assinatura",
      temChave: url.searchParams.has("chave"), temAssinatura: !!req.headers.get("x-signature"), temRequestId: !!req.headers.get("x-request-id"), temIdDado: !!idDado,
      tamanhoSegredo: process.env.MP_WEBHOOK_SECRET?.trim().length ?? 0,
    }));
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  const corpo = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; user_id?: number | string; data?: { id?: string | number } };
  const tipo = corpo.type ?? corpo.topic ?? url.searchParams.get("type");
  const pagamentoId = idDado ?? (corpo.data?.id !== undefined ? String(corpo.data.id) : null);
  // Assinatura da plataforma: cobrada na conta da Criaê, não na do criador.
  if ((tipo === "subscription_preapproval" || tipo === "subscription_authorized_payment") && pagamentoId) {
    try {
      const resultado = tipo === "subscription_preapproval" ? await processarAvisoAssinatura(pagamentoId) : await processarAvisoCobranca(pagamentoId);
      console.info(JSON.stringify({ evento: "webhook-assinatura", tipo, resultado }));
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error(JSON.stringify({ evento: "webhook-assinatura", tipo, ok: false, erro: String(e).slice(0, 300) }));
      return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
    }
  }
  if (tipo !== "payment" || !pagamentoId) return NextResponse.json({ ok: true, ignorado: tipo ?? "sem-tipo" });

  try {
    const vendedorId = corpo.user_id !== undefined ? await vendedorDaConta(String(corpo.user_id)) : null;
    if (!vendedorId) {
      // Conta desconhecida (ex.: botão "Simular notificação" do painel): 200 para não gerar reenvios.
      console.info(JSON.stringify({ evento: "webhook", pagamentoId, resultado: "conta-desconhecida", conta: corpo.user_id ?? null }));
      return NextResponse.json({ ok: true, ignorado: "conta-desconhecida" });
    }
    const token = await tokenDoVendedor(vendedorId);
    const pagamento = token ? await mercadoPago.consultarPagamento(token, pagamentoId) : null;
    if (!pagamento) return NextResponse.json({ ok: true, ignorado: "pagamento-nao-encontrado" });
    const resultado = await aplicarPagamento(pagamento, vendedorId);
    console.info(JSON.stringify({ evento: "webhook", pagamentoId, pedidoId: pagamento.referencia, status: pagamento.status, resultado }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 500 faz o Mercado Pago reenviar depois: nenhuma venda se perde numa falha passageira.
    console.error(JSON.stringify({ evento: "webhook", pagamentoId, ok: false, erro: String(e) }));
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
}
