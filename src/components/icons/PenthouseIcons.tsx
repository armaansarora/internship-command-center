import type { JSX } from "react";
import { FileText, Plus, Search, Zap } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   PENTHOUSE ICONS — 20×20 quick-action icons.
   All icons are aria-hidden; they are decorative and their parent
   elements carry accessible labels.
   ────────────────────────────────────────────────────────────── */

/** Plus icon (20×20) — used for "Add Application" quick action */
export function IconPlus(): JSX.Element {
  return <Plus size={20} strokeWidth={1.8} aria-hidden="true" />;
}

/** Search / magnifier icon (20×20) — used for "Research Company" quick action */
export function IconSearch(): JSX.Element {
  return <Search size={20} strokeWidth={1.8} aria-hidden="true" />;
}

/** Document icon (20×20) — used for "Prep Interview" quick action */
export function IconDocument(): JSX.Element {
  return <FileText size={20} strokeWidth={1.7} aria-hidden="true" />;
}

/** Lightning bolt icon (20×20) — used for "Quick Outreach" quick action */
export function IconLightning(): JSX.Element {
  return <Zap size={20} strokeWidth={1.7} aria-hidden="true" />;
}
