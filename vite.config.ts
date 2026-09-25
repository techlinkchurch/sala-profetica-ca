import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const OBRIGATORIAS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];

export default defineConfig(({ command, mode }) => {
  // Sem essas variáveis o site sobe em branco; melhor o deploy falhar com uma mensagem clara.
  if (command === "build") {
    const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
    const faltando = OBRIGATORIAS.filter((nome) => !env[nome]);
    if (faltando.length) {
      throw new Error(`Variáveis de ambiente ausentes: ${faltando.join(", ")}. Configure-as na Vercel (Settings → Environment Variables).`);
    }
  }

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          cadastro: resolve(import.meta.dirname, "index.html"),
          privacidade: resolve(import.meta.dirname, "privacidade/index.html"),
          painel: resolve(import.meta.dirname, "painel/index.html"),
          avaliacao: resolve(import.meta.dirname, "avaliacao/index.html"),
        },
      },
    },
  };
});
