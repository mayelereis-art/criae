"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Botao, Campo, Cartao, Selo, estiloEntrada } from "@/components/ui";
import { OPERACOES, ROTULO_ASSINATURA, type Operacao, type Plano, type StatusAssinatura } from "@/config/planos";
import { formatarPreco } from "@/lib/formato";
import { lerReais } from "@/lib/oferta";

type Usuario = { uid: string; email: string; nome: string; criadoEm: number | null; saldo: number | null; bloqueado: boolean; usados30d: number; planoId: string | null; status: StatusAssinatura | null; renovaEm: number | null };
type Consumo = { operacao: string; nome: string; chamadas: number; creditos: number; entrada: number; saida: number; imagens: number };
type Dados = {
  resumo: { usuarios: number; assinaturasAtivas: number; inadimplentes: number; receitaRecorrenteCentavos: number; recebido30dCentavos: number; limiteListaAtingido: boolean };
  usuarios: Usuario[]; planos: Plano[]; consumo: Consumo[]; config: { custos: Record<string, number>; creditosIniciais: number };
};

const ABAS = ["Resumo", "Usuários", "Planos", "Custos"] as const;

export function PainelAdmin() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Resumo");
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const res = await fetch("/api/admin", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setErro(j.erro ?? "Não foi possível carregar.");
    setDados(j);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const enviar = useCallback(async (corpo: object, sucesso: string) => {
    setErro("");
    setAviso("");
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErro(j.erro ?? "Não foi possível salvar."); return false; }
    setAviso(sucesso);
    await carregar();
    return true;
  }, [carregar]);

  if (!dados) return erro ? <p className="text-sm text-erro" role="alert">{erro}</p> : <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Áreas da administração" className="flex gap-1.5 overflow-x-auto pb-1">
        {ABAS.map((a) => (
          <button key={a} type="button" role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={clsx("shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition", aba === a ? "bg-primaria text-white" : "text-suave hover:bg-superficie-2 hover:text-texto")}>{a}</button>
        ))}
      </div>
      {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
      {aviso && <p className="text-sm text-sucesso" role="status">{aviso}</p>}
      {aba === "Resumo" && <Resumo d={dados} />}
      {aba === "Usuários" && <Usuarios d={dados} enviar={enviar} />}
      {aba === "Planos" && <div className="grid gap-4 lg:grid-cols-3">{dados.planos.map((p) => <EditorPlano key={p.id} plano={p} enviar={enviar} />)}</div>}
      {aba === "Custos" && <EditorCustos config={dados.config} enviar={enviar} />}
    </div>
  );
}

function Indicador({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return <Cartao className="p-4!"><p className="text-xs text-suave">{rotulo}</p><p className="mt-1 font-display text-2xl font-bold">{valor}</p>{nota && <p className="mt-0.5 text-xs text-apagado">{nota}</p>}</Cartao>;
}

function Resumo({ d }: { d: Dados }) {
  const r = d.resumo;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Indicador rotulo="Usuários" valor={String(r.usuarios)} nota={r.limiteListaAtingido ? "Mostrando os 500 primeiros" : undefined} />
        <Indicador rotulo="Assinaturas ativas" valor={String(r.assinaturasAtivas)} />
        <Indicador rotulo="Pagamento pendente" valor={String(r.inadimplentes)} />
        <Indicador rotulo="Receita recorrente" valor={formatarPreco(r.receitaRecorrenteCentavos)} nota="Pelo preço atual dos planos" />
        <Indicador rotulo="Recebido em 30 dias" valor={formatarPreco(r.recebido30dCentavos)} />
      </div>
      <Cartao className="overflow-x-auto">
        <h2 className="mb-3 font-semibold">Consumo de IA em 30 dias</h2>
        {d.consumo.length ? (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-suave"><tr><th className="py-2 font-medium">Operação</th><th className="font-medium">Usos</th><th className="font-medium">Créditos</th><th className="font-medium">Tokens de entrada</th><th className="font-medium">Tokens de saída</th><th className="font-medium">Imagens</th></tr></thead>
            <tbody className="divide-y divide-borda">
              {d.consumo.map((c) => <tr key={c.operacao}><td className="py-2">{c.nome}</td><td>{c.chamadas}</td><td>{c.creditos}</td><td>{c.entrada.toLocaleString("pt-BR")}</td><td>{c.saida.toLocaleString("pt-BR")}</td><td>{c.imagens}</td></tr>)}
            </tbody>
          </table>
        ) : <p className="text-sm text-suave">Nenhum uso nos últimos 30 dias.</p>}
        <p className="mt-3 text-xs text-apagado">Use tokens e imagens para comparar com as faturas da Anthropic e da OpenAI e calibrar os custos em créditos.</p>
      </Cartao>
    </>
  );
}

