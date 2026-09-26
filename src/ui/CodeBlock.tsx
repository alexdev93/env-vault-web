import { Icon } from "./Icon";

export interface CodeBlockProps {
  code: string;
  /** Called with the code when the copy button is pressed. */
  onCopy?: (code: string) => void;
  /** "inline": bordered on the page background · "dark": the dark terminal block */
  tone?: "inline" | "dark";
}

/** Monospace command/snippet with an attached copy button. Lines starting with # render muted. */
export function CodeBlock({ code, onCopy, tone = "inline" }: CodeBlockProps) {
  return (
    <div className={`code-block code-${tone}`}>
      <pre>
        {code.split("\n").map((line, i) => (
          <div key={i} className={line.trimStart().startsWith("#") ? "code-comment" : undefined}>{line || " "}</div>
        ))}
      </pre>
      {onCopy && (
        <button type="button" className="btn btn-icon code-copy" aria-label="Copy" onClick={() => onCopy(code)}>
          <Icon name="copy" size={16} />
        </button>
      )}
    </div>
  );
}
