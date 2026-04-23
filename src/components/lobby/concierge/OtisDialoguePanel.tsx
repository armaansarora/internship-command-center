"use client";

import type { JSX, ChangeEvent, FormEvent } from "react";
import { useEffect, useRef } from "react";

/**
 * OtisDialoguePanel — the Concierge's conversation surface.
 *
 * Pure presentation: message list, streaming cursor, input, and the honored
 * Skip affordance. Built fresh rather than wrapping `AgentDialoguePanel` so
 * the burgundy palette and reception-desk register stay distinct from the
 * C-suite's gold executive panel. Upstream wiring (streamText transport,
 * useChat hook) is supplied by R4.4 `ConcierceFlow`.
 *
 * Skip honored: when `canSkip` is true, a clearly-labeled Skip button
 * appears in the panel footer; activating it fires `onSkip` and the flow
 * persists a bare-minimum target profile so the user is never stranded.
 */

export type OtisMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export type OtisStatus = "idle" | "streaming" | "thinking" | "sent";

interface OtisDialoguePanelProps {
  messages: OtisMessage[];
  status: OtisStatus;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  canSkip: boolean;
  opener?: string;
}

const BURGUNDY = "#6B2A2E";
const BURGUNDY_DEEP = "#3D1618";
const IVORY = "#F5EEE1";
const PAPER = "#FAF3E6";

export function OtisDialoguePanel({
  messages,
  status,
  input,
  onInputChange,
  onSubmit,
  onSkip,
  canSkip,
  opener,
}: OtisDialoguePanelProps): JSX.Element {
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, status]);

  const isStreaming = status === "streaming" || status === "thinking";

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSubmit();
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Conversation with Otis, the Concierge"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        backgroundColor: "rgba(12, 6, 7, 0.92)",
        border: `1px solid ${BURGUNDY}`,
        borderRadius: "10px",
        boxShadow: `0 12px 40px rgba(61, 22, 24, 0.35)`,
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header — warm ivory label over burgundy seam */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid ${BURGUNDY_DEEP}` }}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: BURGUNDY }}
          />
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'Playfair Display', serif",
              color: PAPER,
              letterSpacing: "0.04em",
            }}
          >
            Otis · the Concierge
          </span>
        </div>
        {canSkip && (
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip the Concierge"
            className="text-xs px-3 py-1.5 rounded focus-visible:outline focus-visible:outline-2"
            style={{
              color: PAPER,
              backgroundColor: "transparent",
              border: `1px solid ${BURGUNDY}`,
              outlineColor: IVORY,
              cursor: "pointer",
              fontFamily: "'Satoshi', sans-serif",
              letterSpacing: "0.06em",
            }}
          >
            Skip
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Otis's conversation log"
        className="overflow-y-auto px-5 py-4 space-y-3"
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        {messages.length === 0 && opener && (
          <p
            style={{
              color: "rgba(245, 238, 225, 0.72)",
              fontSize: "15px",
              fontStyle: "italic",
              lineHeight: 1.55,
            }}
          >
            {opener}
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className="max-w-[85%]"
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              marginLeft: m.role === "user" ? "auto" : 0,
            }}
          >
            <span
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: m.role === "assistant" ? BURGUNDY : "rgba(245, 238, 225, 0.55)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {m.role === "assistant" ? "Otis" : "You"}
            </span>
            <p
              style={{
                marginTop: "4px",
                color: m.role === "assistant" ? PAPER : IVORY,
                fontSize: "15px",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
              {isStreaming && m.role === "assistant" && m === messages[messages.length - 1] && (
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "14px",
                    marginLeft: "3px",
                    backgroundColor: BURGUNDY,
                    verticalAlign: "middle",
                    animation: "otis-cursor 0.8s infinite",
                  }}
                />
              )}
            </p>
          </div>
        ))}
        <div ref={scrollEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderTop: `1px solid ${BURGUNDY_DEEP}` }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange(e.target.value)}
          placeholder="Tell Otis what you're looking for…"
          aria-label="Message to Otis"
          disabled={isStreaming}
          className="flex-1 bg-transparent border-0 focus:outline-none"
          style={{
            color: IVORY,
            fontSize: "15px",
            fontFamily: "'Satoshi', sans-serif",
            padding: "6px 2px",
          }}
        />
        <button
          type="submit"
          aria-label="Send to Otis"
          disabled={isStreaming || !input.trim()}
          className="text-xs px-3 py-1.5 rounded focus-visible:outline focus-visible:outline-2"
          style={{
            color: PAPER,
            backgroundColor: BURGUNDY,
            border: `1px solid ${BURGUNDY}`,
            outlineColor: IVORY,
            cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
            opacity: isStreaming || !input.trim() ? 0.55 : 1,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.08em",
          }}
        >
          SEND
        </button>
      </form>

      <style>{`
        @keyframes otis-cursor {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
