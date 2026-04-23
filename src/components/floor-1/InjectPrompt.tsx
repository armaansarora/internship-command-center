"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * InjectPrompt — floating single-line input that opens above the bell when
 * the user presses `/` mid-orchestration. Submit pushes the text into the
 * active CEO chat via the parent's registered inject handler; Esc closes.
 *
 * Matches the Floor 1 gold-on-dark aesthetic (JetBrains Mono, gold border,
 * translucent black background) and sits at z-index 60 — above the bell UI
 * (default) but still below the dialogue panel at z-index 50's children
 * that need to overlay it, if any. Reduced-motion is honoured by the
 * surrounding CSSS transition stubs — this component has no intrinsic
 * animation of its own.
 */

export interface InjectPromptProps {
  /** Whether the prompt is currently visible. */
  open: boolean;
  /** Called when the user presses Escape OR after a successful submit. */
  onClose: () => void;
  /**
   * Called when the user submits a non-empty message (trimmed). Empty /
   * whitespace-only input is swallowed locally and does NOT fire onSubmit.
   */
  onSubmit: (text: string) => void;
}

/**
 * Pure helper that decides what should happen for a given key+value pair.
 * Extracted so the branching logic is unit-testable without spinning up the
 * full DOM event cycle. The React handler wraps this with `preventDefault`
 * + state updates.
 *
 *   - `Enter`     → submit if value trims non-empty, else null (swallow)
 *   - `Escape`    → close
 *   - anything else → null (let the input handle it normally)
 *
 * Exported for direct unit tests.
 */
export function parseInjectKey(
  key: string,
  value: string,
):
  | { action: "submit"; text: string }
  | { action: "close" }
  | null {
  if (key === "Escape") return { action: "close" };
  if (key === "Enter") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    return { action: "submit", text: trimmed };
  }
  return null;
}

export function InjectPrompt({
  open,
  onClose,
  onSubmit,
}: InjectPromptProps): JSX.Element | null {
  const inputRef = useRef<HTMLInputElement>(null);
  // Re-key the controlled input by the open cycle — every time `open` flips
  // from false → true the input remounts with a fresh empty state. Avoids a
  // setState-in-effect for the "clear on close" case (React would flag a
  // cascading-render warning) while still guaranteeing each inject session
  // starts empty. See https://react.dev/reference/react/useState#resetting-state-with-a-key
  const [value, setValue] = useState("");

  // Focus the input when the prompt opens. Using a 0ms timer lets the
  // element mount before we focus it so the autoFocus path doesn't race
  // with React's commit phase.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const parsed = parseInjectKey(e.key, value);
      if (!parsed) return;
      e.preventDefault();
      if (parsed.action === "close") {
        setValue("");
        onClose();
        return;
      }
      // submit
      onSubmit(parsed.text);
      setValue("");
      onClose();
    },
    [value, onClose, onSubmit],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    [],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Direct the CEO — inject a mid-orchestration directive"
      aria-modal="false"
      style={{
        position: "fixed",
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        width: "min(480px, 92vw)",
        padding: "10px 14px",
        borderRadius: "8px",
        background: "rgba(10, 8, 3, 0.92)",
        border: "1px solid rgba(201, 168, 76, 0.45)",
        boxShadow:
          "0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(201, 168, 76, 0.1) inset",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
          fontSize: "12px",
          color: "rgba(201, 168, 76, 0.9)",
          letterSpacing: "0.08em",
          flexShrink: 0,
        }}
      >
        /
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Direct the CEO..."
        aria-label="Directive for the CEO"
        spellCheck={false}
        autoComplete="off"
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
          fontSize: "13px",
          color: "#F5E8C0",
          letterSpacing: "0.02em",
          caretColor: "rgba(201, 168, 76, 0.9)",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
          fontSize: "9px",
          color: "rgba(107, 83, 32, 0.9)",
          letterSpacing: "0.08em",
          flexShrink: 0,
        }}
      >
        ENTER SEND · ESC CLOSE
      </span>
    </div>
  );
}
