import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O motor de PDF roda só no servidor e carrega fontes do disco: fica fora do bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Fontes e arquivos do pdfkit são carregados por caminho, então o build de produção não os detecta sozinho.
  outputFileTracingIncludes: {
    "/api/pdf": [
      "./node_modules/@fontsource/*/files/*-latin-400-*.woff",
      "./node_modules/@fontsource/*/files/*-latin-700-*.woff",
      "./node_modules/pdfkit/**/*",
      "./node_modules/@react-pdf/**/*",
    ],
  },
};

export default nextConfig;
