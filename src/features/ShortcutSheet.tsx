import { Dialog } from "../ui/Dialog";
import { isMac, SHORTCUTS } from "./shortcuts";

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  return (
    <Dialog eyebrow="Keyboard" title="Shortcuts" onClose={onClose} width={480}>
      <dl className="shortcuts">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={what} className="shortcut">
            <dt>{keys.map((k) => <kbd key={k}>{k === "⌘" && !isMac ? "Ctrl" : k}</kbd>)}</dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
