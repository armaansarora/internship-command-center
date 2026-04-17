"use client";

import type { JSX } from "react";
import { AgentDialoguePanel } from "@/components/agents/dialogue/AgentDialoguePanel";
import type {
  AgentDialogueTheme,
  AgentQuickAction,
} from "@/components/agents/dialogue/types";

interface COODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

const QUICK_ACTIONS: AgentQuickAction[] = [
  { label: "What's on my plate today?", message: "Give me a full operations briefing for today." },
  { label: "Show overdue follow-ups", message: "Show me all overdue follow-ups sorted by days overdue." },
  { label: "Draft follow-up emails", message: "Draft follow-up emails for the most overdue applications." },
];

const TOOL_LABELS: Record<string, string> = {
  queryCalendar: "Checking calendar...",
  queryFollowUps: "Scanning follow-ups...",
  draftFollowUp: "Drafting email...",
  queryOutreach: "Reviewing outreach queue...",
  queryEmails: "Reading emails...",
};

const COO_THEME: AgentDialogueTheme = {
  backgroundColor: "#0A0800",
  panelColor: "#120C02",
  borderColor: "#3D2E0A",
  accentColor: "#DC7C28",
  assistantColor: "#FDF3E8",
  userColor: "#DC7C28",
  mutedColor: "#7A5B35",
  quickActionColor: "#C4925A",
  inputColor: "#FDF3E8",
  inputBackground: "rgba(18, 12, 2, 0.8)",
  closeColor: "#7A5B35",
  toolIndicatorBg: "rgba(220, 124, 40, 0.08)",
  toolIndicatorBorder: "rgba(220, 124, 40, 0.2)",
  toolIndicatorText: "#F0A050",
  monoFontFamily: "IBM Plex Mono, monospace",
};

export function COODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: COODialoguePanelProps): JSX.Element {
  return (
    <AgentDialoguePanel
      isOpen={isOpen}
      onClose={onClose}
      onStatusChange={onStatusChange}
      chatId="coo-chat"
      api="/api/coo"
      dialogAriaLabel="COO operations briefing conversation"
      logAriaLabel="Conversation with COO Dylan Shorts"
      assistantName="COO"
      headerTitle="COO // OPERATIONS BRIEFING"
      closeAriaLabel="Close COO conversation panel"
      placeholder="Ask about deadlines, follow-ups..."
      inputAriaLabel="Message to COO Dylan Shorts"
      quickActionsAriaLabel="Quick action shortcuts"
      quickActions={QUICK_ACTIONS}
      toolLabels={TOOL_LABELS}
      theme={COO_THEME}
      opener={{
        ariaLabel: "COO opening statement",
        label: "COO - DYLAN SHORTS",
        labelColor: "#C4925A",
        lines: [
          { text: "Morning. Two things on your plate today.", color: "#FDF3E8", marginTop: 0 },
          {
            text: "I've already got eyes on your calendar and follow-up queue - ask me anything, or let me run the brief.",
            color: "#C4925A",
            marginTop: 8,
          },
        ],
      }}
    />
  );
}
