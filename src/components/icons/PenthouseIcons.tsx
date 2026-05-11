import type { JSX } from "react";

/* ──────────────────────────────────────────────────────────────
   PENTHOUSE ICONS — 20×20 quick-action icons.
   All icons are aria-hidden; they are decorative and their parent
   elements carry accessible labels.
   ────────────────────────────────────────────────────────────── */

/** Plus icon (20×20) — used for "Add Application" quick action */
export function IconPlus(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Search / magnifier icon (20×20) — used for "Research Company" quick action */
export function IconSearch(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Document icon (20×20) — used for "Prep Interview" quick action */
export function IconDocument(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="1.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <line x1="6.5" y1="6.5" x2="13.5" y2="6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <line x1="6.5" y1="9.5" x2="13.5" y2="9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <line x1="6.5" y1="12.5" x2="10.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** Lightning bolt icon (20×20) — used for "Quick Outreach" quick action */
export function IconLightning(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <polyline
        points="12,2 6,11 10,11 8,18 14,9 10,9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
