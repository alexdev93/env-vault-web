import { useId } from "react";

export interface SegProps<T extends string> {
  /** Accessible name for the group. */
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  /** Stretch options to fill the row. */
  block?: boolean;
}

/** Segmented control: a radio group drawn as joined, square-cornered options. */
export function Seg<T extends string>({ label, options, value, onChange, size = "md", block }: SegProps<T>) {
  const name = useId();
  return (
    <div className={`seg seg-${size}${block ? " seg-block" : ""}`} role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <label key={v} className="seg-opt">
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
          <span>{text}</span>
        </label>
      ))}
    </div>
  );
}
