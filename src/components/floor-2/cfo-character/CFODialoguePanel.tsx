"use client";

import type { JSX } from "react";
import { AgentDialoguePanel } from "@/components/agents/dialogue/AgentDialoguePanel";
import type {
  AgentDialogueTheme,
  AgentQuickAction,
} from "@/components/agents/dialogue/types";

const QUICK_ACTIONS: AgentQuickAction[] = [
  { label: "Full analytics report", message: "Give me a full analytics report on my pipeline." },
  { label: "Conversion rates", message: "Analyze my conversion rates at each pipeline stage." },
  { label: "What should I improve?", message: "Where is my pipeline weakest right now?" },
];

const TOOL_LABELS: Record<string, string> = {
  analyzeConversionRates: "Analyzing conversion rates...",
  queryApplications: "Querying pipeline data...",
  generateInsight: "Generating insight...",
};

const CFO_THEME: AgentDialogueTheme = {
  backgroundColor: "#050B12",
  panelColor: "#081220",
  borderColor: "rgba(26, 58, 92, 0.9)",
  accentColor: "rgba(60, 140, 220, 0.9)",
  assistantColor: "#E8F4FD",
  userColor: "rgba(60, 140, 220, 0.9)",
  mutedColor: "rgba(74, 122, 155, 0.8)",
  quickActionColor: "rgba(127, 179, 211, 0.9)",
  inputColor: "#E8F4FD",
  inputBackground: "rgba(8, 18, 32, 0.8)",
  closeColor: "rgba(74, 122, 155, 0.8)",
  toolIndicatorBg: "rgba(60, 140, 220, 0.08)",
  toolIndicatorBorder: "rgba(60, 140, 220, 0.2)",
  toolIndicatorText: "rgba(100, 180, 255, 0.9)",
  monoFontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
};

interface CFODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

export function CFODialoguePanel({ isOpen, onClose, onStatusChange }: CFODialoguePanelProps): JSX.Element {
  return (
    <AgentDialoguePanel
      isOpen={isOpen}
      onClose={onClose}
      onStatusChange={onStatusChange}
      chatId="cfo-chat"
      api="/api/cfo"
      dialogAriaLabel="CFO analytics conversation"
      logAriaLabel="Conversation with CFO"
      assistantName="CFO"
      headerTitle="CFO // ANALYTICS REVIEW"
      closeAriaLabel="Close CFO conversation panel"
      placeholder="Ask about your analytics..."
      inputAriaLabel="Message to CFO"
      quickActionsAriaLabel="Quick action shortcuts"
      quickActions={QUICK_ACTIONS}
      toolLabels={TOOL_LABELS}
      theme={CFO_THEME}
      opener={{
        ariaLabel: "Conversation opener",
        label: "CFO",
        labelColor: "rgba(127, 179, 211, 0.8)",
        lines: [
          { text: "Good. You found me at the Observatory.", color: "#E8F4FD", marginTop: 0 },
          {
            text: "The numbers don't lie - I've been watching your pipeline. What do you want to know?",
            color: "rgba(127, 179, 211, 0.8)",
            marginTop: 8,
          },
        ],
      }}
    />
  );
}
