import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { acessoLiberado, rotaSemPlano } from "@/lib/acesso";
import { motivoBloqueio } from "@/lib/creditos/servidor";
import { aplicarCorrecoes } from "@/lib/ia/correcoes";
import { assinaturaKiwifyValida, hottokValido, lerHotmart, lerKiwify, proximoStatus } from "@/lib/pagamentos/avisos-externos";
import { chaveWebhookValida, mercadoPago } from "@/lib/pagamentos/mercadopago";
import { calcularDesconto } from "@/lib/pedidos/montagem";
import { linkDaPlataforma, promoAtiva } from "@/lib/promocao";
import { PLANOS_PADRAO, custosPadrao } from "@/config/planos";

describe("acesso só com plano pago", () => {
  const agora = 1_000_000;
  it("libera quem pagou e tranca o resto", () => {
    expect(acessoLiberado(undefined, agora)).toBe(false);
    expect(acessoLiberado({ status: "pendente", planoId: "mensal" }, agora)).toBe(false);
    expect(acessoLiberado({ status: "ativa" }, agora)).toBe(true);
    expect(acessoLiberado({ status: "inadimplente" }, agora)).toBe(true);
    expect(acessoLiberado({ status: "pendente", cortesia: true }, agora)).toBe(true);
  });
  it("cancelada vale até o fim do período pago", () => {
    expect(acessoLiberado({ status: "cancelada", renovaEm: new Date(agora + 1) }, agora)).toBe(true);
    expect(acessoLiberado({ status: "cancelada", renovaEm: new Date(agora) }, agora)).toBe(false);
    expect(acessoLiberado({ status: "cancelada" }, agora)).toBe(false);
  });
  it("sem plano, só assinatura, conta e ajuda abrem", () => {
    expect(rotaSemPlano("/assinatura")).toBe(true);
    expect(rotaSemPlano("/conta")).toBe(true);
    expect(rotaSemPlano("/visao-geral")).toBe(false);
    expect(rotaSemPlano("/assinaturas-falsas")).toBe(false);
  });
});

describe("oferta com prazo", () => {
  it("vale só até o fim do prazo", () => {
    expect(promoAtiva({ precoCentavos: 1000, terminaEm: 2000 }, 1999)).toBe(true);
    expect(promoAtiva({ precoCentavos: 1000, terminaEm: 2000 }, 2000)).toBe(false);
    expect(promoAtiva(null)).toBe(false);
  });
});

describe("checkout externo", () => {
  it("aceita só o domínio da plataforma escolhida", () => {
    expect(linkDaPlataforma("kiwify", "https://pay.kiwify.com.br/abc")).toBe(true);
    expect(linkDaPlataforma("hotmart", "https://pay.hotmart.com/abc")).toBe(true);
    expect(linkDaPlataforma("kiwify", "https://pay.hotmart.com/abc")).toBe(false);
    expect(linkDaPlataforma("kiwify", "https://pay.kiwify.com.br.golpe.com/abc")).toBe(false);
    expect(linkDaPlataforma("hotmart", "http://pay.hotmart.com/abc")).toBe(false);
    expect(linkDaPlataforma("kiwify", "javascript:alert(1)")).toBe(false);
  });
});

describe("desconto de cupom", () => {
  it("calcula e nunca passa do preço", () => {
    expect(calcularDesconto(1000, "percentual", 10)).toBe(100);
    expect(calcularDesconto(1000, "valor", 300)).toBe(300);
    expect(calcularDesconto(1000, "valor", 5000)).toBe(1000);
  });
});

describe("correções da revisão", () => {
  it("troca só o trecho exato e não perde texto", () => {
    expect(aplicarCorrecoes("A unha é bonita.", [{ trecho: "é bonita", substituicao: "fica bonita" }])).toEqual({ texto: "A unha fica bonita.", aplicadas: 1 });
    expect(aplicarCorrecoes("abc", [{ trecho: "xyz", substituicao: "1" }])).toEqual({ texto: "abc", aplicadas: 0 });
    expect(aplicarCorrecoes("abc", [{ trecho: "", substituicao: "1" }]).aplicadas).toBe(0);
  });
  it("não interpreta caracteres especiais da substituição", () => {
    expect(aplicarCorrecoes("preço X", [{ trecho: "X", substituicao: "R$& 10" }]).texto).toBe("preço R$& 10");
  });
});

describe("bloqueio de IA", () => {
  const plano = PLANOS_PADRAO[0];
  const t = (ms: number) => ({ toMillis: () => ms });
  const agora = 1_000_000_000_000;
  const dia = 864e5;
  it("conta sem assinatura e ativa usam normalmente", () => {
    expect(motivoBloqueio(undefined, undefined, agora)).toBeNull();
    expect(motivoBloqueio({ status: "ativa", renovaEm: t(agora + dia) }, plano, agora)).toBeNull();
  });
  it("inadimplente bloqueia só depois da tolerância", () => {
    expect(motivoBloqueio({ status: "inadimplente", inadimplenteDesde: t(agora - 2 * dia) }, plano, agora)).toBeNull();
    expect(motivoBloqueio({ status: "inadimplente", inadimplenteDesde: t(agora - 4 * dia) }, plano, agora)).toBeTruthy();
  });
  it("cancelada usa até o fim do período pago", () => {
    expect(motivoBloqueio({ status: "cancelada", renovaEm: t(agora + dia) }, plano, agora)).toBeNull();
    expect(motivoBloqueio({ status: "cancelada", renovaEm: t(agora - 1) }, plano, agora)).toBeTruthy();
  });
  it("renovação não confirmada bloqueia depois da tolerância", () => {
    expect(motivoBloqueio({ status: "ativa", renovaEm: t(agora - 2 * dia) }, plano, agora)).toBeNull();
    expect(motivoBloqueio({ status: "ativa", renovaEm: t(agora - 4 * dia) }, plano, agora)).toBeTruthy();
  });
  it("vitalício ativo não tem data de vencimento", () => {
    expect(motivoBloqueio({ status: "ativa", tipo: "vitalicio" }, PLANOS_PADRAO[1], agora)).toBeNull();
  });
});

