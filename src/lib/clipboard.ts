import { CLIPBOARD_CLEAR_SECONDS } from "./settings";

let pendingClear: number | undefined;

// Writes text to the clipboard. With clearAfter, it later empties the clipboard,
// but only if the clipboard still holds our text: anything copied since is left
// alone, and if the browser won't let us read the clipboard, nothing is cleared.
export async function writeClipboard(text: string, clearAfter: boolean): Promise<void> {
  await navigator.clipboard.writeText(text);
  window.clearTimeout(pendingClear);
  if (!clearAfter) return;
  pendingClear = window.setTimeout(() => clearIfStill(text), CLIPBOARD_CLEAR_SECONDS * 1000);
}

async function clearIfStill(text: string) {
  try {
    if ((await navigator.clipboard.readText()) === text) await navigator.clipboard.writeText("");
  } catch {
    // Browsers refuse clipboard access from a background tab: retry once the tab is focused again.
    if (!document.hasFocus()) window.addEventListener("focus", () => void clearIfStill(text).catch(() => {}), { once: true });
  }
}
