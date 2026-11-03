"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lightbulb, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Botao, EstadoVazio, classesBotao } from "@/components/ui";
import { excluirOportunidade, ouvirOportunidades, type OportunidadeSalva } from "@/lib/oportunidades";
import { mensagemErro } from "@/lib/firebase/erros";
import { CartaoOportunidade } from "../nichos/ExploradorNichos";

export function ListaOportunidades() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState<OportunidadeSalva[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!usuario) return;
    return ouvirOportunidades(usuario.uid, setLista, (e) => setErro(mensagemErro(e)));
  }, [usuario]);

  if (erro) return <p className="text-sm text-erro" role="alert">{erro}</p>;
  if (!lista) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;
  if (!lista.length)
    return (
      <EstadoVazio icone={Lightbulb} titulo="Nenhuma oportunidade salva" texto="Explore um nicho e salve as ideias que fizerem sentido para você.">
        <Link href="/nichos" className={classesBotao()}>Explorar nichos</Link>
      </EstadoVazio>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {lista.map((o) => (
        <div key={o.id} className="relative">
          <CartaoOportunidade nicho={o.nicho} o={o.dados} salva />
          <Botao variante="fantasma" className="absolute right-3 bottom-3" aria-label="Excluir oportunidade" onClick={() => excluirOportunidade(o.id)}>
            <Trash2 size={16} />
          </Botao>
        </div>
      ))}
    </div>
  );
}
