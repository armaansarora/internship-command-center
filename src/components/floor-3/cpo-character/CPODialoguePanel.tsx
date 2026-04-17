"use client";

import type { JSX } from "react";
import { AgentDialoguePanel } from "@/components/agents/dialogue/AgentDialoguePanel";
import type {
  AgentDialogueTheme,
  AgentQuickAction,
} from "@/components/agents/dialogue/types";

interface CPODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

const QUICK_ACTIONS: AgentQuickAction[] = [
  {
    label: "Prep me for my next interview",
    message: "Prep me for my next upcoming interview. What should I know and how should I prepare?",
  },
  {
    label: "Blackstone questions",
    message: "What questions should I expect at Blackstone? Give me a full breakdown by category.",
  },
  {
    label: "CBRE briefing packet",
    message: "Generate a full briefing packet for CBRE - company overview, likely questions, talking points, and interviewer intel.",
  },
];

const TOOL_LABELS: Record<string, string> = {
  queryInterviews: "Checking interview schedule...",
  getPrepPacket: "Loading prep materials...",
  generateBriefing: "Generating briefing packet...",
  analyzeCompany: "Researching company...",
  searchQuestions: "Finding likely questions...",
};

const CPO_THEME: AgentDialogueTheme = {
  backgroundColor: "#060A12",
  panelColor: "#090F1C",
  borderColor: "#1A2E4A",
  accentColor: "#4A9EDB",
  assistantColor: "#E8F4FD",
  userColor: "#4A9EDB",
  mutedColor: "#4A6A85",
  quickActionColor: "#8BAECB",
  inputColor: "#E8F4FD",
  inputBackground: "rgba(9, 15, 28, 0.8)",
  closeColor: "#4A6A85",
  toolIndicatorBg: "rgba(74, 158, 219, 0.07)",
  toolIndicatorBorder: "rgba(74, 158, 219, 0.2)",
  toolIndicatorText: "#7EC8E3",
  monoFontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
};

export function CPODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: CPODialoguePanelProps): JSX.Element {
  return (
    <AgentDialoguePanel
      isOpen={isOpen}
      onClose={onClose}
      onStatusChange={onStatusChange}
      chatId="cpo-chat"
      api="/api/cpo"
      dialogAriaLabel="CPO interview preparation briefing"
      logAriaLabel="Conversation with CPO"
      assistantName="CPO"
      headerTitle="CPO // INTERVIEW PREP"
      closeAriaLabel="Close CPO briefing panel"
      placeholder="Ask about interview prep..."
      inputAriaLabel="Message to CPO"
      quickActionsAriaLabel="Quick briefing shortcuts"
      quickActions={QUICK_ACTIONS}
      toolLabels={TOOL_LABELS}
      theme={CPO_THEME}
      opener={{
        ariaLabel: "Opening message from CPO",
        label: "CPO",
        labelColor: "#8BAECB",
        lines: [
          {
            text: "You caught me at the whiteboard. I've been reviewing your interview schedule.",
            color: "#E8F4FD",
            marginTop: 0,
          },
          {
            text: "Pick a company, a round, or a question type - I'll run the brief.",
            color: "#8BAECB",
            marginTop: 8,
          },
        ],
      }}
    />
  );
}
