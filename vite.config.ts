import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, Vite serves the dashboard with hot reload and proxies the Worker's
// routes, so the browser sees a single origin and the session cookie just works:
//   vite              -> local `wrangler dev` (env-vault-backend, local D1)
//   vite --mode prod  -> the deployed Worker (production D1 + production secrets)
const WORKERS = {
  local: "http://127.0.0.1:8787",
  prod: "https://env-vault-api.alexdev93.workers.dev",
};

export default defineConfig(({ mode }) => {
  const target = { target: mode === "prod" ? WORKERS.prod : WORKERS.local, changeOrigin: true };
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { "/api": target, "/install.sh": target, "/envvault.sh": target },
    },
  };
});
