# env-vault-web

The dashboard for [env-vault](https://env-vault-api.alexdev93.workers.dev):
Vite + React + TypeScript. It has no server code. It talks to the
[env-vault-backend](https://github.com/alexdev93/env-vault-backend) Worker
through `/api/*` only (`src/api.ts`). Both are combined and deployed from the
private `env-vault` repo, where this repo is the `web/` submodule.

```text
src/lib/          api client, settings (localStorage), clipboard, formatting
src/ui/           reusable pieces: Button, Dialog, ConfirmDialog, SecretField, Seg,
                  Tag, Field, CodeBlock, EmptyState, Toast, Icon
src/features/     screens: Unlock, Sidebar, VaultList, VarDetail, VarDialog,
                  ProjectDialog, UsageDialog, CommandPalette, SettingsPage, BottomNav
src/App.tsx       app shell: layout by width, selection, keyboard shortcuts
src/styles/       tokens.css (light/dark themes) + app.css
public/fonts/     self-hosted JetBrains Mono woff2 (400/600/800, latin, OFL)
vite.config.ts    dev server + proxy to the Worker
```

The UI has a terminal look: JetBrains Mono everywhere, one phosphor-green
accent, 2px radius, 1px hairlines, `[VAR]`-style labels. Light and dark themes follow the system setting,
with an override in Settings. Values are never in the list response: the
dashboard fetches one value per reveal or copy (`GET /api/vars/:key/value`).

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
