"use client";

import type { JSX } from "react";
import { useCallback, useState } from "react";

/**
 * R5.6 — ReadyToSendPanel.
 *
 * Shows three tone-variant cards side-by-side after a tone-group has been
 * generated. The user must:
 *   (1) click "Choose this tone" on one of the cards (sets selection)
 *   (2) click "Approve & send" (separate, explicit gate)
 *
 * The two clicks are separated in code (two routes) AND in UX (two
 * different buttons in two different positions). Approve is disabled
 * until a tone is chosen. No single-click generate-and-send path exists.
 *
 * Visual anchor: typewriter keys + letterpress. Bold, serif headings for
 * tone labels; JetBrains Mono for metadata; paper-on-wood backdrop via
 * parent scene.
 */

export type ToneKey = "formal" | "conversational" | "bold";

export interface ToneVariantCard {
  id: string;
  tone: ToneKey;
  previewOpening: string;
  previewBody: string;
}

export interface ReadyToSendPanelProps {
  outreachQueueId: string;
  variants: ToneVariantCard[];
  /** Optional — the id of the tailored resume PDF attached to this send. */
  resumeTailoredId?: string;
  /** Called on Choose; component rolls back on failure. */
  onChooseTone?: (args: {
    outreachQueueId: string;
    coverLetterId: string;
    tone: ToneKey;
  }) => Promise<void>;
  /** Called on Approve; component surfaces error inline. */
  onApprove?: (args: { outreachQueueId: string }) => Promise<void>;
  /** Optional PDF preview URL builder. */
  buildPdfUrl?: (documentId: string) => string;
}

const TONE_LABEL: Record<ToneKey, string> = {
  formal: "Formal",
  conversational: "Conversational",
  bold: "Bold",
};

const TONE_ANCHOR_COLOR: Record<ToneKey, string> = {
  formal: "#C9A84C",
  conversational: "#7BC47B",
  bold: "#DC643C",
};

