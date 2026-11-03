"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Botao, Cartao, Selo, classesBotao } from "@/components/ui";
import { db } from "@/lib/firebase/client";

const AVISOS: Record<string, { texto: string; ok?: boolean }> = {
  ok: { texto: "Mercado Pago conectado. As vendas caem direto na sua conta.", ok: true },
  cancelado: { texto: "Você cancelou a conexão no Mercado Pago." },
  estado: { texto: "A conexão expirou. Tente de novo a partir desta tela." },
  erro: { texto: "O Mercado Pago não concluiu a conexão. Tente de novo." },
};

export function PainelIntegracoes() {
  const { usuario } = useAuth();
  const aviso = AVISOS[useSearchParams().get("mp") ?? ""];
  const [mp, setMp] = useState<{ conectado?: boolean; contaId?: string } | null | undefined>(undefined);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    return onSnapshot(doc(db, "integracoes", usuario.uid), (s) => setMp(s.data()?.mercadoPago ?? null), () => setMp(null));
  }, [usuario]);

  const desconectar = async () => {
    if (!confirm("Desconectar o Mercado Pago? Suas páginas param de vender até você conectar de novo.")) return;
    setSaindo(true);
    await fetch("/api/mercadopago/desconectar", { method: "POST" }).catch(() => {});
    setSaindo(false);
  };

  return (
    <div className="space-y-4">
      {aviso && <p className={`rounded-xl border p-3 text-sm ${aviso.ok ? "border-sucesso/40 text-sucesso" : "border-alerta/40 text-alerta"}`} role="status">{aviso.texto}</p>}

      <Cartao>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-borda bg-superficie-2 text-primaria-clara"><CreditCard size={18} /></span>
            <div>
              <p className="font-semibold">Mercado Pago</p>
              <p className="mt-0.5 max-w-lg text-sm text-suave">Recebe Pix e cartão. O dinheiro das vendas cai direto na sua conta do Mercado Pago; a Criaê não guarda seu saldo.</p>
            </div>
          </div>
          {mp === undefined ? (
            <Loader2 size={18} className="animate-spin text-suave" />
          ) : mp?.conectado ? (
            <div className="flex items-center gap-2">
              <Selo tom="verde"><CheckCircle2 size={12} /> Conectado</Selo>
              <Botao variante="fantasma" onClick={desconectar} disabled={saindo}>Desconectar</Botao>
            </div>
          ) : (
            // Link comum: a rota redireciona para o login do Mercado Pago.
            <a href="/api/mercadopago/conectar" className={classesBotao()}>Conectar <ExternalLink size={15} /></a>
          )}
        </div>
        {mp?.conectado && <p className="mt-3 text-xs text-apagado">Para uma página vender, o produto também precisa de uma versão final do PDF salva (etapa PDF).</p>}
      </Cartao>

      <Cartao>
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-borda bg-superficie-2 text-primaria-clara"><Mail size={18} /></span>
          <div>
            <p className="font-semibold">E-mail de entrega</p>
            <p className="mt-0.5 max-w-lg text-sm text-suave">O comprador recebe o link de download por e-mail assim que o pagamento é confirmado. Configurado pela plataforma.</p>
          </div>
        </div>
      </Cartao>
    </div>
  );
}
