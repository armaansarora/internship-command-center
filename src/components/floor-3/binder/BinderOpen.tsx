"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import type { DebriefContent } from "@/types/debrief";

/**
 * Flip-open view of a single Debrief binder.
 *
 * Lazy-fetches the full `DebriefContent` from `/api/briefing/binder/:id`
 * and renders it as an illustrated two-page spread — NOT as a JSON
 * blob. Left page: company + overall score + CPO feedback quote. Right
 * page: each question with the user's answer, STAR sub-scores, and
 * per-question narrative.
 *
 * Escape or backdrop click closes the dialog.
 */

interface Props {
  binderId: string;
  onClose: () => void;
}

export function BinderOpen({ binderId, onClose }: Props): JSX.Element {
  const [content, setContent] = useState<DebriefContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/briefing/binder/${binderId}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((j) => {
        if (live) {
          setContent(j as DebriefContent);
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) {
          setErrored(true);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [binderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Binder open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "binder-fade-in 0.2s ease-out",
      }}
    >
      <article
        className="grid grid-cols-2"
        style={{
          width: "min(860px, 92vw)",
          height: "min(720px, 88vh)",
          background: "linear-gradient(to bottom, #F4EBD8, #E6D8BC)",
          borderRadius: 4,
          boxShadow:
            "0 18px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(80,50,20,0.3)",
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#2E1D0A",
          animation: "binder-flip-open 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {loading ? (
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontStyle: "italic",
            }}
          >
            Opening binder…
          </div>
        ) : errored || !content ? (
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontStyle: "italic",
              color: "#7a5a3c",
            }}
          >
            Unable to open this binder.
          </div>
        ) : (
          <>
            <div style={{ padding: 32, borderRight: "1px solid rgba(80,50,20,0.2)" }}>
              <h2 style={{ fontSize: 24, marginBottom: 4 }}>{content.company}</h2>
              <p
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#6A4A22",
                  marginBottom: 24,
                }}
              >
                Round {content.round} — {new Date(content.createdAt).toLocaleDateString()}
              </p>
              <div style={{ marginBottom: 24 }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#6A4A22",
                  }}
                >
                  Overall
                </span>
                <div
                  style={{
                    fontSize: 64,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {content.totalScore}
                </div>
              </div>
              <p style={{ fontStyle: "italic", lineHeight: 1.5, fontSize: 14 }}>
                &ldquo;{content.cpoFeedback}&rdquo;
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  marginTop: 32,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#6A4A22",
                  background: "none",
                  border: "1px solid currentColor",
                  padding: "8px 16px",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                Close binder
              </button>
            </div>
            <div style={{ padding: 32, overflowY: "auto" }}>
              {content.questions.map((q, i) => (
                <section key={q.id} style={{ marginBottom: 28 }}>
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>
                    Q{i + 1}. {q.text}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      marginBottom: 8,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {q.answer.text}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      color: "#6A4A22",
                      marginBottom: 4,
                    }}
                  >
                    <span>S {q.stars.s}</span>
                    <span>T {q.stars.t}</span>
                    <span>A {q.stars.a}</span>
                    <span>R {q.stars.r}</span>
                    <span style={{ marginLeft: "auto" }}>Score {q.score}</span>
                  </div>
                  <p style={{ fontSize: 12, fontStyle: "italic", color: "#4A2D0A" }}>
                    — {q.narrative}
                  </p>
                </section>
              ))}
            </div>
          </>
        )}
      </article>
      <style>{`
        @keyframes binder-flip-open {
          from { transform: rotateY(-6deg) scale(0.96); opacity: 0; }
          to   { transform: rotateY(0) scale(1); opacity: 1; }
        }
        @keyframes binder-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes binder-flip-open { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>
    </div>
  );
}
