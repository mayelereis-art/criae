import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O motor de PDF roda só no servidor e carrega fontes do disco: fica fora do bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  // As fontes são lidas por caminho (fs), então o build de produção não as detecta sozinho.
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@fontsource/*/files/*-latin-400-*.woff", "./node_modules/@fontsource/*/files/*-latin-700-*.woff"],
  },
};

export default nextConfig;
