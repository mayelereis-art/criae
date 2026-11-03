import { NextResponse } from "next/server";
import { z } from "zod";
import { gerarPdf } from "@/lib/documentos/pdf";
import { planejamentoSchema } from "@/lib/ia/esquemas";
import { usuarioAtual } from "@/lib/sessao";

export const runtime = "nodejs";
export const maxDuration = 120;

// Só imagens do Storage do próprio projeto ou embutidas: o servidor nunca busca URL qualquer.
const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
const imagem = z
  .string()
  .max(6_000_000)
  .refine(
    (u) => /^data:image\/(jpeg|png);base64,/.test(u) || u.startsWith(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/`),
    "Imagem de origem não permitida.",
  );
const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const entrada = z.object({
  planejamento: planejamentoSchema,
  identidade: z.object({
    estilo: z.string().max(40),
    cores: z.object({ primaria: cor, secundaria: cor, fundo: cor, texto: cor, destaque: cor }),
    fonteTitulo: z.enum(["inter", "montserrat", "nunito", "lora", "merriweather", "playfair"]),
    fonteCorpo: z.enum(["inter", "montserrat", "nunito", "lora", "merriweather", "playfair"]),
    layoutCapa: z.enum(["centralizada", "faixa", "moldura"]),
    elementos: z.enum(["filete", "bloco", "minimo"]),
    estiloImagens: z.string().max(300),
    autor: z.string().max(80),
  }),
  capitulos: z.array(z.object({ ordem: z.number().int().min(0).max(59), titulo: z.string().max(200), conteudo: z.string().max(300_000) })).max(60),
  imagens: z.object({ capa: imagem.optional(), capitulos: z.record(z.string(), imagem) }),
  rascunho: z.boolean(),
});

export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  const parse = entrada.safeParse(await req.json().catch(() => null));
  if (!parse.success) return NextResponse.json({ erro: parse.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });

  const d = parse.data;
  const inicio = Date.now();
  try {
    const { buffer, paginas, totalPaginas } = await gerarPdf({
      ...d,
      imagens: { capa: d.imagens.capa, capitulos: Object.fromEntries(Object.entries(d.imagens.capitulos).map(([k, v]) => [Number(k), v])) },
    });
    // Verificação depois de diagramar: toda seção do sumário precisa ter caído numa página.
    const esperadas = ["introducao", ...d.capitulos.map((c) => `cap-${c.ordem}`), "conclusao"];
    const semPagina = esperadas.filter((s) => !paginas[s]);
    console.info(JSON.stringify({ evento: "pdf", uid: usuario.uid, ok: true, ms: Date.now() - inicio, totalPaginas, bytes: buffer.length }));
    return NextResponse.json({ pdf: buffer.toString("base64"), totalPaginas, paginas, semPagina });
  } catch (e) {
    console.error(JSON.stringify({ evento: "pdf", uid: usuario.uid, ok: false, ms: Date.now() - inicio, erro: String(e), pilha: (e as Error).stack?.split("\n").slice(0, 12).join(" | ") }));
    return NextResponse.json({ erro: "Não foi possível diagramar o PDF. Tente de novo." }, { status: 500 });
  }
}
