"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zipSync, strToU8, type Zippable } from "fflate";
import { Download, Loader2 } from "lucide-react";
import type { DocCampanha } from "@/lib/campanhas";
import { lerImagemPropria, type Criativo } from "@/lib/criativos/dados";
import { calendarioCsv, nomeArquivo, textoCriativo, textosPorCanal } from "@/lib/criativos/materiais";
import type { Produto } from "@/lib/produtos";
import { Botao, classesBotao, estiloEntrada } from "./ui";

export function baixarArquivo(dados: Blob, nome: string) {
  const url = URL.createObjectURL(dados);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Monta o ZIP no navegador: imagens prontas, textos de cada peça, materiais por canal e calendário. */
export function BotaoZip({ produto, campanha, criativos, urlPagina }: { produto: Produto; campanha: DocCampanha | null; criativos: Criativo[]; urlPagina: string | null }) {
  const [estado, setEstado] = useState("");
  const [erro, setErro] = useState("");
  const prontos = criativos.filter((c) => c.urlFinal);
  const vazio = !campanha && !prontos.length;

  const baixar = async () => {
    setErro("");
    try {
      const arquivos: Zippable = {};
      if (campanha) {
        for (const [nome, texto] of Object.entries(textosPorCanal(campanha.dados, urlPagina))) arquivos[`divulgacao/${nome}`] = strToU8(texto);
        arquivos["divulgacao/calendario.csv"] = strToU8(calendarioCsv(campanha));
      }
      for (let i = 0; i < prontos.length; i++) {
        setEstado(`Reunindo imagem ${i + 1} de ${prontos.length}...`);
        const blob = await lerImagemPropria(prontos[i].urlFinal!);
        // Nível 0: JPEG já é comprimido.
        arquivos[`criativos/${nomeArquivo(prontos[i], i)}`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
      }
      if (prontos.length) arquivos["criativos/textos.txt"] = strToU8(prontos.map((c, i) => textoCriativo(c, i, urlPagina)).join("\n\n\n"));
      setEstado("Compactando...");
      const zip = zipSync(arquivos);
      const nome = produto.titulo.normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50);
      baixarArquivo(new Blob([zip.slice().buffer], { type: "application/zip" }), `divulgacao-${nome || "produto"}.zip`);
    } catch (e) {
      setErro((e as Error).message || "Não foi possível montar o ZIP.");
    } finally {
      setEstado("");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Botao variante="secundario" onClick={baixar} disabled={vazio || !!estado} title={vazio ? "Gere materiais ou criativos primeiro" : undefined}>
        {estado ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {estado || "Baixar tudo em ZIP"}
      </Botao>
      {erro && <p className="text-xs text-erro" role="alert">{erro}</p>}
    </div>
  );
}

/** Escolha do produto e navegação entre as duas telas de divulgação. */
export function BarraDivulgacao({ tela, produto, elegiveis }: { tela: "divulgacao" | "criativos"; produto: Produto; elegiveis: Produto[] }) {
  const router = useRouter();
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-suave sm:max-w-md">
        <span className="shrink-0">Produto</span>
        <select className={estiloEntrada} value={produto.id} onChange={(e) => router.replace(`/${tela}?produto=${e.target.value}`)}>
          {elegiveis.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
        </select>
      </label>
      <Link href={`/${tela === "divulgacao" ? "criativos" : "divulgacao"}?produto=${produto.id}`} className={classesBotao("fantasma")}>
        {tela === "divulgacao" ? "Ver criativos" : "Ver central de divulgação"}
      </Link>
    </div>
  );
}