describe("planos padrão", () => {
  it("têm os preços decididos", () => {
    expect(PLANOS_PADRAO.map((p) => [p.id, p.tipo, p.precoCentavos])).toEqual([["mensal", "mensal", 14700], ["vitalicio", "vitalicio", 28700]]);
  });
  it("toda operação tem custo", () => {
    expect(Object.values(custosPadrao()).every((c) => c > 0)).toBe(true);
  });
});

describe("avisos da Kiwify", () => {
  it("confere a assinatura com o exemplo da documentação", () => {
    const corpo = '{"order_id":"9b1c2d3e-0000-4000-8000-000000000001","order_status":"paid","webhook_event_type":"order_approved"}';
    expect(assinaturaKiwifyValida(corpo, "bf18f352a4f981b91dfa3f6d8742a81080ab8c86", "kiwify-token-de-teste")).toBe(true);
    expect(assinaturaKiwifyValida(`${corpo} `, "bf18f352a4f981b91dfa3f6d8742a81080ab8c86", "kiwify-token-de-teste")).toBe(false);
    expect(assinaturaKiwifyValida(corpo, null, "x")).toBe(false);
  });
  it("lê a venda e ignora o que não é venda", () => {
    const v = lerKiwify({ order_id: "o", order_status: "paid", webhook_event_type: "order_approved", Product: { product_id: "p", product_name: "Guia" }, Customer: { full_name: "Ana", email: "a@x.com" }, Commissions: { charge_amount: 1990 }, TrackingParameters: { utm_source: "instagram" } })!;
    expect([v.status, v.valorCentavos, v.produtoNome, v.canal]).toEqual(["pago", 1990, "Guia", "instagram"]);
    expect(lerKiwify({ order_id: "o", order_status: "paid", webhook_event_type: "subscription_renewed" })).toBeNull();
    expect(lerKiwify({ status: "abandoned" })).toBeNull();
  });
});

describe("avisos da Hotmart", () => {
  it("confere o hottok", () => {
    expect(hottokValido("abc", "abc")).toBe(true);
    expect(hottokValido("abd", "abc")).toBe(false);
    expect(hottokValido(null, "abc")).toBe(false);
  });
  it("lê reais e o valor total pago", () => {
    const v = lerHotmart({ event: "PURCHASE_APPROVED", data: { product: { ucode: "u", name: "P" }, buyer: { email: "b@e.com", name: "B" }, purchase: { full_price: { value: 134, currency_value: "BRL" }, price: { value: 150.6 }, transaction: "HP1", origin: { sck: "whatsapp" }, payment: { type: "PIX" } } } })!;
    expect([v.status, v.valorCentavos, v.transacao, v.canal]).toEqual(["pago", 13400, "HP1", "whatsapp"]);
    expect(lerHotmart({ event: "SUBSCRIPTION_CANCELLATION", data: {} })).toBeNull();
  });
});

describe("status de venda externa", () => {
  it("não volta atrás", () => {
    expect(proximoStatus(undefined, "pago")).toBe("pago");
    expect(proximoStatus("pago", "pago")).toBeNull();
    expect(proximoStatus("pago", "cancelado")).toBeNull();
    expect(proximoStatus("pago", "reembolsado")).toBe("reembolsado");
    expect(proximoStatus("reembolsado", "pago")).toBeNull();
  });
});

describe("webhook do Mercado Pago", () => {
  it("aceita a chave certa e recusa sem chave configurada", () => {
    delete process.env.MP_WEBHOOK_CHAVE;
    expect(chaveWebhookValida("qualquer")).toBe(false);
    process.env.MP_WEBHOOK_CHAVE = "segredo";
    expect(chaveWebhookValida("segredo")).toBe(true);
    expect(chaveWebhookValida("errada")).toBe(false);
    expect(chaveWebhookValida(null)).toBe(false);
  });
  it("confere a assinatura x-signature", () => {
    process.env.MP_WEBHOOK_SECRET = "s";
    const v1 = createHmac("sha256", "s").update("id:123;request-id:r;ts:9;").digest("hex");
    expect(mercadoPago.validarAssinatura({ assinatura: `ts=9,v1=${v1}`, requestId: "r", idDado: "123" })).toBe(true);
    expect(mercadoPago.validarAssinatura({ assinatura: `ts=9,v1=${v1}`, requestId: "x", idDado: "123" })).toBe(false);
    expect(mercadoPago.validarAssinatura({ assinatura: null, requestId: "r", idDado: "123" })).toBe(false);
  });
});
