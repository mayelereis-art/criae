"use client";

import { useEffect, useState } from "react";
import { ouvirProduto, type Produto } from "@/lib/produtos";
import { mensagemErro } from "@/lib/firebase/erros";
import { useAuth } from "./ProvedorAuth";

/** Produto em tempo real. `null` = não existe ou não é seu (as regras do banco negam). */
export function useProduto(id: string) {
  const { usuario } = useAuth();
  const [produto, setProduto] = useState<Produto | null | undefined>(undefined);
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (!usuario) return;
    return ouvirProduto(
      id,
      setProduto,
      (e) => {
        setErro(mensagemErro(e));
        setProduto(null);
      },
    );
  }, [id, usuario]);
  return { produto, erro, usuario };
}
