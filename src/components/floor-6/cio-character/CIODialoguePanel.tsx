"use client";

import type { JSX } from "react";
import { AgentDialoguePanel } from "@/components/agents/dialogue/AgentDialoguePanel";
import type {
  AgentDialogueTheme,
  AgentQuickAction,
} from "@/components/agents/dialogue/types";

interface CIODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

const QUICK_ACTIONS: AgentQuickAction[] = [
  {
    label: "Research top companies",
    message: "Research my top target companies and give me a briefing on each.",
  },
  {
    label: "Find stale research",
    message: "Show me companies where my research is outdated or missing - more than 2 weeks old.",
  },
  {
    label: "Competitive landscape",
    message: "Analyze the competitive landscape for the companies I'm targeting and identify patterns.",
  },
];

const TOOL_LABELS: Record<string, string> = {
  researchCompany: "Researching company...",
  queryCompanies: "Scanning company database...",
  searchCompanyIntel: "Searching intelligence...",
  updateCompanyResearch: "Updating research notes...",
  findSimilarCompanies: "Finding similar companies...",
};

const CIO_THEME: AgentDialogueTheme = {
  backgroundColor: "#060D16",
  panelColor: "#0D1B2A",
  borderColor: "#1E3A5F",
  accentColor: "#3B82F6",
  assistantColor: "#E2E8F0",
  userColor: "#60A5FA",
  mutedColor: "#1E3A5F",
  quickActionColor: "#60A5FA",
  inputColor: "#E2E8F0",
  inputBackground: "rgba(6, 13, 22, 0.8)",
  closeColor: "#1E3A5F",
  toolIndicatorBg: "rgba(59, 130, 246, 0.08)",
  toolIndicatorBorder: "rgba(59, 130, 246, 0.2)",
  toolIndicatorText: "#60A5FA",
  monoFontFamily: "IBM Plex Mono, monospace",
};

export function CIODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: CIODialoguePanelProps): JSX.Element {
  return (
    <AgentDialoguePanel
      isOpen={isOpen}
      onClose={onClose}
      onStatusChange={onStatusChange}
      chatId="cio-chat"
      api="/api/cio"
      dialogAriaLabel="CIO research intelligence conversation"
      logAriaLabel="Conversation with CIO"
      assistantName="CIO"
      headerTitle="CIO // RESEARCH INTELLIGENCE"
      closeAriaLabel="Close CIO conversation panel"
      placeholder="Ask about companies, research, intel..."
      inputAriaLabel="Message to CIO Chief Intelligence Officer"
      quickActionsAriaLabel="Quick action shortcuts"
      quickActions={QUICK_ACTIONS}
      toolLabels={TOOL_LABELS}
      theme={CIO_THEME}
      opener={{
        ariaLabel: "CIO opening statement",
        label: "CIO - CHIEF INTELLIGENCE OFFICER",
        labelColor: "#60A5FA",
        lines: [
          {
            text: "I've been mapping your target companies. Some research is getting stale.",
            color: "#E2E8F0",
            marginTop: 0,
          },
          {
            text: "Tell me which companies to dig into, or let me surface the ones that need attention first.",
            color: "#93C5FD",
            marginTop: 8,
          },
        ],
      }}
    />
  );
}
