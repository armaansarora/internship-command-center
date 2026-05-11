"use client";

import type { JSX } from "react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { CouncilTable } from "@/components/c-suite/CouncilTable";
import type { Dossier } from "@/components/c-suite/HandoffDossierCard";
import {
  approveDossierAction,
  rejectDossierAction,
} from "./council-table-actions.server";

/**
 * Client shell that wraps `CouncilTable` with the approve / reject server
 * action wiring. Lives in a separate file from the server component so the
 * server section can stay free of "use client" boilerplate and so the
 * mutation path is unit-testable in isolation.
 *
 * Optimistic strategy: the moment the user clicks Approve / Reject we flip
 * the local copy of the dossier to the target status and mark the lane as
 * pending; on server completion we keep the optimistic copy (the server
 * action returns the real row) and on failure we revert. This keeps the
 * Council surface feeling instant even on slow networks while preserving the
 * eventual consistency contract.
 *
 * Next-action sentences are computed locally from the highest-confidence
 * dossier in each convening — the brief says "the parent passes a string;
 * you don't compute it" inside `CouncilTable`. Here we ARE the parent.
 */
export interface CouncilTableServerActionsProps {
  dossiers: Dossier[];
}

function computeNextActionForRequest(
  dossiers: Dossier[],
): string | undefined {
  // Find the highest-confidence READY dossier; fall back to highest-confidence
  // overall if no ready ones (already-decided convening).
  const ready = dossiers.filter((d) => d.status === "ready");
  const pool = ready.length > 0 ? ready : dossiers;
  if (pool.length === 0) return undefined;
  const best = pool
    .slice()
    .sort(
      (a, b) =>
        (b.confidence ?? -1) - (a.confidence ?? -1) ||
        a.created_at.localeCompare(b.created_at),
    )[0];
  if (!best) return undefined;
  return best.recommendation;
}

function buildNextActionMap(
  dossiers: Dossier[],
): Record<string, string> {
  const byRequest = new Map<string, Dossier[]>();
  for (const d of dossiers) {
    const arr = byRequest.get(d.request_id);
    if (arr) arr.push(d);
    else byRequest.set(d.request_id, [d]);
  }
  const out: Record<string, string> = {};
  for (const [requestId, list] of byRequest) {
    const sentence = computeNextActionForRequest(list);
    if (sentence) out[requestId] = sentence;
  }
  return out;
}

export function CouncilTableServerActions({
  dossiers,
}: CouncilTableServerActionsProps): JSX.Element {
  const [items, setItems] = useState<Dossier[]>(dossiers);
  const [, startTransition] = useTransition();

  const nextActionByRequest = useMemo(
    () => buildNextActionMap(items),
    [items],
  );

  const applyOptimistic = useCallback(
    (dossierId: string, status: Dossier["status"]) => {
      setItems((prev) =>
        prev.map((d) =>
          d.id === dossierId
            ? {
                ...d,
                status,
                decided_at: new Date().toISOString(),
              }
            : d,
        ),
      );
    },
    [],
  );

  const handleApprove = useCallback(
    async (dossierId: string): Promise<void> => {
      const previous = items;
      applyOptimistic(dossierId, "approved");
      try {
        const result = await approveDossierAction(dossierId);
        if (!result.ok) {
          setItems(previous);
          return;
        }
        startTransition(() => {
          setItems((prev) =>
            prev.map((d) => (d.id === dossierId ? result.dossier : d)),
          );
        });
      } catch {
        setItems(previous);
      }
    },
    [applyOptimistic, items],
  );

  const handleReject = useCallback(
    async (dossierId: string): Promise<void> => {
      const previous = items;
      applyOptimistic(dossierId, "rejected");
      try {
        const result = await rejectDossierAction(dossierId);
        if (!result.ok) {
          setItems(previous);
          return;
        }
        startTransition(() => {
          setItems((prev) =>
            prev.map((d) => (d.id === dossierId ? result.dossier : d)),
          );
        });
      } catch {
        setItems(previous);
      }
    },
    [applyOptimistic, items],
  );

  return (
    <CouncilTable
      dossiers={items}
      nextActionByRequest={nextActionByRequest}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
