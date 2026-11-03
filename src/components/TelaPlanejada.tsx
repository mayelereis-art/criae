import { CheckCircle2 } from "lucide-react";
import { itemPorHref } from "@/config/navegacao";
import { AvisoEtapa, CabecalhoPagina, Cartao, EstadoVazio } from "./ui";

/** Tela cuja estrutura existe mas cuja função depende de backend/integração de uma etapa futura. */
export function TelaPlanejada({
  href, descricao, recursos, vazio,
}: { href: string; descricao: string; recursos: string[]; vazio: { titulo: string; texto: string } }) {
  const item = itemPorHref(href)!;
  return (
    <>
      <CabecalhoPagina titulo={item.rotulo} descricao={descricao} />
      <AvisoEtapa etapa={item.etapa} oQueFalta="Esta tela já tem lugar no painel; os dados e as ações são ligados nesta etapa do plano." />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <EstadoVazio icone={item.icone} titulo={vazio.titulo} texto={vazio.texto} />
        <Cartao>
          <p className="mb-3 font-mono text-[10px] tracking-[0.2em] text-apagado uppercase">O que esta tela vai fazer</p>
          <ul className="space-y-2.5">
            {recursos.map((r) => (
              <li key={r} className="flex gap-2.5 text-sm text-suave">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primaria-clara" />
                {r}
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
    </>
  );
}
