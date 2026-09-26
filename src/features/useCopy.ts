import { useCallback } from "react";
import { writeClipboard } from "../lib/clipboard";
import { CLIPBOARD_CLEAR_SECONDS, useSettings } from "../lib/settings";
import { useToast } from "../ui/Toast";

// Copies text and toasts what was copied. `what` names it ("DATABASE_URL"):
// the toast never contains the value itself. Secrets use the clipboard-clear setting.
export function useCopy() {
  const toast = useToast();
  const [settings] = useSettings();
  return useCallback(
    async (text: string, what: string, secret = false) => {
      const clear = secret && settings.clipboardClear;
      try {
        await writeClipboard(text, clear);
        toast(clear ? `Copied ${what} · clears in ${CLIPBOARD_CLEAR_SECONDS}s` : `Copied ${what}`);
      } catch {
        toast("Couldn’t copy: the clipboard isn’t available here", true);
      }
    },
    [toast, settings.clipboardClear],
  );
}
