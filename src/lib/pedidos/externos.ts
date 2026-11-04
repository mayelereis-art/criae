import "server-only";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "../firebase/admin";
import { cifrar, decifrar } from "../pagamentos/conexoes";
import { proximoStatus, type PlataformaExterna, type VendaExterna } from "../pagamentos/avisos-externos";

// O token de cada criador fica cifrado e só o servidor lê (a coleção não tem regra de leitura).
const conexoes = () => dbAdmin().collection("conexoes_externas");

export async function guardarTokenExterno(uid: string, plataforma: PlataformaExterna, token: string) {
  await conexoes().doc(uid).set({ [plataforma]: cifrar(token) }, { merge: true });
  await dbAdmin().collection("integracoes").doc(uid).set({ [plataforma]: { configurado: true, configuradoEm: new Date() } }, { merge: true });
}

export async function removerTokenExterno(uid: string, plataforma: PlataformaExterna) {
  await conexoes().doc(uid).set({ [plataforma]: FieldValue.delete() }, { merge: true });
  await dbAdmin().collection("integracoes").doc(uid).set({ [plataforma]: { configurado: false } }, { merge: true });
}

export async function lerTokenExterno(uid: string, plataforma: PlataformaExterna) {
  if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) return null;
  const valor = (await conexoes().doc(uid).get()).data()?.[plataforma];
  return typeof valor === "string" ? decifrar(valor) : null;
}

const normalizar = (t: string) => t.normalize("NFD").replace(/[^a-z0-9]/gi, "").toLowerCase();

/** Liga a venda ao produto: pela página que vende nessa plataforma; com mais de uma, pelo nome. */
async function acharProduto(uid: string, plataforma: PlataformaExterna, nome: string) {
  const paginas = await dbAdmin().collection("paginas_vendas").where("donoId", "==", uid).get();
  const nestaPlataforma = paginas.docs.map((d) => d.data()).filter((p) => p.venda?.plataforma === plataforma);
  const pagina = nestaPlataforma.length === 1
    ? nestaPlataforma[0]
    : nestaPlataforma.find((p) => normalizar(p.conteudo?.tituloLivro ?? "") === normalizar(nome));
  return pagina ? { produtoId: pagina.produtoId as string, slug: pagina.slug as string } : null;
}

/**
 * Registra a venda em "pedidos", o mesmo lugar de Minhas vendas e dos indicadores. Idempotente: o id vem da
 * transação, então um aviso repetido não duplica. Vendas de teste têm status próprio e não contam como faturamento.
 */
export async function registrarVendaExterna(uid: string, plataforma: PlataformaExterna, v: VendaExterna, teste = false) {
  const db = dbAdmin();
  const id = `${plataforma}_${createHash("sha256").update(v.transacao).digest("hex").slice(0, 28)}`;
  const ref = db.collection("pedidos").doc(id);
  const achado = await acharProduto(uid, plataforma, v.produtoNome);
  const produtoId = achado?.produtoId ?? `${plataforma}:${v.produtoExternoId || normalizar(v.produtoNome)}`;

  const resultado = await db.runTransaction(async (tx) => {
    const atual = await tx.get(ref);
    if (atual.exists && atual.data()!.vendedorId !== uid) return "vendedor-divergente";
    const novo = teste ? null : proximoStatus(atual.data()?.status, v.status);
    if (atual.exists && !novo) return "sem-mudanca";
    const agora = FieldValue.serverTimestamp();
    if (!atual.exists) {
      tx.set(ref, {
        vendedorId: uid, produtoId, slug: achado?.slug ?? null, plataforma, transacaoExterna: v.transacao,
        itens: [{ produtoId, titulo: v.produtoNome, precoCentavos: v.valorCentavos, caminho: "", tipo: "principal" }],
        subtotalCentavos: v.valorCentavos, descontoCentavos: 0, totalCentavos: v.valorCentavos, moeda: v.moeda,
        cupomId: null, cupomCodigo: null, comprador: v.comprador, canal: v.canal, metodo: v.metodo,
        status: teste ? "teste" : v.status, downloads: 0, tokensHash: [],
        ...(!teste && v.status === "pago" ? { pagoEm: agora } : {}),
        criadoEm: agora, atualizadoEm: agora,
      });
      return "criado";
    }
    tx.update(ref, { status: novo, metodo: v.metodo ?? atual.data()!.metodo ?? null, ...(novo === "pago" ? { pagoEm: agora } : {}), atualizadoEm: agora });
    return "atualizado";
  });

  await db.collection("integracoes").doc(uid).set({ [plataforma]: { ultimoAvisoEm: new Date() } }, { merge: true });
  return resultado;
}