function Usuarios({ d, enviar }: { d: Dados; enviar: (c: object, s: string) => Promise<boolean> }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [delta, setDelta] = useState("");
  const [motivo, setMotivo] = useState("");
  const lista = useMemo(() => d.usuarios.filter((u) => `${u.nome} ${u.email}`.toLowerCase().includes(busca.toLowerCase())), [d.usuarios, busca]);
  const nomePlano = (id: string | null) => d.planos.find((p) => p.id === id)?.nome ?? "Sem plano";

  return (
    <>
      <input aria-label="Buscar usuário" placeholder="Buscar por nome ou e-mail" className={`${estiloEntrada} max-w-md`} value={busca} onChange={(e) => setBusca(e.target.value)} />
      <ul className="grid gap-3">
        {lista.map((u) => (
          <li key={u.uid}>
            <Cartao className="p-4!">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{u.nome || u.email}</span>
                    {u.bloqueado && <Selo tom="vermelho">Suspensa</Selo>}
                    {u.status && <Selo tom={u.status === "ativa" ? "verde" : "amarelo"}>{ROTULO_ASSINATURA[u.status]}</Selo>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-suave">{u.email} · {nomePlano(u.planoId)} · saldo {u.saldo ?? "sem uso"} · {u.usados30d} usados em 30 dias</p>
                </div>
                <div className="flex gap-1.5">
                  <Botao variante="secundario" onClick={() => { setAberto(aberto === u.uid ? null : u.uid); setDelta(""); setMotivo(""); }}>Ajustar créditos</Botao>
                  <Botao variante="fantasma" onClick={() => confirm(u.bloqueado ? "Reativar esta conta?" : "Suspender esta conta? Ela deixa de usar a IA; vendas e páginas continuam.") && enviar({ acao: "suspender", uid: u.uid, bloqueado: !u.bloqueado }, u.bloqueado ? "Conta reativada." : "Conta suspensa.")}>{u.bloqueado ? "Reativar" : "Suspender"}</Botao>
                </div>
              </div>
              {aberto === u.uid && (
                <form className="mt-3 grid gap-3 border-t border-borda pt-3 sm:grid-cols-[120px_1fr_auto] sm:items-end" onSubmit={async (e) => { e.preventDefault(); if (await enviar({ acao: "ajustar", uid: u.uid, delta: Number(delta), motivo }, "Créditos ajustados.")) setAberto(null); }}>
                  <Campo rotulo="Quantidade"><input type="number" required step={1} className={estiloEntrada} placeholder="50 ou -50" value={delta} onChange={(e) => setDelta(e.target.value)} /></Campo>
                  <Campo rotulo="Motivo"><input required minLength={3} maxLength={200} className={estiloEntrada} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
                  <Botao type="submit">Aplicar</Botao>
                </form>
              )}
            </Cartao>
          </li>
        ))}
      </ul>
      {!lista.length && <p className="text-sm text-suave">Nenhum usuário encontrado.</p>}
    </>
  );
}

function EditorPlano({ plano, enviar }: { plano: Plano; enviar: (c: object, s: string) => Promise<boolean> }) {
  const [p, setP] = useState(plano);
  const [preco, setPreco] = useState((plano.precoCentavos / 100).toFixed(2).replace(".", ","));
  const numero = (campo: "creditosMes" | "maxProdutos" | "diasTolerancia", rotulo: string) => (
    <Campo rotulo={rotulo}><input type="number" min={0} className={estiloEntrada} value={p[campo]} onChange={(e) => setP({ ...p, [campo]: Number(e.target.value) })} /></Campo>
  );
  return (
    <Cartao>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void enviar({ acao: "plano", plano: { ...p, precoCentavos: lerReais(preco) ?? 0 } }, `Plano ${p.nome} salvo.`); }}>
        <Campo rotulo="Nome"><input required maxLength={40} className={estiloEntrada} value={p.nome} onChange={(e) => setP({ ...p, nome: e.target.value })} /></Campo>
        <Campo rotulo="Descrição"><textarea rows={2} maxLength={200} className={estiloEntrada} value={p.descricao} onChange={(e) => setP({ ...p, descricao: e.target.value })} /></Campo>
        <Campo rotulo="Preço mensal (R$)" dica="Vale para novas assinaturas. Quem já assina continua no valor contratado."><input inputMode="decimal" required className={estiloEntrada} value={preco} onChange={(e) => setPreco(e.target.value)} /></Campo>
        {numero("creditosMes", "Créditos por mês")}
        {numero("maxProdutos", "Limite de produtos com IA")}
        {numero("diasTolerancia", "Dias de tolerância após falha de pagamento")}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primaria" checked={p.ativo} onChange={(e) => setP({ ...p, ativo: e.target.checked })} /> Disponível para novas assinaturas</label>
        <Botao type="submit" variante="secundario">Salvar plano</Botao>
      </form>
    </Cartao>
  );
}

function EditorCustos({ config, enviar }: { config: Dados["config"]; enviar: (c: object, s: string) => Promise<boolean> }) {
  const [custos, setCustos] = useState(config.custos);
  const [iniciais, setIniciais] = useState(config.creditosIniciais);
  return (
    <Cartao className="max-w-xl">
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void enviar({ acao: "config", custos, creditosIniciais: iniciais }, "Custos salvos."); }}>
        {(Object.keys(OPERACOES) as Operacao[]).map((k) => (
          <label key={k} className="flex items-center justify-between gap-4 text-sm">
            {OPERACOES[k].nome}
            <input type="number" min={0} aria-label={`Créditos: ${OPERACOES[k].nome}`} className={`${estiloEntrada} w-24!`} value={custos[k] ?? 0} onChange={(e) => setCustos({ ...custos, [k]: Number(e.target.value) })} />
          </label>
        ))}
        <label className="flex items-center justify-between gap-4 border-t border-borda pt-3 text-sm font-medium">
          Créditos para contas novas, antes de assinar
          <input type="number" min={0} aria-label="Créditos para contas novas" className={`${estiloEntrada} w-24!`} value={iniciais} onChange={(e) => setIniciais(Number(e.target.value))} />
        </label>
        <Botao type="submit" variante="secundario">Salvar custos</Botao>
      </form>
    </Cartao>
  );
}
