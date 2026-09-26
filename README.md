# env-vault-web

The dashboard for [env-vault](https://env-vault-api.alexdev93.workers.dev):
Vite + React + TypeScript. It has no server code. It talks to the
[env-vault-backend](https://github.com/alexdev93/env-vault-backend) Worker
through `/api/*` only (`src/api.ts`). Both are combined and deployed from the
private `env-vault` repo, where this repo is the `web/` submodule.

```text
src/api.ts           typed API client (same-origin fetch)
src/App.tsx          app shell: session, search, project filter, variable list
src/components/      Login, VarRow, VarModal, ProjectModal, UsageModal, Modal, LoadingButton
src/toast.tsx        toast notifications + copyText helper
src/icons.tsx        inline SVG icons
src/styles.css       all styles
vite.config.ts       dev server + proxy to the Worker
```

## Commands

```bash
npm install
npm run dev        # http://localhost:5173, proxies to a local Worker on :8787
npm run dev:prod   # same UI, proxies to the deployed Worker (production data!)
npm run build      # typecheck + build to dist/
```

`npm run dev` needs the backend running on :8787 (`npm run dev` in
env-vault-backend, or the root repo's `npm run dev` for both). In dev, Vite
proxies `/api/*`, `/install.sh` and `/envvault.sh`, so the session cookie works
as if everything were on one origin.
