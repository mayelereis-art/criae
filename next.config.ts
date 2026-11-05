import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Referrer curto: o link do pedido leva um token e não pode vazar para outros sites.
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
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
