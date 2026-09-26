import { Agent } from "node:https";
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

// Node tries each of the Worker's IPv6/IPv4 addresses for only 250ms by default,
// which times out (ETIMEDOUT -> 502) on high-latency networks or where IPv6 is
// unreachable. Allow 1s per address, and keep connections alive so the slow
// TLS setup happens once instead of on every request.
const prodAgent = new Agent({ keepAlive: true, autoSelectFamilyAttemptTimeout: 1000 });

export default defineConfig(({ mode }) => {
  const target =
    mode === "prod"
      ? { target: WORKERS.prod, changeOrigin: true, agent: prodAgent }
      : { target: WORKERS.local, changeOrigin: true };
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { "/api": target, "/install.sh": target, "/envvault.sh": target },
    },
  };
});
