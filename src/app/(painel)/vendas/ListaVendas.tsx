"use client";

import { collection, onSnapshot, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Receipt } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Botao, Cartao, EstadoVazio, Selo, estiloEntrada } from "@/components/ui";
import { db } from "@/lib/firebase/client";
import { mensagemErro } from "@/lib/firebase/erros";
import { formatarPreco } from "@/lib/formato";

type Pedido = {
  id: string; produtoId: string; slug: string | null; status: string; totalCentavos: number; plataforma?: "kiwify" | "hotmart"; moeda?: string; canal?: string; metodo?: string | null;
  comprador: { nome: string; email: string }; itens: { titulo: string }[]; downloads: number; cupomCodigo?: string | null;
  emailErro?: string; criadoEm: Timestamp | null;
};

const STATUS: Record<string, { rotulo: string; tom: "verde" | "amarelo" | "vermelho" | "neutro" }> = {
  pago: { rotulo: "Pago", tom: "verde" }, pendente: { rotulo: "Pendente", tom: "amarelo" }, recusado: { rotulo: "Recusado", tom: "vermelho" },
  cancelado: { rotulo: "Cancelado", tom: "neutro" }, reembolsado: { rotulo: "Reembolsado", tom: "neutro" }, contestado: { rotulo: "Contestado", tom: "vermelho" }, teste: { rotulo: "Teste", tom: "amarelo" },
};
const METODO: Record<string, string> = { bank_transfer: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", account_money: "Saldo MP", pix: "Pix", PIX: "Pix", CREDIT_CARD: "Cartão de crédito", credit_card_br: "Cartão de crédito", boleto: "Boleto", BILLET: "Boleto" };
const PLATAFORMA = { kiwify: "Kiwify", hotmart: "Hotmart" } as const;
const valorDe = (p: { totalCentavos: number; moeda?: string }) => (!p.moeda || p.moeda === "BRL" ? formatarPreco(p.totalCentavos) : `${p.moeda} ${(p.totalCentavos / 100).toFixed(2)}`);
const PERIODOS = { "7": "7 dias", "30": "30 dias", "90": "90 dias", tudo: "Tudo" } as const;

async function acao(rota: string, pedidoId: string) {
  const res = await fetch(rota, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pedidoId }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).erro ?? "Não foi possível concluir.");
}

