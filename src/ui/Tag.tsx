import type { ReactNode } from "react";

export interface TagProps {
  /** neutral: project names and metadata · accent: "shared", warnings · outline: low emphasis */
  tone?: "neutral" | "accent" | "outline";
  /** Monospace, for project names and keys. */
  mono?: boolean;
  children: ReactNode;
}

/** Small square label. */
export function Tag({ tone = "neutral", mono, children }: TagProps) {
  return <span className={`tag tag-${tone}${mono ? " mono" : ""}`}>{children}</span>;
}
