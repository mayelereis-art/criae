import type { Metadata } from "next";
import { ProvedorAuth } from "@/components/ProvedorAuth";
// Fontes em pacotes locais: o build não depende do Google Fonts responder (next/font/google falhava às vezes).
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  // Base dos links absolutos de SEO e Open Graph (canonical, imagens).
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL_SITE || "http://localhost:8750"),
  title: { default: "Criaê — Produtos digitais com IA", template: "%s · Criaê" },
  description:
    "Transforme uma ideia em produto digital: pesquisa de nicho, e-book escrito com IA, página de vendas, divulgação e checkout em um só lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ProvedorAuth>{children}</ProvedorAuth>
      </body>
    </html>
  );
}
