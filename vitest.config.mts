import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], env: { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "teste", ANTHROPIC_API_KEY: "" } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/vazio.ts", import.meta.url)),
    },
  },
});
