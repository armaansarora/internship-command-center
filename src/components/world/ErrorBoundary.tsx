"use client";

import type { JSX } from "react";
import React from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback — defaults to the Tower in-world error panel */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — in-world error display using "the building's lights flicker" metaphor.
 * Reports caught errors to Sentry (no-op when DSN is not configured).
 * Must be a class component — React error boundaries require it.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // NEXT_PUBLIC_* is inlined at build time; this tree-shakes when unset.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        Sentry.captureException(error, {
          extra: { componentStack: info.componentStack },
        });
      } catch {
        // Swallow Sentry init errors — never let telemetry break the UI.
      }
    }
  }

  private handleReturn = (): void => {
    // Navigate to Penthouse
    window.location.href = "/penthouse";
  };

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <TowerErrorPanel error={this.state.error} onReturn={this.handleReturn} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

// ── In-world error panel ─────────────────────────────────────────────────────

interface TowerErrorPanelProps {
  error: Error | null;
  onReturn: () => void;
  onReset: () => void;
}

function TowerErrorPanel({ error, onReturn, onReset }: TowerErrorPanelProps): JSX.Element {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6, 8, 18, 0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        zIndex: 9999,
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "rgba(26, 26, 46, 0.85)",
          border: "1px solid rgba(201, 168, 76, 0.4)",
          borderRadius: "12px",
          padding: "32px",
          boxShadow:
            "0 0 0 1px rgba(201, 168, 76, 0.08), 0 24px 64px rgba(0,0,0,0.6), 0 0 32px rgba(201, 168, 76, 0.06)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Flicker animation header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            aria-hidden="true"
            style={{
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              fontSize: "10px",
              letterSpacing: "0.2em",
              color: "rgba(201, 168, 76, 0.6)",
            }}
          >
            THE TOWER — SYSTEM FAULT
          </div>
          <h1
            style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "22px",
              fontWeight: 600,
              color: "rgba(232, 244, 253, 0.95)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            The building&apos;s lights flicker.
          </h1>
          <p
            style={{
              fontFamily: "Satoshi, system-ui, sans-serif",
              fontSize: "14px",
              color: "rgba(168, 200, 230, 0.8)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            An unexpected fault has interrupted the system. Our engineering
            team has been notified.
          </p>
        </div>

        {/* Error details */}
        {error && (
          <div
            style={{
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "6px",
              padding: "12px 14px",
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              fontSize: "11px",
              color: "rgba(220, 80, 80, 0.9)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "120px",
              overflow: "auto",
            }}
            aria-label="Error details"
          >
            {error.message}
          </div>
        )}

        {/* Gold divider */}
        <div
          aria-hidden="true"
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, transparent, rgba(201,168,76,0.3) 30%, rgba(201,168,76,0.3) 70%, transparent)",
          }}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={onReturn}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "rgba(201, 168, 76, 0.12)",
              border: "1px solid rgba(201, 168, 76, 0.35)",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: "rgba(201, 168, 76, 0.9)",
              transition: "background 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(201, 168, 76, 0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(201, 168, 76, 0.12)";
            }}
          >
            RETURN TO PENTHOUSE
          </button>
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.4)",
              transition: "border-color 0.2s ease, color 0.2s ease",
            }}
          >
            RETRY
          </button>
        </div>
      </div>

      {/* Flicker keyframe */}
      <style>{`
        @keyframes tower-flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 24%, 55% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
