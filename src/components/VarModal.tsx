import { useState } from "react";
import { api, type Project, type Var } from "../api";
import { Icon } from "../icons";
import { useToast } from "../toast";
import { LoadingButton } from "./LoadingButton";
import { Modal } from "./Modal";

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface Props {
  editing: Var | null;
  projects: Project[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function VarModal({ editing, projects, onClose, onSaved }: Props) {
  const toast = useToast();
  const [key, setKey] = useState(editing?.key ?? "");
  const [value, setValue] = useState(editing?.value ?? "");
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(projects.filter((p) => editing?.projects.includes(p.name)).map((p) => p.id)),
  );
  const [error, setError] = useState("");

  const toggle = (id: string) =>
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    const k = key.trim();
    if (!KEY_RE.test(k)) {
      setError("key must look like AN_ENV_VAR_NAME");
      return;
    }
    try {
      await api.saveVar(k, value, [...checked]);
      onClose();
      toast(`Saved ${k}`);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2>
        {editing ? <><Icon name="edit" size={16} /> Edit {editing.key}</> : <><Icon name="plus" size={16} /> Add variable</>}
      </h2>
      <div className="field">
        <label htmlFor="varKeyInput">Key</label>
        <input
          type="text"
          id="varKeyInput"
          placeholder="DATABASE_URL"
          autoComplete="off"
          autoFocus={!editing}
          disabled={!!editing}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="varValInput">Value</label>
        <textarea
          id="varValInput"
          placeholder="the real value"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Used by which project(s)?</label>
        <div className="project-checks">
          {projects.map((p) => (
            <label key={p.id}>
              <input type="checkbox" checked={checked.has(p.id)} onChange={() => toggle(p.id)} />
              {p.name}
            </label>
          ))}
        </div>
      </div>
      <div className="error">{error}</div>
      <div className="modal-actions">
        <button className="ghost" onClick={onClose}>Cancel</button>
        <LoadingButton onClick={save}>Save</LoadingButton>
      </div>
    </Modal>
  );
}
