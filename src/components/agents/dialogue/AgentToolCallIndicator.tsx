"use client";

import type { JSX } from "react";
import type { AgentDialogueTheme } from "./types";

interface AgentToolCallIndicatorProps {
  toolName: string;
  labels: Record<string, string>;
  theme: AgentDialogueTheme;
}

export function AgentToolCallIndicator({
  toolName,
  labels,
  theme,
}: AgentToolCallIndicatorProps): JSX.Element {
  const monoFont = theme.monoFontFamily ?? "IBM Plex Mono, monospace";

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-3 py-1.5 rounded"
      style={{
        backgroundColor: theme.toolIndicatorBg,
        border: `1px solid ${theme.toolIndicatorBorder}`,
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block w-3 h-3 rounded-full border-2 animate-spin"
        style={{
          borderColor: theme.accentColor,
          borderTopColor: "transparent",
        }}
      />
      <span
        style={{
          fontSize: "12px",
          fontFamily: monoFont,
          color: theme.toolIndicatorText,
        }}
      >
        {labels[toolName] ?? "Working..."}
      </span>
    </div>
  );
}
