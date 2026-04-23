"use client";

import type { JSX } from "react";
import { AgentDialoguePanel } from "@/components/agents/dialogue/AgentDialoguePanel";
import type {
  AgentDialogueTheme,
  AgentQuickAction,
} from "@/components/agents/dialogue/types";

interface CRODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

const QUICK_ACTIONS: AgentQuickAction[] = [
  {
    label: "Declare my targets",
    message:
      "I want to set my targets so the hunt can start. Ask me the short brief.",
  },
  { label: "How's my pipeline?", message: "Give me a full pipeline briefing." },
  {
    label: "Show stale apps",
    message: "Show me all stale applications sorted by days since last activity.",
  },
  {
    label: "Suggest follow-ups",
    message: "Which applications need a follow-up right now? Draft the emails.",
  },
];

const TOOL_LABELS: Record<string, string> = {
  queryApplications: "Checking pipeline...",
  manageApplication: "Updating application...",
  suggestFollowUp: "Drafting follow-up...",
  analyzeConversionRates: "Running conversion analysis...",
  captureTargetProfile: "Recording target profile...",
};

const CRO_THEME: AgentDialogueTheme = {
  backgroundColor: "#060B14",
  panelColor: "#0A1628",
  borderColor: "#1E3A5F",
  accentColor: "#1E90FF",
  assistantColor: "#E8F4FD",
  userColor: "#1E90FF",
  mutedColor: "#4A7A9B",
  quickActionColor: "#7FB3D3",
  inputColor: "#E8F4FD",
  inputBackground: "rgba(10, 22, 40, 0.8)",
  closeColor: "#4A7A9B",
  toolIndicatorBg: "rgba(30, 144, 255, 0.08)",
  toolIndicatorBorder: "rgba(30, 144, 255, 0.2)",
  toolIndicatorText: "#00D4FF",
  monoFontFamily: "IBM Plex Mono, monospace",
};

export function CRODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: CRODialoguePanelProps): JSX.Element {
  return (
    <AgentDialoguePanel
      isOpen={isOpen}
      onClose={onClose}
      onStatusChange={onStatusChange}
      chatId="cro-chat"
      api="/api/cro"
      dialogAriaLabel="CRO pipeline conversation"
      logAriaLabel="Conversation with CRO"
      assistantName="CRO"
      headerTitle="CRO // PIPELINE REVIEW"
      closeAriaLabel="Close CRO conversation panel"
      placeholder="Ask about your pipeline..."
      inputAriaLabel="Message to CRO"
      quickActionsAriaLabel="Quick action shortcuts"
      quickActions={QUICK_ACTIONS}
      toolLabels={TOOL_LABELS}
      theme={CRO_THEME}
      opener={{
        ariaLabel: "Conversation opener",
        label: "CRO",
        labelColor: "#7FB3D3",
        lines: [
          { text: "You caught me at the whiteboard. Pull up a chair.", color: "#E8F4FD", marginTop: 0 },
          {
            text: "I've got eyes on your pipeline - ask me anything, or let me run the numbers.",
            color: "#7FB3D3",
            marginTop: 8,
          },
        ],
      }}
    />
  );
}
