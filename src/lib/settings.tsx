import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Per-browser preferences, kept in localStorage. Storage can be unavailable
// (private windows, blocked site data), so every access is guarded and the
// defaults always work.

export type Theme = "system" | "light" | "dark";
export type SnippetLang = "node" | "python" | "spring" | "docker";

export interface Settings {
  theme: Theme;
  revealSeconds: number; // a revealed value hides itself after this long
  clipboardClear: boolean; // clear a copied value from the clipboard after 30s
  snippetLang: SnippetLang;
}

export const DEFAULT_SETTINGS: Settings = { theme: "system", revealSeconds: 20, clipboardClear: true, snippetLang: "node" };
export const CLIPBOARD_CLEAR_SECONDS = 30;

const STORAGE_KEY = "env-vault:settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// index.html applies the stored theme before first paint with the same rule.
export function applyTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

type Ctx = [Settings, (patch: Partial<Settings>) => void];
const SettingsContext = createContext<Ctx>([DEFAULT_SETTINGS, () => {}]);

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    applyTheme(settings.theme);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // not persisted; the in-memory value still applies for this visit
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  return <SettingsContext.Provider value={[settings, update]}>{children}</SettingsContext.Provider>;
}
