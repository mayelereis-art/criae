import "server-only";
import { cache } from "react";
import type { Pagina } from "./paginas";

type ValorRest = {
  stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null; timestampValue?: string;
  mapValue?: { fields?: Record<string, ValorRest> }; arrayValue?: { values?: ValorRest[] };
};

function converter(v: ValorRest): unknown {
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, converter(x)]));
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(converter);
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  return null;
}

/**
 * Lê a página pública pela API REST do Firestore, sem estado de conexão (o SDK no servidor pode acusar
 * "offline" e fazer um produto publicado parecer inexistente). As regras liberam só páginas publicadas.
 * null = não existe ou não está publicada. Falha real lança erro: nunca vira 404.
 */
export const lerPaginaPublicada = cache(async (slug: string): Promise<Pagina | null> => {
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return null;
  const projeto = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const chave = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents/paginas_vendas/${slug}?key=${chave}`, { cache: "no-store" });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Firestore respondeu ${res.status} ao ler a página ${slug}`);
  const doc = (await res.json()) as { fields?: Record<string, ValorRest> };
  const pagina = converter({ mapValue: { fields: doc.fields } }) as Pagina;
  return pagina.publicada ? pagina : null;
});
