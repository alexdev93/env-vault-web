import { Icon } from "../ui/Icon";
import type { View } from "./Sidebar";

interface Props {
  view: View;
  onVault: () => void;
  onProjects: () => void;
  onNew: () => void;
  onUsage: () => void;
  onSettings: () => void;
}

// Phones (<768px): five destinations, the middle one adds a variable (1h).
export function BottomNav({ view, onVault, onProjects, onNew, onUsage, onSettings }: Props) {
  const cur = (on: boolean) => (on ? { "aria-current": "page" as const } : {});
  return (
    <nav className="bottom-nav" aria-label="Main">
      <button type="button" {...cur(view.kind === "vault" && view.project === null)} onClick={onVault}>Vault</button>
      <button type="button" {...cur(view.kind === "vault" && view.project !== null)} onClick={onProjects}>Projects</button>
      <button type="button" className="bottom-new" aria-label="New variable" onClick={onNew}><Icon name="plus" size={24} /></button>
      <button type="button" onClick={onUsage}>Run it</button>
      <button type="button" {...cur(view.kind === "settings")} onClick={onSettings}>Settings</button>
    </nav>
  );
}