export function ReadyToSendPanel({
  outreachQueueId,
  variants,
  resumeTailoredId,
  onChooseTone,
  onApprove,
  buildPdfUrl,
}: ReadyToSendPanelProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<ToneKey | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChoose = useCallback(
    async (card: ToneVariantCard) => {
      if (choosing || approving || approved) return;
      setError(null);
      setChoosing(true);
      const prevId = selectedId;
      const prevTone = selectedTone;
      setSelectedId(card.id);
      setSelectedTone(card.tone);
      try {
        await onChooseTone?.({
          outreachQueueId,
          coverLetterId: card.id,
          tone: card.tone,
        });
      } catch (err) {
        // Roll back on failure — the gate must reflect reality.
        setSelectedId(prevId);
        setSelectedTone(prevTone);
        setError(err instanceof Error ? err.message : "Could not set tone.");
      } finally {
        setChoosing(false);
      }
    },
    [choosing, approving, approved, selectedId, selectedTone, onChooseTone, outreachQueueId],
  );

  const handleApprove = useCallback(async () => {
    if (!selectedId || approving || approved) return;
    setError(null);
    setApproving(true);
    try {
      await onApprove?.({ outreachQueueId });
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setApproving(false);
    }
  }, [selectedId, approving, approved, onApprove, outreachQueueId]);

  return (
    <section
      role="region"
      aria-label="Ready to send — approval gate"
      className="ready-to-send-panel"
      style={{
        backgroundColor: "#1A1008",
        border: "1px solid #3A2510",
        borderRadius: "4px",
        padding: "20px",
        color: "#F5E6C8",
        fontFamily: "'Satoshi', system-ui, sans-serif",
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 pb-4"
        style={{ borderBottom: "1px solid #2A1C12" }}
      >
        <div>
          <h3
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "18px",
              margin: 0,
              color: "#F5E6C8",
            }}
          >
            Ready to send
          </h3>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#7A5C3A",
              margin: "4px 0 0",
              letterSpacing: "0.05em",
            }}
          >
            Pick one voice. Then approve. Two clicks, on purpose.
          </p>
        </div>
        {approved ? (
          <span
            aria-label="Approved"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "#7BC47B",
              padding: "4px 8px",
              border: "1px solid #7BC47B",
              borderRadius: "2px",
            }}
          >
            APPROVED
          </span>
        ) : null}
      </div>

      {/* Three tone cards */}
      <div
        role="radiogroup"
        aria-label="Tone variants"
        className="grid gap-3 mt-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "12px",
        }}
      >
        {variants.map((v) => {
          const isSelected = v.id === selectedId;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Choose ${TONE_LABEL[v.tone]} tone`}
              data-tone={v.tone}
              disabled={choosing || approving || approved}
              onClick={() => handleChoose(v)}
              style={{
                textAlign: "left",
                padding: "14px",
                backgroundColor: isSelected ? "rgba(201,168,76,0.08)" : "rgba(0,0,0,0.25)",
                border: `1px solid ${isSelected ? TONE_ANCHOR_COLOR[v.tone] : "#2A1C12"}`,
                borderRadius: "3px",
                color: "#F5E6C8",
                cursor:
                  choosing || approving || approved ? "not-allowed" : "pointer",
                opacity: !isSelected && (approving || approved) ? 0.35 : 1,
                transition: "border-color 150ms ease, background-color 150ms ease",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  color: TONE_ANCHOR_COLOR[v.tone],
                  marginBottom: "8px",
                }}
              >
                {TONE_LABEL[v.tone].toUpperCase()}
              </div>
              <div
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  color: "#F5E6C8",
                  marginBottom: "8px",
                }}
              >
                {v.previewOpening}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: 1.55,
                  color: "#B39B75",
                  whiteSpace: "pre-wrap",
                  maxHeight: "4.5em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {v.previewBody}
              </div>
              {isSelected ? (
                <div
                  style={{
                    marginTop: "10px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    color: TONE_ANCHOR_COLOR[v.tone],
                  }}
                >
                  SELECTED
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Resume preview link + Approve button */}
      <div
        className="flex items-center justify-between mt-5 pt-4"
        style={{ borderTop: "1px solid #2A1C12", gap: "12px", flexWrap: "wrap" }}
      >
        {resumeTailoredId && buildPdfUrl ? (
          <a
            href={buildPdfUrl(resumeTailoredId)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Review tailored resume PDF"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "#C9A84C",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            REVIEW RESUME PDF →
          </a>
        ) : (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "#5A3E20",
            }}
          >
            {selectedTone
              ? `TONE CHOSEN: ${TONE_LABEL[selectedTone].toUpperCase()}`
              : "NO TONE CHOSEN YET"}
          </span>
        )}

        <button
          type="button"
          onClick={handleApprove}
          disabled={!selectedId || approving || approved}
          aria-disabled={!selectedId || approving || approved}
          aria-label="Approve and send"
          data-testid="approve-button"
          style={{
            padding: "10px 18px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: selectedId ? "#0A0A12" : "#5A3E20",
            backgroundColor: selectedId ? "#C9A84C" : "transparent",
            border: `1px solid ${selectedId ? "#C9A84C" : "#3A2510"}`,
            borderRadius: "2px",
            cursor: selectedId && !approving && !approved ? "pointer" : "not-allowed",
            opacity: approving ? 0.6 : 1,
            transition: "background-color 150ms ease, color 150ms ease",
          }}
        >
          {approved
            ? "APPROVED"
            : approving
              ? "APPROVING…"
              : "APPROVE & SEND"}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            border: "1px solid #DC643C",
            borderRadius: "2px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "#DC643C",
          }}
        >
          {error}
        </div>
      ) : null}

      <p
        style={{
          marginTop: "14px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.1em",
          color: "#3A2510",
          textAlign: "right",
        }}
      >
        APPROVAL GATE · R5.6
      </p>
    </section>
  );
}
