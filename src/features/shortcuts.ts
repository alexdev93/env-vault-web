// One list drives both the keyboard handler's docs and the "?" sheet.
export const SHORTCUTS: [keys: string[], what: string][] = [
  [["⌘", "K"], "Search or jump to anything"],
  [["/"], "Filter the list"],
  [["j"], "Next item"],
  [["k"], "Previous item"],
  [["↵"], "Open the selected item"],
  [["c"], "Copy the selected item’s value"],
  [["e"], "Edit the selected item"],
  [["n"], "New variable"],
  [["?"], "Show these shortcuts"],
  [["esc"], "Close a dialog or clear the filter"],
];

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
