import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Matches the TOKENS.md breakpoints.
export const WIDE = "(min-width: 1440px)"; // sidebar + list + detail pane
export const DESKTOP = "(min-width: 1024px)"; // fixed sidebar
export const PHONE = "(max-width: 767px)"; // bottom navigation, sheets
