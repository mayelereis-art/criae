"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Globe, Loader2, Lock, Monitor, Plus, RefreshCw, Save, Smartphone, Sparkles, Trash2 } from "lucide-react";
import { EtapasProduto } from "@/components/EtapasProduto";
import { PaginaVenda } from "@/components/PaginaVenda";
import { useProduto } from "@/components/useProduto";
import { Botao, Campo, Cartao, EstadoVazio, Selo, classesBotao, estiloEntrada } from "@/components/ui";
import { mensagemErro } from "@/lib/firebase/erros";
import { chamarIA } from "@/lib/ia/cliente";
import type { TextoPagina } from "@/lib/ia/esquemas";
import { imagemAtual, ouvirImagens, type Imagem } from "@/lib/imagens";
import {
  SECOES, criarSlug, ouvirPaginas, salvarPagina, slugDisponivel, slugValido, trocarSlug,
  type ModeloPagina, type Pagina, type SecaoPagina,
} from "@/lib/paginas";
import { marcarEtapa } from "@/lib/produtos";
import { NOMES_PLATAFORMA, linkDaPlataforma, promoAtiva, type PlataformaVenda } from "@/lib/promocao";
import { configuracaoProdutoSchema, encurtar } from "@/lib/validacao/produto";

type Rascunho = Omit<Pagina, "atualizadoEm" | "checkoutAtivo" | "publicadaEm">;

const MODELOS: Record<ModeloPagina, { nome: string; detalhe: string }> = {
  impacto: { nome: "Impacto", detalhe: "Abertura forte, capa em destaque ao lado do título" },
  editorial: { nome: "Editorial", detalhe: "Abertura forte, tudo em coluna central" },
  essencial: { nome: "Essencial", detalhe: "Abertura clara, sobre o fundo da página" },
};

const linhas = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);
const TODAS_SECOES = Object.fromEntries(Object.keys(SECOES).map((k) => [k, true])) as Record<SecaoPagina, boolean>;

