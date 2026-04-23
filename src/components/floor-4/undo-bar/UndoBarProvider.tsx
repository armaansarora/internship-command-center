"use client";

import { createContext, useCallback, useContext, useMemo, type JSX, type ReactNode } from "react";
import { useUndoBarController, type UndoBarController } from "./useUndoBarController";
import { UndoBar } from "./UndoBar";
import { approveOutreachWithUndo } from "./approveOutreachWithUndo";

/**
 * The shape exposed to consumer components.
 *
 * `approveAndTrack(outreachId, recipient)` is the one-shot approve path:
 * POSTs /api/outreach/approve, dispatches the UndoBar into in_flight
 * with the server-returned sendAfter. Consumers in the map, conflict
 * cards, or future approve-all UI call this and get the 30s undo window
 * for free.
 */
export interface UndoBarContextShape {
  controller: UndoBarController;
  approveAndTrack(outreachId: string, recipient: string): Promise<void>;
}

const UndoBarContext = createContext<UndoBarContextShape | null>(null);

interface UndoBarProviderProps {
  children: ReactNode;
}

/** Mounts the UndoBar + exposes the dispatcher via context. */
export function UndoBarProvider({ children }: UndoBarProviderProps): JSX.Element {
  const controller = useUndoBarController();

  const approveAndTrack = useCallback<UndoBarContextShape["approveAndTrack"]>(
    async (outreachId, recipient) => {
      const { id, sendAfterIso } = await approveOutreachWithUndo(outreachId);
      controller.dispatch({ outreachId: id, recipient, sendAfterIso });
    },
    [controller],
  );

  const value = useMemo<UndoBarContextShape>(
    () => ({ controller, approveAndTrack }),
    [controller, approveAndTrack],
  );

  return (
    <UndoBarContext.Provider value={value}>
      {children}
      <UndoBar controller={controller} windowSeconds={30} />
    </UndoBarContext.Provider>
  );
}

/**
 * Access the in-world undo bar. Throws if called outside UndoBarProvider
 * so accidental usage in the wrong part of the tree fails loudly in dev.
 */
export function useUndoBar(): UndoBarContextShape {
  const ctx = useContext(UndoBarContext);
  if (!ctx) {
    throw new Error("useUndoBar must be called inside <UndoBarProvider>");
  }
  return ctx;
}
