"use client";
import { useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import { QuickActionCard } from "@/components/penthouse/QuickActionCard";
import {
  IconPlus,
  IconSearch,
  IconDocument,
  IconLightning,
} from "@/components/icons/PenthouseIcons";
import {
  QUICK_ACTION_DISPATCHES,
  type QuickActionDispatch,
} from "./actionHandlers";
import { PneumaticTubeOverlay } from "./PneumaticTubeOverlay";

/**
 * QuickActionsRow — the 4 Penthouse quick-actions wired to either a direct
 * navigation (Add Application) or a pneumatic-tube dispatch (Research Company,
 * Prep Interview, Quick Outreach).
 *
 * Lives inside the RestPanel — not on the primary scene canvas.
 */
const ICONS: Record<QuickActionDispatch["key"], JSX.Element> = {
  add_application: <IconPlus />,
  research_company: <IconSearch />,
  prep_interview: <IconDocument />,
  quick_outreach: <IconLightning />,
};

export function QuickActionsRow(): JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState<QuickActionDispatch | null>(null);

  const onCardClick = (d: QuickActionDispatch) => {
    if (d.kind === "nav") {
      router.push(d.route);
      return;
    }
    setPending(d);
  };

  return (
    <>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        role="group"
        aria-label="Quick actions"
      >
        {QUICK_ACTION_DISPATCHES.map((d, i) => (
          <QuickActionCard
            key={d.key}
            index={i}
            pending={pending?.key === d.key}
            onClick={() => onCardClick(d)}
            action={{
              label: d.label,
              desc: d.desc,
              icon: ICONS[d.key],
              accentColor: d.accentColor,
              glowColor: d.glowColor,
              borderColor: d.borderColor,
            }}
          />
        ))}
      </div>

      <PneumaticTubeOverlay dispatch={pending} onDismiss={() => setPending(null)} />

      <style>{`
        @keyframes quick-action-pulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
      `}</style>
    </>
  );
}