export function EditorPagina({ produtoId }: { produtoId: string }) {
  const { produto, erro: erroProduto, usuario } = useProduto(produtoId);
  const [paginaSalva, setPaginaSalva] = useState<Pagina | null | undefined>(undefined);
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [r, setR] = useState<Rascunho | null>(null);
  const [slugTexto, setSlugTexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [largura, setLargura] = useState<"computador" | "celular">("computador");
  const carregado = useRef(false);

  useEffect(() => {
    if (!usuario) return;
    const a = ouvirPaginas(usuario.uid, (l) => setPaginaSalva(l.find((p) => p.produtoId === produtoId) ?? null), () => setPaginaSalva(null));
    const b = ouvirImagens(usuario.uid, produtoId, setImagens, () => setImagens([]));
    return () => { a(); b(); };
  }, [usuario, produtoId]);

  // Abre a página salva uma vez; a partir daí a edição local manda.
  useEffect(() => {
    if (paginaSalva && !carregado.current) {
      carregado.current = true;
      setR(paginaSalva);
      setSlugTexto(paginaSalva.slug);
    }
  }, [paginaSalva]);

  if (produto === undefined || paginaSalva === undefined) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (produto === null) return <EstadoVazio icone={Lock} titulo="Produto não encontrado" texto={erroProduto || "Ele pode ter sido excluído ou não pertence a esta conta."} />;

  const config = configuracaoProdutoSchema.safeParse(produto.configuracao);
  const plano = produto.planejamento;
  const { oferta, identidade } = produto;
  if (!plano || !config.success || !oferta || !identidade)
    return (
      <>
        <EtapasProduto produtoId={produtoId} atual={7} concluidas={produto.etapa} />
        <EstadoVazio icone={Lock} titulo="Defina o preço e a identidade visual primeiro" texto="A página usa o preço, a garantia, a capa e as cores do produto.">
          <Link href={`/produtos/${produtoId}/${identidade ? "preco" : "identidade"}`} className={classesBotao()}>{identidade ? "Ir para o preço" : "Ir para a identidade visual"}</Link>
        </EstadoVazio>
      </>
    );

  const capaUrl = imagemAtual(imagens, "capa", 0)?.url;
  const ofertaPagina = { precoCentavos: oferta.precoCentavos, precoOriginalCentavos: oferta.precoOriginalCentavos ?? null, garantiaDias: oferta.garantiaDias, orderBump: oferta.orderBump ? { titulo: oferta.orderBump.titulo, chamada: oferta.orderBump.chamada, precoCentavos: oferta.orderBump.precoCentavos } : null, promo: oferta.promo ?? null };

  const gerar = async () => {
    if (r && !confirm("Gerar de novo substitui todos os textos da página, inclusive suas edições. Continuar?")) return;
    setErro("");
    setGerando(true);
    try {
      // Bônus só entram na venda quando existirem de verdade (ainda não são gerados).
      const t = await chamarIA<TextoPagina>("pagina", { configuracao: config.data, planejamento: plano, oferta: { precoCentavos: oferta.precoCentavos, garantiaDias: oferta.garantiaDias, bonusExistentes: [] } });
      const base = r?.slug ?? criarSlug(plano.tituloComercial);
      const slug = (await slugDisponivel(base, produtoId)) ? base : `${base.slice(0, 54)}-${Math.random().toString(36).slice(2, 6)}`;
      const novo: Rascunho = {
        slug,
        donoId: usuario!.uid,
        produtoId,
        modelo: r?.modelo ?? "impacto",
        cores: r?.cores ?? { primaria: identidade.cores.primaria, fundo: identidade.cores.fundo, texto: identidade.cores.texto, destaque: identidade.cores.destaque },
        fontes: { titulo: identidade.fonteTitulo, corpo: identidade.fonteCorpo },
        conteudo: { ...t, capitulos: plano.capitulos.map((c) => c.titulo), autor: identidade.autor, tituloLivro: plano.tituloComercial, subtituloLivro: plano.subtitulo, depoimentos: r?.conteudo.depoimentos ?? [] },
        secoes: r?.secoes ?? TODAS_SECOES,
        oferta: ofertaPagina,
        capa: identidade,
        capaUrl,
        seo: { titulo: t.seoTitulo, descricao: t.seoDescricao, imagemUrl: capaUrl },
        publicada: r?.publicada ?? false,
        venda: r?.venda ?? { plataforma: "mercadopago", link: null, linkPromo: null },
      };
      await salvarPagina(novo, !!paginaSalva?.publicada);
      carregado.current = true;
      setR(novo);
      setSlugTexto(slug);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerando(false);
    }
  };

  /** Grava o rascunho sempre com o preço, a capa e a identidade atuais do produto. */
  const salvar = async (publicada: boolean) => {
    if (!r) return;
    const slug = slugTexto.trim();
    if (!slugValido(slug)) return setErro("O endereço precisa ter de 3 a 60 letras minúsculas, números e hifens.");
    const plataforma = r.venda?.plataforma ?? "mercadopago";
    if (plataforma !== "mercadopago") {
      const nome = NOMES_PLATAFORMA[plataforma];
      if (publicada && !r.venda?.link) return setErro(`Cole o link de checkout da ${nome} antes de publicar.`);
      if (r.venda?.link && !linkDaPlataforma(plataforma, r.venda.link)) return setErro(`O link de checkout não é um endereço da ${nome}.`);
      if (r.venda?.linkPromo && !linkDaPlataforma(plataforma, r.venda.linkPromo)) return setErro(`O link da oferta não é um endereço da ${nome}.`);
      if (publicada && promoAtiva(oferta.promo) && !r.venda?.linkPromo) return setErro(`Há uma oferta com prazo: cole o link da ${nome} com esse preço.`);
    }
    setErro("");
    setAviso("");
    setSalvando(true);
    try {
      if (slug !== r.slug && !(await slugDisponivel(slug, produtoId))) throw new Error("Este endereço já está em uso. Escolha outro.");
      const novo: Rascunho = { ...r, slug, publicada, oferta: ofertaPagina, capa: identidade, capaUrl, seo: { ...r.seo, imagemUrl: capaUrl }, venda: plataforma === "mercadopago" ? { plataforma, link: null, linkPromo: null } : r.venda };
      if (slug !== r.slug) await trocarSlug(r.slug, novo);
      else await salvarPagina(novo, !!paginaSalva?.publicada);
      const estavaPublicada = r.publicada;
      setR(novo);
      // Liga o botão de compra se já houver Mercado Pago conectado e PDF final.
      await fetch("/api/paginas/sincronizar", { method: "POST" }).catch(() => {});
      if (publicada && produto.etapa === 7) await marcarEtapa(produtoId, 8).catch(() => {});
      setAviso(publicada === estavaPublicada ? "Alterações salvas." : publicada ? "Página publicada." : "Página fora do ar.");
    } catch (e) {
      setErro(e instanceof Error && !("code" in e) ? e.message : mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  if (!r)
    return (
      <>
        <EtapasProduto produtoId={produtoId} atual={7} concluidas={produto.etapa} />
        <Cartao className="flex flex-col items-center py-12 text-center">
          <h2 className="font-display text-lg font-semibold">Pronto para escrever a página de “{plano.tituloComercial}”</h2>
          <p className="mt-1.5 max-w-md text-sm text-suave">
            A IA escreve título, problema, benefícios, para quem é, perguntas frequentes e SEO. Sem depoimentos inventados, sem falsa urgência e sem promessa de resultado.
          </p>
          <Botao className="mt-6" onClick={gerar} disabled={gerando}>
            {gerando ? <><Loader2 size={16} className="animate-spin" /> Escrevendo... (até 1 min)</> : <><Sparkles size={16} /> Gerar página</>}
          </Botao>
          {erro && <p className="mt-3 text-sm text-erro" role="alert">{erro}</p>}
        </Cartao>
      </>
    );

  const c = r.conteudo;
  const mudarTexto = (campos: Partial<Rascunho["conteudo"]>) => setR({ ...r, conteudo: { ...c, ...campos } });
  const plataforma: PlataformaVenda = r.venda?.plataforma ?? "mercadopago";
  const mudarVenda = (campos: Partial<NonNullable<Rascunho["venda"]>>) => setR({ ...r, venda: { plataforma, link: r.venda?.link ?? null, linkPromo: r.venda?.linkPromo ?? null, ...campos } });
  const depoimentos = c.depoimentos ?? [];
  const precoDesatualizado = paginaSalva && paginaSalva.oferta.precoCentavos !== oferta.precoCentavos;

  return (
    <>
      <EtapasProduto produtoId={produtoId} atual={7} concluidas={produto.etapa} />

      <Cartao className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Selo tom={r.publicada ? "verde" : "neutro"}>{r.publicada ? "Publicada" : "Rascunho"}</Selo>
            {r.publicada && (
              <a href={`/p/${r.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primaria-clara hover:underline">
                /p/{r.slug} <ExternalLink size={13} />
              </a>
            )}
            {r.publicada && (
              <Link href={`/divulgacao?produto=${produtoId}`} className="text-sm font-semibold text-primaria-clara hover:underline">
                Divulgar agora: kit, grupos e textos
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Botao variante="fantasma" onClick={gerar} disabled={gerando || salvando}>
              {gerando ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Gerar de novo
            </Botao>
            <Botao variante="secundario" onClick={() => salvar(r.publicada)} disabled={salvando}><Save size={16} /> Salvar</Botao>
            {r.publicada ? (
              <Botao variante="secundario" onClick={() => confirm("Tirar a página do ar? O endereço deixa de abrir.") && salvar(false)} disabled={salvando}>Despublicar</Botao>
            ) : (
              <Botao onClick={() => confirm("Publicar? A página fica aberta para qualquer pessoa com o endereço.") && salvar(true)} disabled={salvando}><Globe size={16} /> Publicar</Botao>
            )}
          </div>
        </div>
        {plataforma === "mercadopago" && !paginaSalva?.checkoutAtivo && (
          <p className="mt-3 flex gap-2 text-xs text-alerta">
            <AlertTriangle size={14} className="shrink-0" /> Vendas fechadas: para abrir, conecte o Mercado Pago em Integrações e salve uma versão final do PDF. Até lá a página mostra &ldquo;Vendas ainda não abertas&rdquo;.
          </p>
        )}
        {precoDesatualizado && <p className="mt-2 text-xs text-suave">O preço do produto mudou. Salve para atualizar a página.</p>}
        {erro && <p className="mt-2 text-sm text-erro" role="alert">{erro}</p>}
        {aviso && <p className="mt-2 text-sm text-sucesso">{aviso}</p>}
      </Cartao>

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <div className="space-y-4">
          <Cartao className="space-y-3">
            <h2 className="font-semibold">Como você vai receber</h2>
            <div className="grid gap-2">
              {(Object.keys(NOMES_PLATAFORMA) as PlataformaVenda[]).map((v) => (
                <label key={v} className={clsx("flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm transition", plataforma === v ? "border-primaria-clara bg-primaria/10" : "border-borda hover:border-borda-forte")}>
                  <input type="radio" name="plataforma" className="accent-primaria" checked={plataforma === v} onChange={() => mudarVenda({ plataforma: v })} />
                  <span className="font-semibold">{NOMES_PLATAFORMA[v]}</span>
                  {v === "mercadopago" && <span className="text-xs text-suave">checkout e entrega pela Criaê</span>}
                </label>
              ))}
            </div>
            {plataforma !== "mercadopago" && (
              <>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-suave">
                  <li>Baixe o PDF final na <Link href={`/produtos/${produtoId}/pdf`} className="text-primaria-clara underline">etapa PDF</Link>.</li>
                  <li>Na sua conta da {NOMES_PLATAFORMA[plataforma]}, cadastre o produto com esse arquivo e o mesmo preço desta página.</li>
                  <li>Copie o link de checkout e cole abaixo.</li>
                </ol>
                <Campo rotulo="Link de checkout"><input inputMode="url" className={estiloEntrada} placeholder={plataforma === "kiwify" ? "https://pay.kiwify.com.br/..." : "https://pay.hotmart.com/..."} value={r.venda?.link ?? ""} onChange={(e) => mudarVenda({ link: e.target.value.trim() || null })} /></Campo>
                {promoAtiva(oferta.promo) && (
                  <Campo rotulo="Link de checkout da oferta com prazo" dica={`Crie na ${NOMES_PLATAFORMA[plataforma]} uma oferta com o preço promocional. Ao fim do prazo a página volta ao link normal; desative a oferta lá também.`}>
                    <input inputMode="url" className={estiloEntrada} value={r.venda?.linkPromo ?? ""} onChange={(e) => mudarVenda({ linkPromo: e.target.value.trim() || null })} />
                  </Campo>
                )}
              </>
            )}
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="font-semibold">Oferta e contagem regressiva</h2>
            {promoAtiva(oferta.promo) ? (
              <p className="text-sm text-suave">Oferta ativa até {new Date(oferta.promo!.terminaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.</p>
            ) : (
              <p className="text-sm text-suave">A contagem aparece quando você cria uma oferta com prazo real.</p>
            )}
            <Link href={`/produtos/${produtoId}/preco`} className={classesBotao("secundario")}>Configurar oferta</Link>
          </Cartao>

          <Cartao>
            <h2 className="mb-3 font-semibold">Modelo</h2>
            <div className="grid gap-2">
              {(Object.keys(MODELOS) as ModeloPagina[]).map((m) => (
                <button key={m} onClick={() => setR({ ...r, modelo: m })} aria-pressed={r.modelo === m}
                  className={clsx("rounded-xl border p-3 text-left text-sm transition", r.modelo === m ? "border-primaria-clara bg-primaria/10" : "border-borda hover:border-borda-forte")}>
                  <span className="font-semibold">{MODELOS[m].nome}</span>
                  <span className="block text-xs text-suave">{MODELOS[m].detalhe}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["primaria", "fundo", "texto", "destaque", "botao"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-xs text-suave">
                  <input type="color" value={r.cores[k] ?? "#15803D"} onChange={(e) => setR({ ...r, cores: { ...r.cores, [k]: e.target.value } })} className="size-7 cursor-pointer rounded border-0 bg-transparent" />
                  {{ primaria: "Principal", fundo: "Fundo", texto: "Texto", destaque: "Blocos", botao: "Botão de compra" }[k]}
                </label>
              ))}
            </div>
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="font-semibold">Textos</h2>
            <Campo rotulo="Frase acima do título"><input maxLength={60} className={estiloEntrada} value={c.chamadaTopo ?? ""} onChange={(e) => mudarTexto({ chamadaTopo: e.target.value })} /></Campo>
            <Campo rotulo="Título principal"><textarea rows={2} className={estiloEntrada} value={c.headline} onChange={(e) => mudarTexto({ headline: e.target.value })} /></Campo>
            <Campo rotulo="Subtítulo"><textarea rows={3} className={estiloEntrada} value={c.subheadline} onChange={(e) => mudarTexto({ subheadline: e.target.value })} /></Campo>
            <Campo rotulo="O problema" dica="Separe os parágrafos com uma linha em branco."><textarea rows={6} className={estiloEntrada} value={c.problema} onChange={(e) => mudarTexto({ problema: e.target.value })} /></Campo>
            <Campo rotulo="O que a pessoa aprende" dica="Um por linha. Os 3 primeiros aparecem na abertura."><textarea rows={6} className={estiloEntrada} defaultValue={(c.aprendizados ?? []).join("\n")} onChange={(e) => mudarTexto({ aprendizados: linhas(e.target.value) })} /></Campo>
            <Campo rotulo="Para quem é" dica="Um por linha"><textarea rows={4} className={estiloEntrada} defaultValue={c.paraQuem.join("\n")} onChange={(e) => mudarTexto({ paraQuem: linhas(e.target.value) })} /></Campo>
            <Campo rotulo="Não é para quem" dica="Um por linha"><textarea rows={3} className={estiloEntrada} defaultValue={c.naoEParaQuem.join("\n")} onChange={(e) => mudarTexto({ naoEParaQuem: linhas(e.target.value) })} /></Campo>
            <Campo rotulo="Sobre o produto"><textarea rows={3} className={estiloEntrada} value={c.sobreOProduto} onChange={(e) => mudarTexto({ sobreOProduto: e.target.value })} /></Campo>
            <Campo rotulo="O que você recebe" dica="Um por linha. Liste só o que existe."><textarea rows={3} className={estiloEntrada} defaultValue={c.oQueVoceRecebe.join("\n")} onChange={(e) => mudarTexto({ oQueVoceRecebe: linhas(e.target.value) })} /></Campo>
            <Campo rotulo="Texto do botão"><input maxLength={40} className={estiloEntrada} value={c.chamadaCompra} onChange={(e) => mudarTexto({ chamadaCompra: e.target.value })} /></Campo>
            <Campo rotulo="Fechamento da página"><textarea rows={3} className={estiloEntrada} value={c.chamadaFinal ?? ""} onChange={(e) => mudarTexto({ chamadaFinal: e.target.value })} /></Campo>
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="font-semibold">Benefícios</h2>
            {c.beneficios.map((b, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <input aria-label={`Benefício ${i + 1}`} className={estiloEntrada} value={b.titulo} onChange={(e) => mudarTexto({ beneficios: c.beneficios.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} />
                  <textarea aria-label={`Texto do benefício ${i + 1}`} rows={2} className={estiloEntrada} value={b.texto} onChange={(e) => mudarTexto({ beneficios: c.beneficios.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
                </div>
                <Botao variante="fantasma" className="px-2!" aria-label={`Excluir benefício ${i + 1}`} onClick={() => mudarTexto({ beneficios: c.beneficios.filter((_, j) => j !== i) })}><Trash2 size={15} /></Botao>
              </div>
            ))}
            <Botao variante="secundario" onClick={() => mudarTexto({ beneficios: [...c.beneficios, { titulo: "Novo benefício", texto: "" }] })}><Plus size={15} /> Adicionar</Botao>
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="font-semibold">Depoimentos</h2>
            <p className="text-xs text-apagado">Só depoimentos reais, de pessoas que leram e autorizaram. A IA nunca inventa depoimentos. Sem nenhum cadastrado, a seção não aparece.</p>
            {depoimentos.map((d, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <input aria-label={`Nome do depoimento ${i + 1}`} placeholder="Nome" maxLength={60} className={estiloEntrada} value={d.nome} onChange={(e) => mudarTexto({ depoimentos: depoimentos.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} />
                  <textarea aria-label={`Texto do depoimento ${i + 1}`} placeholder="O que a pessoa disse" rows={2} maxLength={500} className={estiloEntrada} value={d.texto} onChange={(e) => mudarTexto({ depoimentos: depoimentos.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
                </div>
                <Botao variante="fantasma" className="px-2!" aria-label={`Excluir depoimento ${i + 1}`} onClick={() => mudarTexto({ depoimentos: depoimentos.filter((_, j) => j !== i) })}><Trash2 size={15} /></Botao>
              </div>
            ))}
            <Botao variante="secundario" onClick={() => mudarTexto({ depoimentos: [...depoimentos, { nome: "", texto: "" }] })}><Plus size={15} /> Adicionar depoimento real</Botao>
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="font-semibold">Perguntas frequentes</h2>
            {c.faq.map((f, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <input aria-label={`Pergunta ${i + 1}`} className={estiloEntrada} value={f.pergunta} onChange={(e) => mudarTexto({ faq: c.faq.map((x, j) => (j === i ? { ...x, pergunta: e.target.value } : x)) })} />
                  <textarea aria-label={`Resposta ${i + 1}`} rows={2} className={estiloEntrada} value={f.resposta} onChange={(e) => mudarTexto({ faq: c.faq.map((x, j) => (j === i ? { ...x, resposta: e.target.value } : x)) })} />
                </div>
                <Botao variante="fantasma" className="px-2!" aria-label={`Excluir pergunta ${i + 1}`} onClick={() => mudarTexto({ faq: c.faq.filter((_, j) => j !== i) })}><Trash2 size={15} /></Botao>
              </div>
            ))}
            <Botao variante="secundario" onClick={() => mudarTexto({ faq: [...c.faq, { pergunta: "Nova pergunta", resposta: "" }] })}><Plus size={15} /> Adicionar</Botao>
          </Cartao>

          <Cartao>
            <h2 className="mb-3 font-semibold">Seções visíveis</h2>
            <div className="space-y-2">
              {(Object.keys(SECOES) as SecaoPagina[]).map((s) => (
                <label key={s} className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="accent-primaria" checked={r.secoes[s] !== false} onChange={(e) => setR({ ...r, secoes: { ...r.secoes, [s]: e.target.checked } })} />
                  {SECOES[s]}
                </label>
              ))}
            </div>
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="font-semibold">Endereço e SEO</h2>
            <Campo rotulo="Endereço da página" dica={`/p/${slugTexto || "..."}`}>
              <input maxLength={60} className={estiloEntrada} value={slugTexto} onChange={(e) => setSlugTexto(criarSlugDigitando(e.target.value))} />
            </Campo>
            <Campo rotulo="Título para o Google" dica={`${r.seo.titulo.length}/60`}>
              <input maxLength={60} className={estiloEntrada} value={r.seo.titulo} onChange={(e) => setR({ ...r, seo: { ...r.seo, titulo: e.target.value } })} />
            </Campo>
            <Campo rotulo="Descrição para o Google" dica={`${r.seo.descricao.length}/155`}>
              <textarea rows={3} maxLength={155} className={estiloEntrada} value={r.seo.descricao} onChange={(e) => setR({ ...r, seo: { ...r.seo, descricao: encurtar(e.target.value, 155) } })} />
            </Campo>
          </Cartao>
        </div>

        <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <div className="mb-2 flex gap-1.5">
            <Botao variante={largura === "computador" ? "secundario" : "fantasma"} onClick={() => setLargura("computador")} aria-pressed={largura === "computador"}><Monitor size={15} /> Computador</Botao>
            <Botao variante={largura === "celular" ? "secundario" : "fantasma"} onClick={() => setLargura("celular")} aria-pressed={largura === "celular"}><Smartphone size={15} /> Celular</Botao>
          </div>
          <div className="mx-auto max-h-[80vh] overflow-y-auto rounded-xl border border-borda" style={{ maxWidth: largura === "celular" ? 390 : "100%" }}>
            <PaginaVenda p={{ ...r, oferta: ofertaPagina, capa: identidade, capaUrl, checkoutAtivo: paginaSalva?.checkoutAtivo }} />
          </div>
        </div>
      </div>
    </>
  );
}

/** Enquanto digita: deixa o hífen final para a pessoa continuar escrevendo. */
const criarSlugDigitando = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-/, "").slice(0, 60);
