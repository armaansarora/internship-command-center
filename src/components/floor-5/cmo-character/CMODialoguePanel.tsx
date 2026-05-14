"use client";

import type { JSX } from "react";
import { Feather } from "lucide-react";
import { AgentDialoguePanel } from "@/components/agents/dialogue/AgentDialoguePanel";
import type {
  AgentDialogueTheme,
  AgentQuickAction,
} from "@/components/agents/dialogue/types";

interface CMODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

const QUICK_ACTIONS: AgentQuickAction[] = [
  {
    label: "Draft a cover letter",
    message: "Draft a cover letter for my latest application. Make it compelling.",
  },
  {
    label: "Refine my latest draft",
    message: "Review and refine my most recent cover letter draft. What can be improved?",
  },
  {
    label: "What tone for CBRE?",
    message: "What tone should I use for a CBRE real estate internship cover letter?",
  },
  {
    label: "Match letter to role",
    message: "Help me tailor my cover letter to better match the specific job description.",
  },
];

const TOOL_LABELS: Record<string, string> = {
  draftCoverLetter: "Drafting cover letter...",
  refineDraft: "Refining your draft...",
  analyzeTone: "Analyzing tone...",
  queryDocuments: "Checking your documents...",
  queryApplications: "Checking your applications...",
};

const CMO_THEME: AgentDialogueTheme = {
  backgroundColor: "#1A1008",
  panelColor: "#211510",
  borderColor: "#3A2510",
  accentColor: "#C9A84C",
  streamingAccentColor: "#E8A020",
  assistantColor: "#F5E6C8",
  userColor: "#C9A84C",
  mutedColor: "#5A3E20",
  quickActionColor: "#8B6E42",
  inputColor: "#F5E6C8",
  inputBackground: "rgba(33, 21, 16, 0.85)",
  closeColor: "#5A3E20",
  toolIndicatorBg: "rgba(201, 168, 76, 0.08)",
  toolIndicatorBorder: "rgba(201, 168, 76, 0.2)",
  toolIndicatorText: "#E8A020",
  monoFontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
  assistantFontFamily: "Satoshi, system-ui, sans-serif",
};

const QUILL_ACCESSORY = (
  <Feather size={14} strokeWidth={1.4} color="#C9A84C" aria-hidden="true" style={{ opacity: 0.7 }} />
);

export function CMODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: CMODialoguePanelProps): JSX.Element {
  return (
    <AgentDialoguePanel
      isOpen={isOpen}
      onClose={onClose}
      onStatusChange={onStatusChange}
      chatId="cmo-chat"
      api="/api/cmo"
      dialogAriaLabel="CMO cover letter conversation"
      logAriaLabel="Conversation with CMO"
      assistantName="CMO"
      headerTitle="CMO // WRITING STUDIO"
      closeAriaLabel="Close CMO writing studio panel"
      placeholder="Ask about your cover letters..."
      inputAriaLabel="Message to CMO"
      quickActionsAriaLabel="Quick writing action shortcuts"
      quickActions={QUICK_ACTIONS}
      toolLabels={TOOL_LABELS}
      theme={CMO_THEME}
      headerAccessory={QUILL_ACCESSORY}
      streamingCursor={{ width: 2, height: 16, color: "#C9A84C" }}
      opener={{
        ariaLabel: "Conversation opener",
        label: "CMO",
        labelColor: "#7A5C3A",
        lines: [
          { text: "You've caught me mid-draft. Pull up a chair.", color: "#F5E6C8", marginTop: 0 },
          {
            text: "I've read every job description you've saved. Tell me which company, and I'll help you write a letter that actually gets read.",
            color: "#C8A878",
            marginTop: 8,
          },
        ],
      }}
    />
  );
}
