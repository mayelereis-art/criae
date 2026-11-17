"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PIXEL_ID, capturarOrigem, evento, lerConsentimento, salvarConsentimento, type Consentimento } from "@/lib/rastreamento";

/** Páginas dos criadores e dos compradores deles: o Pixel do Criaê não acompanha essas pessoas. */
const foraDoRastreio = (caminho: string) => caminho.startsWith("/p/") || caminho.startsWith("/pedido");

export function Rastreamento() {
  const caminho = usePathname() ?? "/";
  const [consentimento, setConsentimento] = useState<Consentimento | "carregando">("carregando");
  const fora = foraDoRastreio(caminho);

  useEffect(() => {
    if (fora) return;
    capturarOrigem();
    const ler = () => setConsentimento(lerConsentimento());
    ler();
    window.addEventListener("criae-consentimento", ler);
    return () => window.removeEventListener("criae-consentimento", ler);
  }, [fora]);

  // Uma visualização por página, só com consentimento.
  useEffect(() => {
    if (!fora && consentimento === "aceito") evento("PageView");
  }, [caminho, consentimento, fora]);

  if (fora || !PIXEL_ID || consentimento !== null) return null;
  return (
    <div role="dialog" aria-label="Cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-borda-forte bg-superficie p-4 shadow-2xl sm:inset-x-6">
      <p className="text-sm text-suave">
        Usamos cookies da Meta para medir quais divulgações trazem pessoas ao Criaê. Você pode recusar sem perder nada do site.{" "}
        <Link href="/privacidade" className="text-primaria-clara underline">Política de Privacidade</Link>
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => salvarConsentimento("recusado")} className="rounded-xl border border-borda-forte px-4 py-2 text-sm font-semibold hover:border-primaria-clara">Recusar</button>
        <button type="button" onClick={() => salvarConsentimento("aceito")} className="rounded-xl bg-primaria px-4 py-2 text-sm font-semibold text-white hover:bg-primaria-clara">Aceitar</button>
      </div>
    </div>
  );
}
