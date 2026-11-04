"use client";

import { type Timestamp } from "firebase/firestore";
import { useState } from "react";
import { CheckCircle2, Copy, Loader2, Store } from "lucide-react";
import { Botao, Campo, Cartao, Selo, estiloEntrada } from "@/components/ui";

export type EstadoExterno = { configurado?: boolean; ultimoAvisoEm?: Timestamp } | undefined;

const TEXTOS = {
  kiwify: {
    nome: "Kiwify",
    passos: ["Na Kiwify, abra Apps e depois Webhooks, e crie um webhook com o endereço abaixo.", "Marque Compra aprovada, Compra recusada, Compra reembolsada e Chargeback.", "Copie o token desse webhook e cole aqui."],
    rotulo: "Token do webhook",
  },
  hotmart: {
    nome: "Hotmart",
    passos: ["Na Hotmart, abra Ferramentas e depois Webhook, e cadastre o endereço abaixo.", "Escolha a versão 2.0.0 e os eventos de compra.", "Copie o Hottok da sua conta, na própria tela de Webhook, e cole aqui."],
    rotulo: "Hottok",
  },
} as const;

async function chamar(corpo: object) {
  const res = await fetch("/api/integracoes/externa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).erro ?? "Não foi possível concluir.");
}

export function PlataformaExterna({ plataforma, uid, estado }: { plataforma: "kiwify" | "hotmart"; uid: string; estado: EstadoExterno }) {
  const t = TEXTOS[plataforma];
  const [token, setToken] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const base = process.env.NEXT_PUBLIC_URL_SITE || (typeof window !== "undefined" ? window.location.origin : "");
  const endereco = `${base}/api/webhooks/vendas/${plataforma}/${uid}`;

  const executar = async (corpo: object, sucesso: string) => {
    setOcupado(true);
    setAviso(null);
    try {
      await chamar(corpo);
      setAviso({ texto: sucesso, ok: true });
      setToken("");
    } catch (e) {
      setAviso({ texto: (e as Error).message, ok: false });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Cartao>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-borda bg-superficie-2 text-primaria-clara"><Store size={18} /></span>
          <div>
            <p className="font-semibold">{t.nome}</p>
            <p className="mt-0.5 max-w-lg text-sm text-suave">Use a sua própria conta: pagamento, entrega e repasse ficam na {t.nome}. Ao receber o aviso, a venda aparece em Minhas vendas.</p>
          </div>
        </div>
        {estado?.configurado && <Selo tom="verde"><CheckCircle2 size={12} /> Configurado</Selo>}
      </div>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-suave">{t.passos.map((p) => <li key={p}>{p}</li>)}</ol>

      <div className="mt-4 grid gap-3">
        <Campo rotulo="Endereço do webhook">
          <div className="flex gap-2">
            <input readOnly className={estiloEntrada} value={endereco} onFocus={(e) => e.target.select()} />
            <Botao variante="secundario" aria-label="Copiar endereço" onClick={() => navigator.clipboard.writeText(endereco).then(() => setAviso({ texto: "Endereço copiado.", ok: true })).catch(() => setAviso({ texto: "Selecione o endereço e copie.", ok: false }))}><Copy size={15} /></Botao>
          </div>
        </Campo>
        <Campo rotulo={t.rotulo} dica="Fica guardado cifrado e não aparece de novo.">
          <input type="password" autoComplete="off" className={estiloEntrada} placeholder={estado?.configurado ? "Cole um novo para trocar" : ""} value={token} onChange={(e) => setToken(e.target.value)} />
        </Campo>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Botao disabled={ocupado || !token.trim()} onClick={() => executar({ acao: "salvar", plataforma, token }, "Token salvo.")}>
          {ocupado && <Loader2 size={15} className="animate-spin" />} Salvar token
        </Botao>
        {estado?.configurado && (
          <>
            <Botao variante="secundario" disabled={ocupado} onClick={() => executar({ acao: "testar", plataforma }, "Aviso aceito. Confira a venda de teste em Minhas vendas.")}>Enviar venda de teste</Botao>
            <Botao variante="fantasma" disabled={ocupado} onClick={() => confirm(`Remover o token? Novos avisos da ${t.nome} serão recusados.`) && executar({ acao: "remover", plataforma }, "Token removido.")}>Remover</Botao>
          </>
        )}
      </div>

      {aviso && <p className={`mt-3 text-sm ${aviso.ok ? "text-sucesso" : "text-erro"}`} role="status">{aviso.texto}</p>}
      {estado?.ultimoAvisoEm && <p className="mt-2 text-xs text-apagado">Último aviso recebido em {estado.ultimoAvisoEm.toDate().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.</p>}
    </Cartao>
  );
}
