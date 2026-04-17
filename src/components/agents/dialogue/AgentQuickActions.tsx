"use client";

import type { JSX } from "react";
import type { AgentDialogueTheme, AgentQuickAction } from "./types";

interface AgentQuickActionsProps {
  actions: AgentQuickAction[];
  isStreaming: boolean;
  onSelect: (message: string) => void;
  ariaLabel: string;
  theme: AgentDialogueTheme;
}

export function AgentQuickActions({
  actions,
  isStreaming,
  onSelect,
  ariaLabel,
  theme,
}: AgentQuickActionsProps): JSX.Element {
  const monoFont = theme.monoFontFamily ?? "IBM Plex Mono, monospace";

  return (
    <div
      className="px-5 py-2 flex flex-wrap gap-2"
      style={{ borderTop: `1px solid ${theme.borderColor}` }}
      role="group"
      aria-label={ariaLabel}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => onSelect(action.message)}
          disabled={isStreaming}
          aria-label={`Quick action: ${action.label}`}
          className="px-3 py-1.5 rounded text-xs transition-colors focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: monoFont,
            fontSize: "11px",
            color: theme.quickActionColor,
            backgroundColor: theme.toolIndicatorBg,
            border: `1px solid ${theme.borderColor}`,
            cursor: isStreaming ? "not-allowed" : "pointer",
            opacity: isStreaming ? 0.5 : 1,
            outlineColor: theme.accentColor,
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
