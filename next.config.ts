import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O motor de PDF roda só no servidor e carrega fontes do disco: fica fora do bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
