# env-vault-web

The dashboard for [env-vault](https://env-vault-api.alexdev93.workers.dev):
Vite + React + TypeScript. It has no server code. It talks to the
[env-vault-backend](https://github.com/alexdev93/env-vault-backend) Worker
through `/api/*` only (`src/api.ts`). Both are combined and deployed from the
private `env-vault` repo, where this repo is the `web/` submodule.

```text
src/lib/          api client, settings (localStorage), clipboard, formatting
src/ui/           reusable pieces: Button, Dialog, ConfirmDialog, SecretField, Seg, Charts,
                  Tag, Field, CodeBlock, EmptyState, Toast, Icon
src/features/     screens: Unlock, Sidebar, VaultList, VarDetail, VarDialog,
                  ProjectDialog, UsageDialog, CommandPalette, SettingsPage, BottomNav,
                  ProjectPages (a project's Overview + Branches tabs), ServiceDialog,
                  ServiceFields, BranchDialog, BranchVarDialog, BranchView (a project's
                  variables as one branch sees them), HistoryList, ItemsPage +
                  ItemDialog (the personal vault: logins, secure notes, secrets),
                  ActivityPage (who pulled what: stat tiles, pulls per day,
                  heartbeat per project, clients, event log) + ProjectHeartbeat
src/App.tsx       app shell: layout by width, selection, keyboard shortcuts
src/styles/       tokens.css (light/dark themes) + app.css
public/fonts/     self-hosted JetBrains Mono woff2 (400/600/800, latin, OFL)
vite.config.ts    dev server + proxy to the Worker
```

The UI has a terminal look: JetBrains Mono everywhere, one phosphor-green
accent, 2px radius, 1px hairlines, `[VAR]`-style labels. Light and dark themes follow the system setting,
with an override in Settings. A project page has three tabs: **Variables** (the list), **Overview**
(links, notes, services such as the database or hosting and the account you
sign in with, edit/delete) and **Branches** (per-branch values that override
the defaults, used with `envvault run <project> -b <branch>`). Everything —
projects, variables, services, branches, branch values — can be created,
edited (including renames) and deleted, and carries notes. Every value keeps its last 5 earlier values (reveal, copy,
restore). The Variables tab has a branch switch: pick a branch to see exactly
what `-b <branch>` gets. Under **Personal**, the vault also keeps logins,
secure notes and secrets that aren't a project's environment. Values are never in the list response: the
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
