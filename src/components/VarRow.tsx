import type { Var } from "../api";
import { Icon } from "../icons";

interface Props {
  v: Var;
  revealed: boolean;
  onToggleReveal: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function VarRow({ v, revealed, onToggleReveal, onCopy, onEdit, onDelete }: Props) {
  const isEmpty = v.value.length === 0;
  const shared = v.projects.length > 1;

  return (
    <div className="var-row">
      <div className="var-key">{v.key}</div>

      <div className="var-val-wrap">
        <div className={"var-val" + (revealed ? " revealed" : "") + (isEmpty ? " empty-val" : "")}>
          {isEmpty ? "empty — not set yet" : revealed ? v.value : "•".repeat(Math.min(v.value.length, 22))}
        </div>
        <button
          className="ghost icon-btn"
          title={revealed ? "Hide" : "Reveal"}
          aria-label={revealed ? "Hide" : "Reveal"}
          style={isEmpty ? { visibility: "hidden" } : undefined}
          onClick={onToggleReveal}
        >
          <Icon name={revealed ? "eyeOff" : "eye"} size={16} />
        </button>
      </div>

      <div className="row-actions">
        <button className="ghost icon-btn" title="Copy value" aria-label="Copy value" onClick={onCopy}>
          <Icon name="copy" size={16} />
        </button>
        <button className="ghost icon-btn" title="Edit" aria-label="Edit" onClick={onEdit}>
          <Icon name="edit" size={16} />
        </button>
        <button className="ghost icon-btn danger-hover" title="Delete" aria-label="Delete" onClick={onDelete}>
          <Icon name="trash" size={16} />
        </button>
      </div>

      <div className="var-badges">
        {v.projects.length === 0 ? (
          <span className="badge">untagged</span>
        ) : (
          v.projects.map((p) => (
            <span key={p} className={"badge" + (shared ? " shared" : "")}>{p}</span>
          ))
        )}
      </div>
    </div>
  );
}
