"use client";

import type { JSX } from "react";
import { AgentDialoguePanel } from "@/components/agents/dialogue/AgentDialoguePanel";
import type {
  AgentDialogueTheme,
  AgentQuickAction,
} from "@/components/agents/dialogue/types";

interface CNODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

const QUICK_ACTIONS: AgentQuickAction[] = [
  { label: "How's my network?", message: "Give me a full network health briefing." },
  {
    label: "Who's going cold?",
    message: "Show me contacts that are cooling off or going cold. Who needs attention?",
  },
  {
    label: "Suggest outreach",
    message: "Which contacts should I reach out to this week? Help me draft a quick message.",
  },
];

const TOOL_LABELS: Record<string, string> = {
  queryContacts: "Checking network...",
  getContactStats: "Analyzing warmth...",
  logContactActivity: "Logging interaction...",
  findColdContacts: "Scanning cold contacts...",
  suggestOutreach: "Drafting outreach...",
};

const CNO_THEME: AgentDialogueTheme = {
  backgroundColor: "#1A0F05",
  panelColor: "#231508",
  borderColor: "#5C3A1E",
  accentColor: "#C9A84C",
  assistantColor: "#FDF3E8",
  userColor: "#C9A84C",
  mutedColor: "#7A5B35",
  quickActionColor: "#C4925A",
  inputColor: "#FDF3E8",
  inputBackground: "rgba(35, 21, 8, 0.8)",
  closeColor: "#7A5B35",
  toolIndicatorBg: "rgba(201, 168, 76, 0.08)",
  toolIndicatorBorder: "rgba(201, 168, 76, 0.2)",
  toolIndicatorText: "#E8C87A",
  monoFontFamily: "IBM Plex Mono, monospace",
};

export function CNODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: CNODialoguePanelProps): JSX.Element {
  return (
    <AgentDialoguePanel
      isOpen={isOpen}
      onClose={onClose}
      onStatusChange={onStatusChange}
      chatId="cno-chat"
      api="/api/cno"
      dialogAriaLabel="CNO networking conversation"
      logAriaLabel="Conversation with CNO"
      assistantName="CNO"
      headerTitle="CNO // NETWORK REVIEW"
      closeAriaLabel="Close CNO conversation panel"
      placeholder="Ask about your network..."
      inputAriaLabel="Message to CNO"
      quickActionsAriaLabel="Quick action shortcuts"
      quickActions={QUICK_ACTIONS}
      toolLabels={TOOL_LABELS}
      theme={CNO_THEME}
      messageAreaClassName="lounge-scroll"
      opener={{
        ariaLabel: "Conversation opener",
        label: "CNO",
        labelColor: "#7A5B35",
        lines: [
          { text: "Glad you dropped by. Pull up a chair.", color: "#FDF3E8", marginTop: 0 },
          {
            text: "I've got eyes on your whole network - who's warm, who's cooling, and who we're about to lose.",
            color: "#C4925A",
            marginTop: 8,
          },
        ],
      }}
    />
  );
}
