"use client";

import { collection, doc, onSnapshot, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Botao, Campo, Cartao, Selo, estiloEntrada } from "@/components/ui";
import { PLANOS_PADRAO, ROTULO_ASSINATURA, type Plano, type StatusAssinatura } from "@/config/planos";
import { db } from "@/lib/firebase/client";
import { formatarPreco } from "@/lib/formato";

type Assinatura = { planoId: string; status: StatusAssinatura; tipo?: string; renovaEm?: Timestamp; proximaRecargaEm?: Timestamp; gatewayId?: string };
type Pagamento = { id: string; valorCentavos: number; status: string; planoId: string; criadoEm: Timestamp | null };

const data = (t?: Timestamp | null) => t?.toDate().toLocaleDateString("pt-BR");

export function PainelAssinatura() {
  const { usuario } = useAuth();
  const voltou = useSearchParams().get("retorno") === "1";
  const [planos, setPlanos] = useState<Plano[]>(PLANOS_PADRAO);
  const [assinatura, setAssinatura] = useState<Assinatura | null | undefined>(undefined);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [email, setEmail] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!usuario) return;
    setEmail(usuario.email ?? "");
    const a = onSnapshot(collection(db, "planos"), (s) => {
      const salvos = new Map(s.docs.map((d) => [d.id, { ...d.data(), id: d.id } as Plano]));
      setPlanos([...PLANOS_PADRAO.map((p) => salvos.get(p.id) ?? p), ...[...salvos.values()].filter((p) => !PLANOS_PADRAO.some((x) => x.id === p.id))].sort((x, y) => x.ordem - y.ordem));
    }, () => {});
    const b = onSnapshot(doc(db, "assinaturas", usuario.uid), (s) => setAssinatura(s.exists() ? (s.data() as Assinatura) : null), () => setAssinatura(null));
    const c = onSnapshot(query(collection(db, "pagamentos_assinatura"), where("donoId", "==", usuario.uid), orderBy("criadoEm", "desc")), (s) => setPagamentos(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Pagamento)), () => setPagamentos([]));
    return () => { a(); b(); c(); };
  }, [usuario]);

  const chamar = async (corpo: object) => {
    const res = await fetch("/api/assinatura", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.erro ?? "Não foi possível concluir.");
    return j as { url?: string; encontradas?: number };
  };

  const atualizar = async (manual: boolean) => {
    setErro("");
    setOcupado("atualizar");
    try {
      const { encontradas } = await chamar({ acao: "sincronizar" });
      if (manual && !encontradas) setErro("O Mercado Pago ainda não confirmou o pagamento. Tente de novo em alguns minutos.");
    } catch (e) {
      if (manual) setErro((e as Error).message);
    } finally {
      setOcupado("");
    }
  };

  // Ao voltar do pagamento, confere uma vez sem esperar pelo aviso do Mercado Pago.
  const conferiu = useRef(false);
  useEffect(() => {
    if (!voltou || !usuario || conferiu.current) return;
    conferiu.current = true;
    void atualizar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voltou, usuario]);

  const assinar = async (planoId: string) => {
    setErro("");
    setOcupado(planoId);
    try {
      const { url } = await chamar({ acao: "assinar", planoId, ...(email ? { email } : {}) });
      if (url) window.location.href = url;
    } catch (e) {
      setErro((e as Error).message);
      setOcupado("");
    }
  };

  const cancelar = async () => {
    if (!confirm("Cancelar a assinatura? Novas cobranças param, e você continua usando até o fim do período já pago.")) return;
    setErro("");
    setOcupado("cancelar");
    try {
      await chamar({ acao: "cancelar" });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado("");
    }
  };

  if (assinatura === undefined) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;

  const atual = planos.find((p) => p.id === assinatura?.planoId);
  const vigente = assinatura && assinatura.status !== "pendente";

  return (
    <div className="space-y-5">
      {voltou && assinatura?.status !== "ativa" && <p className="rounded-xl border border-borda p-3 text-sm text-suave" role="status">Assim que o Mercado Pago confirmar o pagamento, seu plano e seus créditos aparecem aqui.</p>}
      {assinatura?.status !== "ativa" && <Botao variante="secundario" disabled={!!ocupado} onClick={() => atualizar(true)}>{ocupado === "atualizar" && <Loader2 size={15} className="animate-spin" />} Já paguei: atualizar meu plano</Botao>}
      {erro && <p className="rounded-xl border border-erro/40 bg-erro/10 p-3 text-sm text-erro" role="alert">{erro}</p>}

      <Cartao className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-suave">Plano atual</p>
          <p className="mt-0.5 font-display text-xl font-bold">{vigente && atual ? atual.nome : "Nenhum plano ativo"}</p>
          {vigente && assinatura?.tipo === "vitalicio" && assinatura.status === "ativa" && <p className="mt-1 text-sm text-suave">Acesso sem mensalidade. {assinatura.proximaRecargaEm && `Próxima recarga de créditos a partir de ${data(assinatura.proximaRecargaEm)}.`}</p>}
          {vigente && assinatura?.renovaEm && <p className="mt-1 text-sm text-suave">{assinatura.status === "cancelada" ? `Acesso até ${data(assinatura.renovaEm)}` : `Próxima cobrança em ${data(assinatura.renovaEm)}`}</p>}
        </div>
        <div className="flex items-center gap-2">
          {assinatura && <Selo tom={assinatura.status === "ativa" ? "verde" : assinatura.status === "inadimplente" ? "vermelho" : "amarelo"}>{ROTULO_ASSINATURA[assinatura.status]}</Selo>}
          {assinatura && assinatura.tipo !== "vitalicio" && (assinatura.status === "ativa" || assinatura.status === "inadimplente") && <Botao variante="fantasma" disabled={!!ocupado} onClick={cancelar}>Cancelar assinatura</Botao>}
        </div>
      </Cartao>

      <Cartao>
        <Campo rotulo="E-mail da sua conta do Mercado Pago" dica="Só para o plano Mensal, que é cobrado nessa conta. Use o mesmo e-mail com que você entra no Mercado Pago.">
          <input type="email" className={`${estiloEntrada} max-w-md`} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
      </Cartao>

      <div className="grid gap-4 md:grid-cols-2">
        {planos.filter((p) => p.ativo).map((p) => {
          const eAtual = vigente && assinatura?.status !== "cancelada" && assinatura?.planoId === p.id;
          // Quem já tem o Vitalício não vê o Mensal como opção: não faz sentido pagar duas vezes.
          if (assinatura?.tipo === "vitalicio" && assinatura.status === "ativa" && !eAtual) return null;
          return (
            <Cartao key={p.id} className={eAtual ? "flex flex-col border-primaria-clara!" : "flex flex-col"}>
              <p className="font-display text-lg font-bold">{p.nome}</p>
              <p className="mt-1 text-sm text-suave">{p.descricao}</p>
              <p className="mt-4 font-display text-3xl font-bold">{formatarPreco(p.precoCentavos)}<span className="text-sm font-normal text-suave">{p.tipo === "vitalicio" ? " pagamento único" : " /mês"}</span></p>
              <ul className="mt-4 mb-5 space-y-2 text-sm">
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-sucesso" /> {p.creditosMes.toLocaleString("pt-BR")} créditos por mês{p.tipo === "vitalicio" ? ", renovados enquanto o serviço existir" : ""}</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-sucesso" /> Até {p.maxProdutos} produtos com IA</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-sucesso" /> Vendas por Mercado Pago, Kiwify ou Hotmart</li>
              </ul>
              <div className="mt-auto">
                {eAtual ? <Selo tom="verde">Seu plano</Selo> : (
                  <Botao className="w-full" disabled={!!ocupado || (p.tipo !== "vitalicio" && !email)} onClick={() => assinar(p.id)}>
                    {ocupado === p.id && <Loader2 size={15} className="animate-spin" />} {p.tipo === "vitalicio" ? "Comprar acesso vitalício" : vigente && assinatura?.status !== "cancelada" ? "Mudar para este plano" : "Assinar"}
                  </Botao>
                )}
              </div>
            </Cartao>
          );
        })}
      </div>
      <p className="text-xs text-apagado">Plano Mensal: cobrança automática pelo Mercado Pago, sem fidelidade. Vitalício: um pagamento só; os créditos renovam no primeiro uso de cada mês. Créditos não usados não acumulam. Ao mudar de plano, a assinatura anterior para de cobrar assim que a nova for confirmada.</p>

      <Cartao>
        <h2 className="mb-3 font-semibold">Histórico de pagamentos</h2>
        {pagamentos.length ? (
          <ul className="divide-y divide-borda text-sm">
            {pagamentos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>{data(p.criadoEm)} · {planos.find((x) => x.id === p.planoId)?.nome ?? p.planoId}</span>
                <span className="flex items-center gap-2">{formatarPreco(p.valorCentavos)} <Selo tom={p.status === "pago" ? "verde" : p.status === "recusado" ? "vermelho" : "amarelo"}>{p.status === "pago" ? "Pago" : p.status === "recusado" ? "Recusado" : "Pendente"}</Selo></span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-suave">Nenhum pagamento ainda.</p>}
      </Cartao>
    </div>
  );
}
