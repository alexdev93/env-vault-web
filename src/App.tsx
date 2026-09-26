import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, UnauthorizedError, type Var } from "./lib/api";
import { DESKTOP, PHONE, useMediaQuery, WIDE } from "./lib/useMediaQuery";
import { BottomNav } from "./features/BottomNav";
import { CommandPalette, type Command } from "./features/CommandPalette";
import { ProjectDialog } from "./features/ProjectDialog";
import { SettingsPage } from "./features/SettingsPage";
import { ShortcutSheet } from "./features/ShortcutSheet";
import { Sidebar, type View } from "./features/Sidebar";
import { Unlock } from "./features/Unlock";
import { UsageDialog } from "./features/UsageDialog";
import { useCopy } from "./features/useCopy";
import { DetailDialog, DetailPane, EmptyDetail } from "./features/VarDetail";
import { VarDialog } from "./features/VarDialog";
import { applyListState, VaultList, type Filter, type Sort } from "./features/VaultList";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Dialog } from "./ui/Dialog";
import { Icon } from "./ui/Icon";
import { useToast } from "./ui/Toast";

type Status = "booting" | "locked" | "app";
type Modal =
  | { kind: "var"; editing: Var | null }
  | { kind: "project" }
  | { kind: "usage" }
  | { kind: "detail"; key: string }
  | { kind: "delete"; key: string }
  | { kind: "palette" }
  | { kind: "shortcuts" }
  | { kind: "drawer" }
  | null;

const isTyping = (el: Element | null) => !!el && (el.matches("input, textarea, select, [contenteditable]") || el.closest("dialog[open]") !== null);

