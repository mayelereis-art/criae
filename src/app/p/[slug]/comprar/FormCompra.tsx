"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { MarcaMetrica, canalGuardado } from "@/components/MarcaMetrica";
import { formatarPreco } from "@/lib/formato";

type Cotacao = { subtotalCentavos: number; descontoCentavos: number; totalCentavos: number; itens: { titulo: string; precoCentavos: number }[] };
type Props = {
  slug: string; titulo: string; aberto: boolean; garantiaDias: number;
  cores: { primaria: string; fundo: string; texto: string; destaque: string };
  bump: { titulo: string; chamada: string; precoCentavos: number } | null;
};

const entrada = "w-full rounded-lg border border-black/20 bg-white px-3 py-2.5 text-[15px] text-black outline-none focus:border-black/60";

export function FormCompra({ slug, titulo, aberto, garantiaDias, cores, bump }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cupomTexto, setCupomTexto] = useState("");
  const [cupom, setCupom] = useState<string | undefined>();
  const [comBump, setComBump] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);
  const [erroCupom, setErroCupom] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // O total na tela sempre vem do servidor, com as mesmas contas do pedido.
  const cotar = useCallback(async (codigo: string | undefined, bumpMarcado: boolean) => {
    const res = await fetch("/api/checkout/cotacao", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, cupom: codigo, comBump: bumpMarcado }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.erro ?? "Não foi possível calcular o total.");
    return j as Cotacao;
  }, [slug]);

  useEffect(() => {
    if (!aberto) return;
    cotar(cupom, comBump).then(setCotacao).catch((e) => setErro((e as Error).message));
  }, [aberto, cotar, cupom, comBump]);

  const aplicarCupom = async () => {
    const codigo = cupomTexto.trim();
    setErroCupom("");
    if (!codigo) return setCupom(undefined);
    try {
      setCotacao(await cotar(codigo, comBump));
      setCupom(codigo);
    } catch (e) {
      setCupom(undefined);
      setErroCupom((e as Error).message);
    }
  };

  const pagar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!aceite) return setErro("Para comprar, aceite os termos de uso e a política de privacidade.");
    setEnviando(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, nome, email, cupom, comBump, canal: canalGuardado(), aceite: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.erro ?? "Não foi possível iniciar o pagamento.");
      window.location.href = j.urlPagamento;
    } catch (err) {
      setErro((err as Error).message);
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <MarcaMetrica slug={slug} tipo="cliques" />
      <h1 className="text-2xl font-bold" style={{ color: cores.primaria }}>Finalizar compra</h1>
      <p className="mt-1 text-sm opacity-80">{titulo}</p>

      {!aberto ? (
        <p className="mt-6 rounded-lg p-4 text-sm" style={{ background: cores.destaque }}>As vendas deste produto ainda não estão abertas.</p>
      ) : (
        <form onSubmit={pagar} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Seu nome
            <input required maxLength={120} autoComplete="name" className={`${entrada} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">Seu e-mail
            <input required type="email" maxLength={200} autoComplete="email" className={`${entrada} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} />
            <span className="mt-1 block text-xs font-normal opacity-70">É para este e-mail que enviamos o produto.</span>
          </label>

          {bump && (
            <label className="flex gap-3 rounded-lg border-2 border-dashed p-3 text-sm" style={{ borderColor: cores.primaria, background: cores.destaque }}>
              <input type="checkbox" className="mt-1" checked={comBump} onChange={(e) => setComBump(e.target.checked)} />
              <span><strong>Adicionar {bump.titulo} por {formatarPreco(bump.precoCentavos)}</strong>{bump.chamada && <span className="mt-0.5 block">{bump.chamada}</span>}</span>
            </label>
          )}

          <div>
            <span className="block text-sm font-medium">Cupom de desconto</span>
            <div className="mt-1 flex gap-2">
              <input maxLength={20} aria-label="Cupom de desconto" className={`${entrada} uppercase`} value={cupomTexto} onChange={(e) => setCupomTexto(e.target.value)} />
              <button type="button" onClick={aplicarCupom} className="shrink-0 rounded-lg border border-black/30 px-4 text-sm font-semibold">Aplicar</button>
            </div>
            {erroCupom && <p className="mt-1 text-sm text-red-700" role="alert">{erroCupom}</p>}
          </div>

          <div className="rounded-lg p-4 text-sm" style={{ background: cores.destaque }}>
            {cotacao ? (
              <>
                {cotacao.descontoCentavos > 0 && <p className="flex justify-between"><span>Desconto ({cupom?.toUpperCase()})</span><span>- {formatarPreco(cotacao.descontoCentavos)}</span></p>}
                <p className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatarPreco(cotacao.totalCentavos)}</span></p>
              </>
            ) : (
              <p className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Calculando...</p>
            )}
            <p className="mt-1 text-xs opacity-75">Pix ou cartão. Garantia de {garantiaDias} dias.</p>
          </div>

          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-1" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
            <span>Li e aceito os <a href="/termos" target="_blank" className="underline">termos de uso</a> e a <a href="/privacidade" target="_blank" className="underline">política de privacidade</a>.</span>
          </label>

          {erro && <p className="text-sm text-red-700" role="alert">{erro}</p>}
          <button type="submit" disabled={enviando || !cotacao} className="flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3.5 font-bold text-white disabled:opacity-50" style={{ background: cores.primaria }}>
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />} Ir para o pagamento
          </button>
          <p className="text-center text-xs opacity-70">Você conclui o pagamento no ambiente seguro do Mercado Pago.</p>
        </form>
      )}
    </div>
  );
}
