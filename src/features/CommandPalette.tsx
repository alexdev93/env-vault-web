import { useMemo, useState, type KeyboardEvent } from "react";
import type { Item, Project, Var } from "../lib/api";
import { Dialog } from "../ui/Dialog";
import { Highlight } from "../ui/Highlight";
import { Icon } from "../ui/Icon";
import { ITEM_CODES } from "./ProjectPages";
import { isMac } from "./shortcuts";

export interface Command {
  id: string;
  group: "Items" | "Projects" | "Actions";
  code: string; // the small type code on the left: VAR, PROJ, NEW, GO
  label: string;
  hint?: string;
  mono?: boolean;
  run: () => void;
  copy?: () => void; // ⌘C on an item copies its value
}

interface Props {
  vars: Var[];
  projects: Project[];
  items: Item[];
  actions: Command[];
  onOpenItem: (id: string) => void;
  onCopyItem: (id: string) => void;
  onOpenVar: (key: string) => void;
  onOpenProject: (name: string) => void;
  onCopyVar: (key: string) => void;
  onClose: () => void;
}

const MAX_ITEMS = 8;

// role=combobox input driving a listbox through aria-activedescendant (1f).
export function CommandPalette({ vars, projects, items: personal, actions, onOpenVar, onOpenProject, onCopyVar, onOpenItem, onCopyItem, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = (s: string) => !q || s.toLowerCase().includes(q);
    const items: Command[] = vars
      .filter((v) => hit(v.key) || v.projects.some(hit))
      .slice(0, MAX_ITEMS)
      .map((v) => ({
        id: `var-${v.key}`,
        group: "Items",
        code: "VAR",
        label: v.key,
        mono: true,
        hint: v.projects.length ? v.projects.join(", ") : "Personal",
        run: () => onOpenVar(v.key),
        copy: () => onCopyVar(v.key),
      }));
    const mine: Command[] = personal
      .filter((it) => hit(it.title) || hit(it.username) || hit(it.url))
      .slice(0, MAX_ITEMS)
      .map((it) => ({
        id: `item-${it.id}`,
        group: "Items",
        code: ITEM_CODES[it.type],
        label: it.title,
        hint: it.username || it.project || "Personal",
        run: () => onOpenItem(it.id),
        copy: () => onCopyItem(it.id),
      }));
    const projs: Command[] = projects.filter((p) => hit(p.name)).slice(0, 5).map((p) => ({
      id: `proj-${p.id}`,
      group: "Projects",
      code: "PROJ",
      label: p.name,
      mono: true,
      hint: `${p.keys.length} variables`,
      run: () => onOpenProject(p.name),
    }));
    return [...items, ...mine, ...projs, ...actions.filter((a) => hit(a.label))];
  }, [query, vars, personal, projects, actions, onOpenVar, onOpenProject, onCopyVar, onOpenItem, onCopyItem]);

  const current = results[Math.min(active, results.length - 1)];
  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const move = (to: number) => {
      e.preventDefault();
      setActive(Math.max(0, Math.min(results.length - 1, to)));
    };
    if (e.key === "ArrowDown") move(active + 1);
    else if (e.key === "ArrowUp") move(active - 1);
    else if (e.key === "Home" && e.ctrlKey) move(0);
    else if (e.key === "End" && e.ctrlKey) move(results.length - 1);
    else if (e.key === "Enter") {
      e.preventDefault();
      run(current);
    } else if (e.key.toLowerCase() === "c" && (e.metaKey || e.ctrlKey) && current?.copy) {
      const { selectionStart, selectionEnd } = e.currentTarget;
      if (selectionStart === selectionEnd) {
        e.preventDefault();
        onClose();
        current.copy();
      }
    }
  };

  let lastGroup = "";
  return (
    <Dialog title="Command palette" bare onClose={onClose} width={680} className="palette">
      <div className="palette-input">
        <Icon name="search" size={18} />
        <input
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={current ? `pal-${current.id}` : undefined}
          aria-autocomplete="list"
          aria-label="Search items, projects and actions"
          placeholder="Search items, projects and actions…"
          autoFocus
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <kbd>esc</kbd>
      </div>
      <ul id="palette-list" role="listbox" aria-label="Results" className="palette-list">
        {results.length === 0 && <li className="palette-empty">Nothing matches ‘{query}’.</li>}
        {results.map((c, i) => {
          const heading = c.group !== lastGroup ? (lastGroup = c.group) : null;
          return [
            heading && <li key={`h-${heading}`} role="presentation" className="palette-group">{heading}</li>,
            <li
              key={c.id}
              id={`pal-${c.id}`}
              role="option"
              aria-selected={c === current}
              className="palette-opt"
              onMouseMove={() => setActive(i)}
              onClick={() => run(c)}
            >
              <span className="type-code">[{c.code}]</span>
              <span className={"grow" + (c.mono ? " mono" : "")}><Highlight text={c.label} query={query} /></span>
              {c.hint && <span className="muted small">{c.hint}</span>}
            </li>,
          ];
        })}
      </ul>
      <div className="palette-foot" aria-hidden="true">
        <span>↑↓ move</span><span>↵ open</span><span>{isMac ? "⌘" : "Ctrl+"}C copy value</span><span className="push">? all shortcuts</span>
      </div>
    </Dialog>
  );
}
