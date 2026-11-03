"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Lock, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { EtapasProduto } from "@/components/EtapasProduto";
import { useProduto } from "@/components/useProduto";
import { Botao, Campo, Cartao, EstadoVazio, Selo, classesBotao, estiloEntrada } from "@/components/ui";
import { alternarCupom, criarCupom, excluirCupom, ouvirCupons, type Cupom } from "@/lib/cupons";
import { mensagemErro } from "@/lib/firebase/erros";
import { formatarPreco } from "@/lib/formato";
import { chamarIA } from "@/lib/ia/cliente";
import type { SugestaoPreco } from "@/lib/ia/esquemas";
import { lerReais, salvarOferta, type Oferta, type ProdutoAdicional } from "@/lib/oferta";
import { configuracaoProdutoSchema } from "@/lib/validacao/produto";
import { useProdutos } from "../../ListaProdutos";

const FAIXAS = [
  { chave: "entrada", nome: "Entrada" },
  { chave: "recomendado", nome: "Recomendado" },
  { chave: "premium", nome: "Premium" },
] as const;

const reais = (c?: number) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");

export function EditorPreco({ produtoId }: { produtoId: string }) {
  const router = useRouter();
  const { produto, erro: erroProduto } = useProduto(produtoId);
  const { lista: produtos } = useProdutos();
  const [sugestoes, setSugestoes] = useState<SugestaoPreco | undefined>();
  const [preco, setPreco] = useState("");
  const [precoDe, setPrecoDe] = useState("");
  const [garantia, setGarantia] = useState(7);
  const [bump, setBump] = useState<ProdutoAdicional | undefined>();
  const [upsell, setUpsell] = useState<ProdutoAdicional | undefined>();
  const [carregado, setCarregado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);

  useEffect(() => {
    if (!produto || carregado) return;
    const o = produto.oferta;
    if (o) {
      setPreco(reais(o.precoCentavos));
      setPrecoDe(reais(o.precoOriginalCentavos));
      setGarantia(o.garantiaDias);
      setSugestoes(o.sugestoes);
      setBump(o.orderBump);
      setUpsell(o.upsell);
    }
    setCarregado(true);
  }, [produto, carregado]);

  if (produto === undefined) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (produto === null) return <EstadoVazio icone={Lock} titulo="Produto não encontrado" texto={erroProduto || "Ele pode ter sido excluído ou não pertence a esta conta."} />;

  const config = configuracaoProdutoSchema.safeParse(produto.configuracao);
  if (!produto.planejamento || !produto.planejamentoAprovado || !config.success)
    return (
      <>
        <EtapasProduto produtoId={produtoId} atual={6} concluidas={produto.etapa} />
        <EstadoVazio icone={Lock} titulo="Aprove o planejamento primeiro" texto="O preço considera a profundidade e o conteúdo do material.">
          <Link href={`/produtos/${produtoId}/planejamento`} className={classesBotao()}>Ir para o planejamento</Link>
        </EstadoVazio>
      </>
    );

  const gerar = async () => {
    setErro("");
    setGerando(true);
    try {
      const s = await chamarIA<SugestaoPreco>("preco", { configuracao: config.data, planejamento: produto.planejamento });
      setSugestoes(s);
      if (!preco) setPreco(reais(s.recomendado.precoCentavos));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerando(false);
    }
  };

  const salvar = async (seguir: boolean) => {
    const centavos = lerReais(preco);
    if (!centavos || centavos < 500 || centavos > 500000) return setErro("Informe um preço entre R$ 5,00 e R$ 5.000,00.");
    const de = precoDe.trim() ? lerReais(precoDe) : undefined;
    if (de === null || (de && de <= centavos)) return setErro("O preço \"de\" precisa ser maior que o preço de venda, ou ficar em branco.");
    const adicionalValido = (a?: ProdutoAdicional) => !a || (a.precoCentavos >= 500 && a.produtoId);
    if (!adicionalValido(bump) || !adicionalValido(upsell)) return setErro("Order bump e upsell precisam de um produto e de um preço a partir de R$ 5,00.");
    setErro("");
    setSalvando(true);
    try {
      const oferta: Oferta = { precoCentavos: centavos, precoOriginalCentavos: de ?? undefined, garantiaDias: garantia, sugestoes, orderBump: bump, upsell };
      await salvarOferta(produtoId, oferta, produto.etapa);
      setSalvoEm(new Date());
      if (seguir) router.push(`/produtos/${produtoId}/pagina`);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const outros = (produtos ?? []).filter((p) => p.id !== produtoId);
  const centavosAtuais = lerReais(preco);

  return (
    <>
      <EtapasProduto produtoId={produtoId} atual={6} concluidas={produto.etapa} />
      <div className="space-y-5">
        <Cartao>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Sugestões de preço</h2>
              <p className="text-xs text-apagado">Baseadas no conteúdo e no público, sem dados de vendas de concorrentes. Você decide o valor.</p>
            </div>
            <Botao variante="secundario" onClick={gerar} disabled={gerando}>
              {gerando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {sugestoes ? "Sugerir de novo" : "Sugerir preços"}
            </Botao>
          </div>
          {sugestoes && (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {FAIXAS.map(({ chave, nome }) => {
                  const f = sugestoes[chave];
                  const ativo = centavosAtuais === f.precoCentavos;
                  return (
                    <button
                      key={chave}
                      onClick={() => setPreco(reais(f.precoCentavos))}
                      aria-pressed={ativo}
                      className={clsx("rounded-xl border p-4 text-left transition", ativo ? "border-primaria-clara bg-primaria/10" : "border-borda hover:border-borda-forte")}
                    >
                      <span className="text-xs text-suave">{nome}</span>
                      <span className="mt-1 block font-display text-2xl font-bold">{formatarPreco(f.precoCentavos)}</span>
                      <span className="mt-2 block text-xs text-suave">{f.justificativa}</span>
                    </button>
                  );
                })}
              </div>
              {sugestoes.observacao && <p className="mt-3 text-xs text-apagado">{sugestoes.observacao}</p>}
            </>
          )}
        </Cartao>

        <Cartao className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Preço de venda (R$)">
            <input inputMode="decimal" className={estiloEntrada} placeholder="29,90" value={preco} onChange={(e) => setPreco(e.target.value)} />
          </Campo>
          <Campo rotulo="Preço &quot;de&quot; (opcional)" dica="Use só se o produto realmente já foi ou será vendido por esse valor.">
            <input inputMode="decimal" className={estiloEntrada} placeholder="47,90" value={precoDe} onChange={(e) => setPrecoDe(e.target.value)} />
          </Campo>
          <Campo rotulo="Garantia" dica="O Código de Defesa do Consumidor já garante 7 dias em compras online.">
            <select className={estiloEntrada} value={garantia} onChange={(e) => setGarantia(Number(e.target.value))}>
              {[7, 15, 30].map((d) => <option key={d} value={d}>{d} dias</option>)}
            </select>
          </Campo>
        </Cartao>

        <div className="grid gap-5 md:grid-cols-2">
          <EditorAdicional titulo="Order bump" descricao="Oferta extra marcada no próprio checkout." valor={bump} aoMudar={setBump} produtos={outros} />
          <EditorAdicional titulo="Upsell" descricao="Oferta mostrada logo depois da compra." valor={upsell} aoMudar={setUpsell} produtos={outros} />
        </div>

        <Cupons produtoId={produtoId} />

        {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {salvoEm && <span className="mr-auto text-xs text-sucesso">Salvo às {salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
          <Botao variante="secundario" onClick={() => salvar(false)} disabled={salvando}><Save size={16} /> Salvar</Botao>
          <Botao onClick={() => salvar(true)} disabled={salvando}>
            {salvando && <Loader2 size={16} className="animate-spin" />} Salvar e ir para a página <ArrowRight size={16} />
          </Botao>
        </div>
      </div>
    </>
  );
}

function EditorAdicional({ titulo, descricao, valor, aoMudar, produtos }: {
  titulo: string; descricao: string; valor?: ProdutoAdicional; aoMudar: (v?: ProdutoAdicional) => void; produtos: { id: string; titulo: string }[];
}) {
  return (
    <Cartao>
      <h2 className="font-semibold">{titulo}</h2>
      <p className="mb-3 text-xs text-apagado">{descricao}</p>
      {produtos.length === 0 ? (
        <p className="text-sm text-suave">Você precisa de outro produto criado para usar esta oferta.</p>
      ) : (
        <div className="space-y-3">
          <select
            aria-label={`Produto do ${titulo}`}
            className={estiloEntrada}
            value={valor?.produtoId ?? ""}
            onChange={(e) => {
              const p = produtos.find((x) => x.id === e.target.value);
              aoMudar(p ? { produtoId: p.id, titulo: p.titulo, precoCentavos: valor?.precoCentavos ?? 0, chamada: valor?.chamada ?? "" } : undefined);
            }}
          >
            <option value="">Sem {titulo.toLowerCase()}</option>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
          </select>
          {valor && (
            <>
              <Campo rotulo="Preço da oferta (R$)">
                <input inputMode="decimal" className={estiloEntrada} defaultValue={reais(valor.precoCentavos)} onChange={(e) => aoMudar({ ...valor, precoCentavos: lerReais(e.target.value) ?? 0 })} />
              </Campo>
              <Campo rotulo="Chamada">
                <input maxLength={140} className={estiloEntrada} value={valor.chamada} onChange={(e) => aoMudar({ ...valor, chamada: e.target.value })} />
              </Campo>
            </>
          )}
        </div>
      )}
    </Cartao>
  );
}

function Cupons({ produtoId }: { produtoId: string }) {
  const { usuario } = useProduto(produtoId);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<Cupom["tipo"]>("percentual");
  const [valor, setValor] = useState("");
  const [usosMax, setUsosMax] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!usuario) return;
    return ouvirCupons(usuario.uid, setCupons, (e) => setErro(mensagemErro(e)));
  }, [usuario]);

  const criar = async () => {
    if (!usuario) return;
    const cod = codigo.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(cod)) return setErro("O código precisa ter de 3 a 20 letras ou números, sem espaços.");
    const v = tipo === "percentual" ? Math.round(Number(valor.replace(",", "."))) : lerReais(valor);
    if (!v || v <= 0 || (tipo === "percentual" && v > 90)) return setErro(tipo === "percentual" ? "O desconto vai de 1% a 90%." : "Informe o valor do desconto.");
    if (cupons.some((c) => c.codigo === cod && c.produtoId === produtoId)) return setErro("Já existe um cupom com esse código neste produto.");
    setErro("");
    try {
      await criarCupom(usuario.uid, { produtoId, codigo: cod, tipo, valor: v, usosMax: usosMax ? Number(usosMax) : null, validoAte: null });
      setCodigo(""); setValor(""); setUsosMax("");
    } catch (e) {
      setErro(mensagemErro(e));
    }
  };

  const doProduto = cupons.filter((c) => c.produtoId === produtoId);

  return (
    <Cartao>
      <h2 className="font-semibold">Cupons de desconto</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px_110px_110px_auto] sm:items-end">
        <Campo rotulo="Código"><input maxLength={20} className={`${estiloEntrada} uppercase`} value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="BEMVINDA10" /></Campo>
        <Campo rotulo="Tipo">
          <select className={estiloEntrada} value={tipo} onChange={(e) => setTipo(e.target.value as Cupom["tipo"])}>
            <option value="percentual">Porcentagem</option>
            <option value="valor">Valor (R$)</option>
          </select>
        </Campo>
        <Campo rotulo={tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}><input inputMode="decimal" className={estiloEntrada} value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <Campo rotulo="Limite de usos"><input inputMode="numeric" className={estiloEntrada} value={usosMax} onChange={(e) => setUsosMax(e.target.value.replace(/\D/g, ""))} placeholder="Sem limite" /></Campo>
        <Botao variante="secundario" onClick={criar}><Plus size={16} /> Criar</Botao>
      </div>
      {erro && <p className="mt-2 text-sm text-erro" role="alert">{erro}</p>}
      {doProduto.length > 0 && (
        <ul className="mt-4 divide-y divide-borda text-sm">
          {doProduto.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="font-mono font-semibold">{c.codigo}</span>
              <span className="text-suave">{c.tipo === "percentual" ? `${c.valor}%` : formatarPreco(c.valor)} · {c.usos} uso(s){c.usosMax ? ` de ${c.usosMax}` : ""}</span>
              <span className="flex items-center gap-2">
                <Selo tom={c.ativo ? "verde" : "neutro"}>{c.ativo ? "Ativo" : "Inativo"}</Selo>
                <Botao variante="fantasma" onClick={() => alternarCupom(c.id, !c.ativo)}>{c.ativo ? "Desativar" : "Ativar"}</Botao>
                <Botao variante="fantasma" className="px-2!" aria-label={`Excluir cupom ${c.codigo}`} onClick={() => excluirCupom(c.id)}><Trash2 size={15} /></Botao>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
