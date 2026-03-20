import type { JSX } from "react";

/* ──────────────────────────────────────────────────────────────
   PENTHOUSE ICONS — 16×16 stat icons + 20×20 quick-action icons
   All icons are aria-hidden; they are decorative and their parent
   elements carry accessible labels.
   ────────────────────────────────────────────────────────────── */

/** Bar-chart icon — used for "Applications" stat card */
export function IconBarChart(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect x="1" y="9" width="3.5" height="6" rx="0.5" fill="var(--gold)" opacity="0.55" />
      <rect x="6.25" y="5" width="3.5" height="10" rx="0.5" fill="var(--gold)" opacity="0.75" />
      <rect x="11.5" y="2" width="3.5" height="13" rx="0.5" fill="var(--gold)" opacity="1" />
    </svg>
  );
}

/** Flow / pipeline icon — used for "In Pipeline" stat card */
export function IconFlow(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="2.5" cy="8" r="2" fill="var(--info)" opacity="0.9" />
      <line
        x1="4.5"
        y1="8"
        x2="6.5"
        y2="8"
        stroke="var(--info)"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <circle cx="8" cy="8" r="2" fill="var(--info)" opacity="0.9" />
      <line
        x1="10"
        y1="8"
        x2="12"
        y2="8"
        stroke="var(--info)"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <circle cx="13.5" cy="8" r="2" fill="var(--info)" opacity="0.9" />
    </svg>
  );
}

/** Bullseye / target icon — used for "Interviews" stat card */
export function IconBullseye(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="6.5" stroke="var(--success)" strokeWidth="1.2" opacity="0.55" />
      <circle cx="8" cy="8" r="3.5" stroke="var(--success)" strokeWidth="1.4" opacity="0.85" />
      <circle cx="8" cy="8" r="1.5" fill="var(--success)" opacity="1" />
    </svg>
  );
}

/** Trend-line icon — used for "Response Rate" stat card */
export function IconTrendLine(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <polyline
        points="1,12 5,9 9,5.5 13,3"
        stroke="var(--warning)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx="13" cy="3" r="2" fill="var(--warning)" opacity="1" />
    </svg>
  );
}

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
