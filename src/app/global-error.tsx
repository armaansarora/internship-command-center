"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

const colors = {
  boardroom: "#1A1A2E",
  charcoal: "#252540",
  gold: "#C9A84C",
  ivory: "#F5F0E8",
  parchment: "#D4C5A9",
  slate: "#8B8FA3",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: colors.boardroom,
          color: colors.ivory,
          fontFamily:
            "'Playfair Display', 'Georgia', 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          {/* Decorative divider */}
          <div
            style={{
              width: "3rem",
              height: "2px",
              backgroundColor: colors.gold,
              marginBottom: "2rem",
            }}
          />

          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: colors.ivory,
              marginBottom: "0.75rem",
              letterSpacing: "-0.01em",
            }}
          >
            Something went wrong on this floor
          </h2>

          <p
            style={{
              fontSize: "1rem",
              color: colors.parchment,
              marginBottom: "2.5rem",
              maxWidth: "28rem",
              lineHeight: 1.6,
              fontFamily:
                "'Inter', system-ui, -apple-system, sans-serif",
            }}
          >
            An unexpected error has occurred. Our team has been notified
            and is looking into it.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: colors.slate,
                marginBottom: "1.5rem",
                fontFamily: "'JetBrains Mono', 'Menlo', monospace",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}

          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "0.5rem",
              border: `1px solid ${colors.gold}`,
              backgroundColor: "transparent",
              color: colors.gold,
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, sans-serif",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              transition: "background-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.gold;
              e.currentTarget.style.color = colors.boardroom;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = colors.gold;
            }}
          >
            Try Again
          </button>

          {/* Decorative divider */}
          <div
            style={{
              width: "3rem",
              height: "2px",
              backgroundColor: colors.gold,
              marginTop: "2.5rem",
              opacity: 0.4,
            }}
          />
        </div>
      </body>
    </html>
  );
}
