"use client";

import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";

/**
 * R9.6 — Inline rejection-autopsy strip.
 *
 * Lives inside the application card body when `application.status === "rejected"`
 * and the parent has decided to surface the prompt (Settings → Analytics →
 * 'Rejection reflection prompts' is ON, and no reflection row exists yet).
 *
 * Partner constraint (verbatim): ULTRA-LOW-FRICTION — 2-3 tappable
 * multiple-choice chips + one optional free-text field, no required fields,
 * Submit defaults to 'Skip' until something is typed/selected, and the whole
 * thing lives inline on the card (NOT a modal).
 *
 * Soft framing — no failure language. The component does not manage its own
 * "dismissed" state — the parent flips `showReflectionStrip` to false after
 * a successful submit/skip (persistence lives in the DB row).
 */

const REJECTION_CHIPS = [
  "Pass didn't match",
  "No response",
  "Rejected after interview",
] as const;

interface Props {
  applicationId: string;
  onSubmit: (input: {
    reasons: string[];
    freeText: string;
  }) => Promise<void> | void;
  onSkip: () => void;
}

export function RejectionReflectionStrip({
  applicationId,
  onSubmit,
  onSkip,
}: Props): JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [text, setText] = useState("");

  const hasSelection = selected.size > 0 || text.trim().length > 0;
  const actionLabel = hasSelection ? "Save" : "Skip";

  const toggleChip = useCallback((chip: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }, []);

  const handleAction = useCallback(() => {
    if (!hasSelection) {
      onSkip();
      return;
    }
    const reasons: string[] = [];
    // Preserve declaration order, not click order.
    for (const chip of REJECTION_CHIPS) {
      if (selected.has(chip)) reasons.push(chip);
    }
    void onSubmit({ reasons, freeText: text.trim() });
  }, [hasSelection, onSkip, onSubmit, selected, text]);

  const stripId = useMemo(
    () => `reflection-strip-${applicationId}`,
    [applicationId],
  );

  return (
    <div
      role="region"
      aria-label="Reflection prompt"
      data-reflection-strip="true"
      data-application-id={applicationId}
      id={stripId}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginTop: "10px",
        padding: "10px",
        background: "rgba(30, 58, 95, 0.18)",
        border: "1px solid rgba(127, 179, 211, 0.18)",
        borderRadius: "3px",
        animation: "reflection-strip-in 240ms ease-out",
      }}
    >
      {/* Soft intro — no failure framing. */}
      <p
        style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "11px",
          color: "#7FB3D3",
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        A short reflection helps the CFO spot patterns. Skip anytime.
      </p>

      {/* Chip row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "5px",
        }}
      >
        {REJECTION_CHIPS.map((chip) => {
          const isActive = selected.has(chip);
          return (
            <button
              key={chip}
              type="button"
              data-chip={chip}
              aria-pressed={isActive}
              onClick={(e) => {
                e.stopPropagation();
                toggleChip(chip);
              }}
              onPointerDown={(e) => {
                // Prevent dnd-kit's drag listener on the parent card from
                // hijacking the click.
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "22px",
                padding: "0 9px",
                background: isActive
                  ? "rgba(201, 168, 76, 0.18)"
                  : "rgba(15, 31, 61, 0.55)",
                border: `1px solid ${
                  isActive
                    ? "rgba(201, 168, 76, 0.85)"
                    : "rgba(127, 179, 211, 0.3)"
                }`,
                borderRadius: "11px",
                color: isActive ? "#C9A84C" : "#7FB3D3",
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "10px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition:
                  "border-color 0.15s ease, background 0.15s ease, color 0.15s ease",
                outline: "none",
              }}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Free text — optional */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          // Don't let dnd-kit treat keystrokes as drag-cancel.
          e.stopPropagation();
        }}
        rows={2}
        maxLength={500}
        placeholder="Anything else? (optional)"
        aria-label="Optional free text reflection"
        style={{
          width: "100%",
          background: "rgba(10, 22, 40, 0.55)",
          border: "1px solid rgba(127, 179, 211, 0.22)",
          borderRadius: "3px",
          padding: "6px 8px",
          color: "#E8F4FD",
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "11px",
          resize: "none",
          outline: "none",
        }}
      />

      {/* Action button — Skip / Save */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          data-action="submit"
          data-state={hasSelection ? "save" : "skip"}
          onClick={(e) => {
            e.stopPropagation();
            handleAction();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: "24px",
            padding: "0 12px",
            background: hasSelection
              ? "rgba(201, 168, 76, 0.85)"
              : "rgba(127, 179, 211, 0.18)",
            border: `1px solid ${
              hasSelection
                ? "rgba(201, 168, 76, 1)"
                : "rgba(127, 179, 211, 0.35)"
            }`,
            borderRadius: "3px",
            color: hasSelection ? "#1A1A2E" : "#7FB3D3",
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: "pointer",
            transition:
              "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
            outline: "none",
          }}
        >
          {actionLabel}
        </button>
      </div>

      <style>{`
        @keyframes reflection-strip-in {
          0% { opacity: 0; transform: translateY(-2px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-reflection-strip="true"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
