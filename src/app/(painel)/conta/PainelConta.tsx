"use client";

import { sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/components/ProvedorAuth";
import { Botao, Campo, Cartao, estiloEntrada } from "@/components/ui";
import { auth, db } from "@/lib/firebase/client";
import { mensagemErro } from "@/lib/firebase/erros";

export function PainelConta() {
  const { usuario, sair } = useAuth();
  const [nome, setNome] = useState("");
  const [aceite, setAceite] = useState<{ versao?: string; em?: { toDate(): Date } } | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const [ocupado, setOcupado] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  useEffect(() => {
    if (!usuario) return;
    setNome(usuario.displayName ?? "");
    getDoc(doc(db, "usuarios", usuario.uid)).then((s) => {
      setAceite(s.data()?.aceite ?? null);
      if (s.data()?.nome) setNome(s.data()!.nome);
    }).catch(() => {});
  }, [usuario]);

  if (!usuario) return <p className="flex items-center gap-2 text-sm text-suave"><Loader2 size={16} className="animate-spin" /> Carregando...</p>;

  const executar = async (chave: string, acao: () => Promise<void>, sucesso: string) => {
    setOcupado(chave);
    setAviso(null);
    try {
      await acao();
      setAviso({ texto: sucesso, ok: true });
    } catch (e) {
      setAviso({ texto: e instanceof Error && !("code" in e) ? e.message : mensagemErro(e), ok: false });
    } finally {
      setOcupado("");
    }
  };

  const exportar = async () => {
    const res = await fetch("/api/conta");
    if (!res.ok) throw new Error("Não foi possível gerar o arquivo. Tente de novo.");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "meus-dados-criae.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const excluir = async () => {
    const res = await fetch("/api/conta", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmacao }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).erro ?? "Não foi possível excluir.");
    await sair();
    window.location.href = "/";
  };

  return (
    <div className="max-w-2xl space-y-5">
      {aviso && <p className={`rounded-xl border p-3 text-sm ${aviso.ok ? "border-sucesso/40 text-sucesso" : "border-erro/40 text-erro"}`} role="status">{aviso.texto}</p>}

      <Cartao>
        <h2 className="mb-3 font-semibold">Seus dados</h2>
        <form className="grid gap-3" onSubmit={(e) => {
          e.preventDefault();
          void executar("nome", async () => {
            await updateDoc(doc(db, "usuarios", usuario.uid), { nome: nome.trim() });
            if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: nome.trim() });
          }, "Nome salvo.");
        }}>
          <Campo rotulo="Nome"><input required maxLength={120} className={estiloEntrada} value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
          <Campo rotulo="E-mail"><input readOnly className={estiloEntrada} value={usuario.email ?? ""} /></Campo>
          <div><Botao type="submit" variante="secundario" disabled={!!ocupado}>Salvar nome</Botao></div>
        </form>
      </Cartao>

      <Cartao>
        <h2 className="font-semibold">Senha</h2>
        <p className="mt-1 mb-3 text-sm text-suave">Enviamos um link para o seu e-mail. Confira também o spam.</p>
        <Botao variante="secundario" disabled={!!ocupado} onClick={() => executar("senha", () => sendPasswordResetEmail(auth, usuario.email ?? ""), "Link enviado para o seu e-mail.")}>Trocar senha</Botao>
      </Cartao>

      <Cartao>
        <h2 className="font-semibold">Termos e privacidade</h2>
        <p className="mt-1 text-sm text-suave">{aceite?.em ? `Você aceitou os termos em ${aceite.em.toDate().toLocaleDateString("pt-BR")} (versão ${aceite.versao}).` : "Os documentos que valem para a sua conta:"}</p>
        <p className="mt-2 flex gap-4 text-sm"><Link href="/termos" className="text-primaria-clara underline">Termos de uso</Link><Link href="/privacidade" className="text-primaria-clara underline">Política de privacidade</Link></p>
      </Cartao>

      <Cartao>
        <h2 className="font-semibold">Baixar meus dados</h2>
        <p className="mt-1 mb-3 text-sm text-suave">Um arquivo com sua conta, produtos, textos, campanhas, créditos e vendas. Contém dados dos seus compradores: guarde com cuidado.</p>
        <Botao variante="secundario" disabled={!!ocupado} onClick={() => executar("exportar", exportar, "Arquivo baixado.")}>
          {ocupado === "exportar" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Baixar meus dados
        </Botao>
      </Cartao>

      <Cartao className="border-erro/40!">
        <h2 className="font-semibold text-erro">Excluir minha conta</h2>
        <p className="mt-1 text-sm text-suave">Apaga produtos, textos, imagens, PDFs, páginas e créditos, e cancela a assinatura mensal. Suas páginas saem do ar e seus compradores deixam de conseguir baixar os produtos. Registros de vendas ficam guardados pelo prazo legal. Um plano Vitalício é perdido. <strong>Não dá para desfazer.</strong></p>
        <Campo rotulo="Digite EXCLUIR para confirmar">
          <input autoComplete="off" className={`${estiloEntrada} mt-1 max-w-xs`} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </Campo>
        <Botao className="mt-3 bg-erro! shadow-none! hover:opacity-90" disabled={!!ocupado || confirmacao !== "EXCLUIR"} onClick={() => executar("excluir", excluir, "Conta excluída.")}>
          {ocupado === "excluir" && <Loader2 size={15} className="animate-spin" />} Excluir conta para sempre
        </Botao>
      </Cartao>
    </div>
  );
}