export function App() {
  const toast = useToast();
  const copy = useCopy();
  const wide = useMediaQuery(WIDE);
  const desktop = useMediaQuery(DESKTOP);
  const phone = useMediaQuery(PHONE);

  const [status, setStatus] = useState<Status>("booting");
  const [vars, setVars] = useState<Var[] | null>(null); // null = loading (skeleton)
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof api.listProjects>>>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "vault", project: null });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("changed");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Runs an API action: a 401 locks the vault again, any other failure shows an error toast.
  const guard = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e) {
        if (e instanceof UnauthorizedError) setStatus("locked");
        else toast((e as Error).message, true);
      }
    },
    [toast],
  );

  const refreshAll = useCallback(async () => {
    try {
      const [v, p] = await Promise.all([api.listVars(), api.listProjects()]);
      setVars(v);
      setProjects(p);
      setLoadError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return setStatus("locked");
      setLoadError((e as Error).message);
      setVars((v) => v ?? []); // never leave the skeleton up after a failed load
    }
  }, []);

  const enterApp = useCallback(async () => {
    setVars(null);
    setStatus("app");
    await refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    api.whoami().then(enterApp, () => setStatus("locked"));
  }, [enterApp]);

  const project = view.kind === "vault" && view.project ? projects.find((p) => p.name === view.project) ?? null : null;
  const shown = useMemo(
    () => (vars ? applyListState(vars, view.kind === "vault" ? view.project : null, filter, query, sort) : []),
    [vars, view, filter, query, sort],
  );
  const selected = vars?.find((v) => v.key === selectedKey) ?? null;

  // With a detail pane on screen, keep something selected.
  useEffect(() => {
    if (wide && shown.length && !shown.some((v) => v.key === selectedKey)) setSelectedKey(shown[0].key);
  }, [wide, shown, selectedKey]);

  const openVar = useCallback(
    (key: string) => {
      setSelectedKey(key);
      if (!wide) setModal({ kind: "detail", key });
    },
    [wide],
  );

  // From the palette: make sure the item is visible in the list first.
  const jumpToVar = useCallback(
    (key: string) => {
      setView({ kind: "vault", project: null });
      setQuery("");
      setFilter("all");
      openVar(key);
    },
    [openVar],
  );

  const copyVar = useCallback((key: string) => guard(async () => copy(await api.getValue(key), key, true)), [guard, copy]);

  const navigate = useCallback((v: View) => {
    setView(v);
    setModal(null);
  }, []);

  const lock = () =>
    guard(async () => {
      await api.logout();
      setVars(null);
      setModal(null);
      setStatus("locked");
    });

  const actions = useMemo<Command[]>(
    () => [
      { id: "new-var", group: "Actions", code: "NEW", label: "New variable", hint: "N", run: () => setModal({ kind: "var", editing: null }) },
      { id: "new-proj", group: "Actions", code: "NEW", label: "New project", run: () => setModal({ kind: "project" }) },
      { id: "usage", group: "Actions", code: "GO", label: "Use in your app", run: () => setModal({ kind: "usage" }) },
      { id: "settings", group: "Actions", code: "GO", label: "Go to Settings", run: () => navigate({ kind: "settings" }) },
      { id: "shortcuts", group: "Actions", code: "GO", label: "Keyboard shortcuts", hint: "?", run: () => setModal({ kind: "shortcuts" }) },
    ],
    [navigate],
  );

  // Global keys. ⌘K works everywhere; the rest only when not typing and no dialog is open.
  useEffect(() => {
    if (status !== "app") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setModal((m) => (m?.kind === "palette" ? null : { kind: "palette" }));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || modal || isTyping(document.activeElement)) return;
      const inVault = view.kind === "vault";
      const idx = shown.findIndex((v) => v.key === selectedKey);
      const move = (d: number) => {
        if (!shown.length) return;
        const next = shown[Math.max(0, Math.min(shown.length - 1, idx === -1 ? 0 : idx + d))];
        setSelectedKey(next.key);
      };
      const act: Record<string, () => void> = {
        "/": () => searchRef.current?.focus(),
        j: () => move(1),
        k: () => move(-1),
        c: () => selected && copyVar(selected.key),
        e: () => selected && setModal({ kind: "var", editing: selected }),
        n: () => setModal({ kind: "var", editing: null }),
        "?": () => setModal({ kind: "shortcuts" }),
        Enter: () => {
          if (!selected || (document.activeElement && document.activeElement.matches("button, a"))) return;
          if (wide) document.querySelector<HTMLButtonElement>(".detail-pane .secret-btn")?.focus();
          else openVar(selected.key);
        },
      };
      const fn = act[e.key];
      if (!fn || (!inVault && e.key !== "?" && e.key !== "n")) return;
      e.preventDefault();
      fn();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [status, modal, view, shown, selectedKey, selected, wide, copyVar, openVar]);

  const closeModal = useCallback(() => setModal(null), []);

  if (status === "booting") return null;
  if (status === "locked") return <Unlock onUnlocked={enterApp} />;

  const sidebar = (
    <Sidebar
      view={view}
      total={vars?.length ?? 0}
      projects={projects}
      onNavigate={navigate}
      onPalette={() => setModal({ kind: "palette" })}
      onNewProject={() => setModal({ kind: "project" })}
      onUsage={() => setModal({ kind: "usage" })}
      onLogout={lock}
    />
  );

  const detailProps = (v: Var) => ({
    v,
    fetchValue: () => api.getValue(v.key),
    onCopy: (value: string) => copy(value, v.key, true),
    onEdit: () => setModal({ kind: "var", editing: v }),
    onDelete: () => setModal({ kind: "delete", key: v.key }),
  });

  const detailVar = modal?.kind === "detail" ? vars?.find((v) => v.key === modal.key) : undefined;

  return (
    <div className={"shell" + (wide && view.kind === "vault" ? " with-detail" : "")}>
      {desktop ? (
        sidebar
      ) : (
        <header className="topbar">
          {!phone && (
            <button type="button" className="btn btn-secondary btn-icon btn-lg" aria-label="Open navigation" onClick={() => setModal({ kind: "drawer" })}>
              <Icon name="menu" size={18} />
            </button>
          )}
          <div className="brand grow">
            <span className="brand-mark" aria-hidden="true">&gt;</span>
            env-vault
            <span className="caret" aria-hidden="true" />
          </div>
          <button type="button" className="btn btn-secondary btn-icon btn-lg" aria-label="Search or jump to" onClick={() => setModal({ kind: "palette" })}>
            <Icon name="search" size={18} />
          </button>
        </header>
      )}

      <main className="main">
        {view.kind === "settings" ? (
          <SettingsPage />
        ) : (
          <VaultList
            vars={vars}
            shown={shown}
            loadError={loadError}
            onRetry={() => guard(refreshAll)}
            project={project}
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
            sort={sort}
            onSort={setSort}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            onOpen={openVar}
            onCopy={copyVar}
            onNew={() => setModal({ kind: "var", editing: null })}
            onNewProject={() => setModal({ kind: "project" })}
            searchRef={searchRef}
          />
        )}
      </main>

      {wide && view.kind === "vault" && (selected ? <DetailPane {...detailProps(selected)} /> : <EmptyDetail />)}

      {phone && (
        <BottomNav
          view={view}
          onVault={() => navigate({ kind: "vault", project: null })}
          onProjects={() => setModal({ kind: "drawer" })}
          onNew={() => setModal({ kind: "var", editing: null })}
          onUsage={() => setModal({ kind: "usage" })}
          onSettings={() => navigate({ kind: "settings" })}
        />
      )}

      {modal?.kind === "drawer" && (
        <Dialog title="Navigation" bare variant="drawer" onClose={closeModal}>
          {sidebar}
        </Dialog>
      )}
      {detailVar && <DetailDialog {...detailProps(detailVar)} onClose={closeModal} />}
      {modal?.kind === "var" && (
        <VarDialog
          editing={modal.editing}
          projects={projects}
          defaultProject={view.kind === "vault" ? view.project : null}
          onClose={closeModal}
          onSaved={async (key) => {
            await refreshAll();
            setSelectedKey(key);
          }}
        />
      )}
      {modal?.kind === "project" && (
        <ProjectDialog
          onClose={closeModal}
          onSaved={async (name) => {
            await refreshAll();
            setView({ kind: "vault", project: name });
          }}
        />
      )}
      {modal?.kind === "usage" && <UsageDialog projects={projects} initialProject={project?.name} onClose={closeModal} />}
      {modal?.kind === "delete" && (
        <ConfirmDialog
          title={<>Delete <span className="mono break">{modal.key}</span>?</>}
          confirmLabel="Delete variable"
          onClose={closeModal}
          onConfirm={() =>
            guard(async () => {
              await api.deleteVar(modal.key);
              setModal(null);
              toast(`Deleted ${modal.key}`);
              if (selectedKey === modal.key) setSelectedKey(null);
              await refreshAll();
            })
          }
        >
          {(() => {
            const v = vars?.find((x) => x.key === modal.key);
            return v && v.projects.length > 0 ? (
              <>It’s removed from <strong>{v.projects.join(", ")}</strong>, so their next run won’t get it. This can’t be undone yet.</>
            ) : (
              <>This can’t be undone yet.</>
            );
          })()}
        </ConfirmDialog>
      )}
      {modal?.kind === "palette" && (
        <CommandPalette
          vars={vars ?? []}
          projects={projects}
          actions={actions}
          onOpenVar={jumpToVar}
          onOpenProject={(name) => navigate({ kind: "vault", project: name })}
          onCopyVar={copyVar}
          onClose={closeModal}
        />
      )}
      {modal?.kind === "shortcuts" && <ShortcutSheet onClose={closeModal} />}
    </div>
  );
}
