"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/ProvedorAuth";
import { db } from "@/lib/firebase/client";
import { PlataformaExterna, type EstadoExterno } from "./PlataformaExterna";

/** E-books são vendidos pela conta do próprio criador na Kiwify ou na Hotmart. O Mercado Pago fica só para a assinatura do Criaê. */
export function PainelIntegracoes() {
  const { usuario } = useAuth();
  const [externas, setExternas] = useState<{ kiwify?: EstadoExterno; hotmart?: EstadoExterno }>({});

  useEffect(() => {
    if (!usuario) return;
    return onSnapshot(doc(db, "integracoes", usuario.uid), (s) => setExternas({ kiwify: s.data()?.kiwify, hotmart: s.data()?.hotmart }), () => setExternas({}));
  }, [usuario]);

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-borda p-3 text-sm text-suave">
        Você vende seus e-books pela sua conta na Kiwify ou na Hotmart: o pagamento, a entrega do arquivo e o dinheiro ficam com a plataforma. Conecte aqui para as vendas aparecerem em Minhas vendas.
      </p>
      {usuario && <PlataformaExterna plataforma="kiwify" uid={usuario.uid} estado={externas.kiwify} />}
      {usuario && <PlataformaExterna plataforma="hotmart" uid={usuario.uid} estado={externas.hotmart} />}
    </div>
  );
}
