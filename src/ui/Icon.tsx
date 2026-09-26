// Inline SVG icons (no external requests). Square corners to match the zero-radius system.
const PATHS = {
  eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a17.44 17.44 0 0 1-2.16 3.19m-3.09 2.55A9.12 9.12 0 0 1 12 20c-6.5 0-10-8-10-8a17.55 17.55 0 0 1 4.22-5.24" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="2" y1="2" x2="22" y2="22" /></>,
  copy: <><rect width="14" height="14" x="8" y="8" /><path d="M4 16V4h12" /></>,
  check: <polyline points="20 6 9 17 4 12" />,
  edit: <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />,
  trash: <><path d="M3 6h18" /><path d="M19 6v15H5V6m3 0V3h8v3" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>,
  plus: <path d="M5 12h14M12 5v14" />,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  lock: <><rect width="18" height="11" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  logOut: <><path d="M9 21H3V3h6" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
  terminal: <><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></>,
  folder: <path d="M2 4h7l2 3h11v13H2Z" />,
  alert: <><path d="M12 3 2 21h20Z" /><line x1="12" y1="10" x2="12" y2="14" /><line x1="12" y1="17.5" x2="12" y2="17.5" /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  grid: <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />,
  keyboard: <><rect width="20" height="14" x="2" y="5" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 15h10" /></>,
};

export type IconName = keyof typeof PATHS;

/** Inline SVG icon. Decorative by default (aria-hidden); pair it with a visible label or an aria-label on the button. */
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
