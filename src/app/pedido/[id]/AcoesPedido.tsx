"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Botao } from "@/components/ui";

/** Enquanto aguarda o aviso do gateway, recarrega os dados da página a cada 5 segundos. */
export function AcoesPedido() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);
  return <p className="mt-4 flex items-center gap-2 text-sm text-suave"><Loader2 size={15} className="animate-spin" /> Verificando...</p>;
}

export function OfertaUpsell({ pedidoId, token, oferta, preco }: { pedidoId: string; token: string; oferta: { titulo: string; chamada: string }; preco: string }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const comprar = async () => {
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ upsellDe: pedidoId, token }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.erro ?? "Oferta indisponível.");
      window.location.href = j.urlPagamento;
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-primaria/40 bg-primaria/10 p-4">
      <p className="font-semibold">Aproveite também: {oferta.titulo}</p>
      {oferta.chamada && <p className="mt-1 text-sm text-suave">{oferta.chamada}</p>}
      <Botao className="mt-3 w-full" onClick={comprar} disabled={enviando}>
        {enviando && <Loader2 size={15} className="animate-spin" />} Quero por {preco}
      </Botao>
      {erro && <p className="mt-2 text-sm text-erro" role="alert">{erro}</p>}
    </div>
  );
}