export function ListaVendas() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [erro, setErro] = useState("");
  const [produto, setProduto] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [canal, setCanal] = useState("todos");
  const [periodo, setPeriodo] = useState<keyof typeof PERIODOS>("30");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!usuario) return;
    const q = query(collection(db, "pedidos"), where("vendedorId", "==", usuario.uid), orderBy("criadoEm", "desc"));
    return onSnapshot(q, (s) => setPedidos(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Pedido)), (e) => setErro(mensagemErro(e)));
  }, [usuario]);

  const visiveis = useMemo(() => {
    const limite = periodo === "tudo" ? 0 : Date.now() - Number(periodo) * 864e5;
    return (pedidos ?? []).filter((p) =>
      (produto === "todos" || p.produtoId === produto) && (status === "todos" || p.status === status) && (canal === "todos" || (p.canal ?? "direto") === canal) &&
      (!limite || (p.criadoEm?.toMillis() ?? Date.now()) >= limite));
  }, [pedidos, produto, status, canal, periodo]);

  if (erro) return <p className="text-sm text-erro" role="alert">{erro}</p>;
  if (!pedidos) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (!pedidos.length) return <EstadoVazio icone={Receipt} titulo="Nenhuma venda ainda" texto="Os pedidos aparecem aqui assim que alguém iniciar uma compra. Só contam como vendas os confirmados pelo Mercado Pago, Kiwify ou Hotmart." />;

  const pagos = visiveis.filter((p) => p.status === "pago");
  const emOutraMoeda = pagos.filter((p) => p.moeda && p.moeda !== "BRL").length;
  const faturamento = pagos.filter((p) => !p.moeda || p.moeda === "BRL").reduce((s, p) => s + p.totalCentavos, 0);
  const produtos = [...new Map(pedidos.map((p) => [p.produtoId, p.itens[0]?.titulo ?? p.produtoId])).entries()];
  const canais = [...new Set(pedidos.map((p) => p.canal ?? "direto"))];

  const executar = async (rota: string, p: Pedido, sucesso: string) => {
    setOcupado(p.id);
    setAviso("");
    try { await acao(rota, p.id); setAviso(sucesso); }
    catch (e) { setAviso((e as Error).message); }
    finally { setOcupado(null); }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <select aria-label="Filtrar por produto" className={estiloEntrada} value={produto} onChange={(e) => setProduto(e.target.value)}>
          <option value="todos">Todos os produtos</option>
          {produtos.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
        </select>
        <select aria-label="Filtrar por status" className={estiloEntrada} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
        </select>
        <select aria-label="Filtrar por canal" className={estiloEntrada} value={canal} onChange={(e) => setCanal(e.target.value)}>
          <option value="todos">Todos os canais</option>
          {canais.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Filtrar por período" className={estiloEntrada} value={periodo} onChange={(e) => setPeriodo(e.target.value as keyof typeof PERIODOS)}>
          {Object.entries(PERIODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Cartao className="p-4"><p className="text-xs text-suave">Vendas pagas</p><p className="mt-1 font-display text-2xl font-bold">{pagos.length}</p></Cartao>
        <Cartao className="p-4"><p className="text-xs text-suave">Faturamento bruto</p><p className="mt-1 font-display text-2xl font-bold">{formatarPreco(faturamento)}</p>{emOutraMoeda > 0 && <p className="mt-1 text-xs text-apagado">Fora {emOutraMoeda} em outra moeda.</p>}</Cartao>
      </div>

      {aviso && <p className="text-sm text-suave" role="status">{aviso}</p>}

      <ul className="grid gap-3">
        {visiveis.map((p) => {
          const st = STATUS[p.status] ?? { rotulo: p.status, tom: "neutro" as const };
          return (
            <li key={p.id}>
              <Cartao className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{valorDe(p)}</span>
                    <Selo tom={st.tom}>{st.rotulo}</Selo>
                    {p.plataforma && <Selo tom="azul">{PLATAFORMA[p.plataforma]}</Selo>}
                    {p.metodo && <span className="text-xs text-apagado">{METODO[p.metodo] ?? p.metodo}</span>}
                  </div>
                  <p className="mt-1 truncate text-sm">{p.itens.map((i) => i.titulo).join(" + ")}</p>
                  <p className="mt-0.5 text-xs text-suave">
                    {p.comprador.nome} · {p.comprador.email} · canal {p.canal ?? "direto"}{p.cupomCodigo ? ` · cupom ${p.cupomCodigo}` : ""}
                    {p.criadoEm && ` · ${p.criadoEm.toDate().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`}
                    {p.status === "pago" && !p.plataforma && ` · ${p.downloads} download(s)`}
                  </p>
                  {p.emailErro && <p className="mt-1 flex items-center gap-1.5 text-xs text-erro"><AlertTriangle size={13} /> O e-mail de entrega falhou.</p>}
                </div>
                {p.status === "teste" && (
                  <Botao variante="fantasma" className="shrink-0" disabled={ocupado === p.id} onClick={() => executar("/api/vendas/remover-teste", p, "Venda de teste removida.")}>Remover teste</Botao>
                )}
                {p.status === "pago" && p.plataforma && <p className="shrink-0 text-xs text-suave">Reembolso e entrega na {PLATAFORMA[p.plataforma]}</p>}
                {p.status === "pago" && !p.plataforma && (
                  <div className="flex shrink-0 gap-2">
                    <Botao variante="secundario" disabled={ocupado === p.id} onClick={() => executar("/api/vendas/reenviar", p, "E-mail reenviado.")}>Reenviar e-mail</Botao>
                    <Botao variante="fantasma" disabled={ocupado === p.id}
                      onClick={() => confirm(`Reembolsar ${formatarPreco(p.totalCentavos)} para ${p.comprador.nome}? O valor volta ao comprador e o acesso é encerrado.`) && executar("/api/vendas/reembolsar", p, "Reembolso solicitado.")}>
                      Reembolsar
                    </Botao>
                  </div>
                )}
              </Cartao>
            </li>
          );
        })}
      </ul>
      {!visiveis.length && <p className="text-sm text-suave">Nenhum pedido com esses filtros.</p>}
    </div>
  );
}
