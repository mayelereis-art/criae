import type { Metadata } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { ProvedorAuth } from "@/components/ProvedorAuth";
import "./globals.css";

const titulo = Sora({ variable: "--font-titulo", subsets: ["latin"], weight: ["600", "700", "800"] });
const corpo = Inter({ variable: "--font-corpo", subsets: ["latin"] });
const codigo = JetBrains_Mono({ variable: "--font-codigo", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Criaê — Produtos digitais com IA", template: "%s · Criaê" },
  description:
    "Transforme uma ideia em produto digital: pesquisa de nicho, e-book escrito com IA, página de vendas, divulgação e checkout em um só lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${titulo.variable} ${corpo.variable} ${codigo.variable}`}>
        <ProvedorAuth>{children}</ProvedorAuth>
      </body>
    </html>
  );
}
