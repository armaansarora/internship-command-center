"use client";

import type { JSX } from "react";
import { MilestoneToastQueue } from "./MilestoneToast";
import { useProgressionMilestones } from "@/hooks/useProgressionMilestones";

/**
 * Mount-once container for the milestone toast system.
 *
 * Client component (hook usage) — kept as a separate file so the client
 * boundary stays narrow and the rest of `world-shell.tsx` can remain a thin
 * layout composer.
 */
export function MilestoneToastContainer(): JSX.Element {
  const { milestones, dismiss } = useProgressionMilestones();
  return <MilestoneToastQueue milestones={milestones} onMilestoneDismissed={dismiss} />;
}
