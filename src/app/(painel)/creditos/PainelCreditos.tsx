"use client";

import { collection, doc, limit, onSnapshot, orderBy, query, where, type Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Cartao, classesBotao } from "@/components/ui";
import { CREDITOS_INICIAIS_PADRAO, OPERACOES, PLANOS_PADRAO, ROTULO_MOVIMENTO, custosPadrao, type Operacao, type Plano } from "@/config/planos";
import { db } from "@/lib/firebase/client";

type Movimento = { id: string; tipo: string; operacao?: Operacao; motivo?: string; creditos: number; saldoApos: number; criadoEm: Timestamp | null };

export function PainelCreditos() {
  const { usuario } = useAuth();
  const [saldo, setSaldo] = useState<number | null | undefined>(undefined);
  const [custos, setCustos] = useState(custosPadrao());
  const [iniciais, setIniciais] = useState(CREDITOS_INICIAIS_PADRAO);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [movimentos, setMovimentos] = useState<Movimento[] | null>(null);

  useEffect(() => {
    if (!usuario) return;
    const a = onSnapshot(doc(db, "creditos", usuario.uid), (s) => setSaldo(s.exists() ? (s.data().saldo ?? 0) : null), () => setSaldo(null));
    const b = onSnapshot(doc(db, "configuracoes", "creditos"), (s) => {
      const d = s.data();
      if (d?.custos) setCustos({ ...custosPadrao(), ...d.custos });
      if (typeof d?.creditosIniciais === "number") setIniciais(d.creditosIniciais);
    }, () => {});
    const c = onSnapshot(query(collection(db, "movimentos_creditos"), where("donoId", "==", usuario.uid), orderBy("criadoEm", "desc"), limit(100)), (s) => setMovimentos(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Movimento)), () => setMovimentos([]));
    const e = onSnapshot(doc(db, "assinaturas", usuario.uid), (s) => {
      const id = s.data()?.planoId;
      setPlano(s.data()?.status === "pendente" ? null : PLANOS_PADRAO.find((p) => p.id === id) ?? null);
      if (id) onSnapshot(doc(db, "planos", id), (p) => p.exists() && s.data()?.status !== "pendente" && setPlano({ ...p.data(), id } as Plano), () => {});
    }, () => setPlano(null));
    return () => { a(); b(); c(); e(); };
  }, [usuario]);

  if (saldo === undefined) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;

  const atual = saldo ?? iniciais; // conta nova recebe os iniciais no primeiro uso
  const total = plano?.creditosMes ?? iniciais;
  const fracao = total ? Math.min(1, atual / total) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <Cartao>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-suave">Saldo</p>
              <p className="mt-0.5 font-display text-4xl font-bold">{atual.toLocaleString("pt-BR")} <span className="text-base font-normal text-suave">créditos</span></p>
              <p className="mt-1 text-sm text-suave">{plano ? `Plano ${plano.nome}: ${plano.creditosMes.toLocaleString("pt-BR")} por mês` : "Créditos iniciais, sem plano ativo"}</p>
            </div>
            <Link href="/assinatura" className={classesBotao("secundario")}>{plano ? "Mudar de plano" : "Ver planos"}</Link>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-superficie-2" role="progressbar" aria-valuenow={Math.round(fracao * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Créditos restantes">
            <div className={`h-full rounded-full ${fracao <= 0.2 ? "bg-alerta" : "bg-primaria"}`} style={{ width: `${fracao * 100}%` }} />
          </div>
        </Cartao>

        <Cartao>
          <h2 className="mb-3 font-semibold">Histórico</h2>
          {!movimentos ? <Loader2 size={16} className="animate-spin text-suave" /> : movimentos.length ? (
            <ul className="divide-y divide-borda text-sm">
              {movimentos.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate">{m.operacao ? OPERACOES[m.operacao]?.nome ?? m.operacao : ROTULO_MOVIMENTO[m.tipo] ?? m.tipo}</span>
                    <span className="block text-xs text-apagado">{m.tipo === "estorno" ? "Devolução por falha · " : ""}{m.motivo ? `${m.motivo} · ` : ""}{m.criadoEm?.toDate().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block font-semibold ${m.creditos < 0 ? "" : "text-sucesso"}`}>{m.creditos > 0 ? "+" : ""}{m.creditos}</span>
                    <span className="block text-xs text-apagado">saldo {m.saldoApos}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-suave">Nenhum uso ainda. Cada geração com IA aparece aqui.</p>}
        </Cartao>
      </div>

      <Cartao className="self-start">
        <h2 className="mb-3 font-semibold">Quanto custa cada ação</h2>
        <ul className="space-y-2 text-sm">
          {(Object.keys(OPERACOES) as Operacao[]).map((k) => (
            <li key={k} className="flex justify-between gap-3"><span className="text-suave">{OPERACOES[k].nome}</span><span className="shrink-0 font-semibold">{custos[k]}</span></li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-apagado">Se a geração falhar, os créditos voltam sozinhos.</p>
      </Cartao>
    </div>
  );
}
