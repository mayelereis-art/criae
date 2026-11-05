"use client";

import { doc, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "./ProvedorAuth";

/** Avisos de consumo e de pagamento em todo o painel. Sem aviso, não ocupa espaço. */
export function AvisoConta() {
  const { usuario } = useAuth();
  const [saldo, setSaldo] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    const a = onSnapshot(doc(db, "creditos", usuario.uid), (s) => setSaldo(s.exists() ? (s.data().saldo ?? 0) : null), () => setSaldo(null));
    const b = onSnapshot(doc(db, "assinaturas", usuario.uid), (s) => setStatus(s.data()?.status ?? null), () => setStatus(null));
    return () => { a(); b(); };
  }, [usuario]);

  let texto = "";
  if (status === "inadimplente") texto = "O pagamento da sua assinatura não foi confirmado. Atualize o pagamento para não perder o acesso à IA.";
  else if (saldo === 0) texto = status === "ativa" ? "Seus créditos do mês acabaram. Eles renovam na próxima cobrança, ou você pode mudar de plano." : "Seus créditos acabaram. Assine um plano para continuar usando a IA.";
  else if (saldo !== null && saldo <= 20) texto = `Restam ${saldo} créditos.`;
  if (!texto) return null;

  return (
    <p className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-alerta/40 bg-alerta/10 p-3 text-sm text-alerta" role="status">
      <AlertTriangle size={16} className="shrink-0" /> {texto}
      <Link href="/assinatura" className="font-semibold underline">Ver planos</Link>
    </p>
  );
}
