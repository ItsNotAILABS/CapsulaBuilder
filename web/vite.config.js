import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8043",
        changeOrigin: true,
        // No path rewrite: the api-server mounts everything under /api,
        // matching production's reverse-proxy behavior. Stripping /api here
        // 404s every call in dev (e.g. /api/auth/me -> /auth/me).
      },
    },
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 3000,
  },
  worker: {
    format: "es",
  },
});
