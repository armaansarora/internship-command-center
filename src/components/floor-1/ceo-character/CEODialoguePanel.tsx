"use client";

import type { JSX } from "react";
import type { ChatStatus, UIMessage } from "ai";
import { AgentDialoguePanel } from "@/components/agents/dialogue/AgentDialoguePanel";
import type {
  AgentDialogueTheme,
  AgentQuickAction,
} from "@/components/agents/dialogue/types";

const QUICK_ACTIONS: AgentQuickAction[] = [
  { label: "Morning briefing", message: "Good morning. Give me my morning briefing." },
  { label: "Full pipeline overview", message: "Give me a full overview of my pipeline and agent status." },
  {
    label: "What needs my attention?",
    message: "What's the single most important thing I should focus on today?",
  },
];

const TOOL_LABELS: Record<string, string> = {
  // Orchestrator dispatch tools (real subagent invocations via
  // `buildCEODispatchTools`). Each runs a nested generateText call.
  dispatchToCRO: "CRO analyzing pipeline...",
  dispatchToCOO: "COO reviewing operations...",
  dispatchToCNO: "CNO surveying network...",
  dispatchToCIO: "CIO fetching intelligence...",
  dispatchToCMO: "CMO reviewing content...",
  dispatchToCPO: "CPO checking strategy...",
  dispatchToCFO: "CFO running analytics...",
  // CEO's own tools.
  compileBriefing: "Compiling executive briefing...",
  queryAllPipeline: "Querying pipeline...",
  getRecentActivity: "Scanning recent activity...",
  getDailyBriefingData: "Compiling daily briefing...",
};

const CEO_THEME: AgentDialogueTheme = {
  backgroundColor: "#0A0803",
  panelColor: "#120F07",
  borderColor: "rgba(61, 48, 16, 0.9)",
  accentColor: "rgba(201, 168, 76, 0.9)",
  assistantColor: "#F5E8C0",
  userColor: "rgba(201, 168, 76, 0.9)",
  mutedColor: "rgba(107, 83, 32, 0.9)",
  quickActionColor: "rgba(184, 146, 74, 0.9)",
  inputColor: "#F5E8C0",
  inputBackground: "rgba(10, 8, 3, 0.85)",
  closeColor: "rgba(107, 83, 32, 0.9)",
  toolIndicatorBg: "rgba(201, 168, 76, 0.06)",
  toolIndicatorBorder: "rgba(201, 168, 76, 0.2)",
  toolIndicatorText: "rgba(201, 168, 76, 0.9)",
  monoFontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
};

function BriefingRenderer({ content }: { content: string }): JSX.Element {
  if (content.includes("##") || content.includes("**")) {
    const lines = content.split("\n");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {lines.map((line, index) => {
          if (line.startsWith("## ")) {
            return (
              <div
                key={`${line}-${index}`}
                style={{
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                  color: "rgba(201, 168, 76, 0.9)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid rgba(201, 168, 76, 0.15)",
                  paddingBottom: "2px",
                  marginTop: "6px",
                }}
              >
                {line.replace("## ", "")}
              </div>
            );
          }
          if (line.startsWith("**") && line.endsWith("**")) {
            return (
              <div key={`${line}-${index}`} style={{ fontSize: "13px", color: "rgba(245, 232, 192, 0.95)", fontWeight: 600 }}>
                {line.replace(/\*\*/g, "")}
              </div>
            );
          }
          if (line.startsWith("- ") || line.startsWith("• ")) {
            return (
              <div key={`${line}-${index}`} style={{ fontSize: "13px", color: "#E8F4FD", paddingLeft: "12px", lineHeight: 1.6 }}>
                {line}
              </div>
            );
          }
          if (line.trim() === "") {
            return <div key={`blank-${index}`} style={{ height: "4px" }} />;
          }
          return (
            <div key={`${line}-${index}`} style={{ fontSize: "13px", color: "#E8F4FD", lineHeight: 1.65 }}>
              {line}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ fontSize: "14px", color: "#E8F4FD", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {content}
    </div>
  );
}

interface CEODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
  /**
   * Called whenever the chat's messages or status change. Used by the parent
   * CSuiteClient to drive the Ring-the-Bell agent progress cards from real
   * subagent dispatch activity (tool-{name} parts on assistant messages).
   */
  onChatActivity?: (activity: {
    messages: UIMessage[];
    status: ChatStatus;
  }) => void;
}

export function CEODialoguePanel({
  isOpen,
  onClose,
  initialMessage,
  onStatusChange,
  onChatActivity,
}: CEODialoguePanelProps): JSX.Element {
  return (
    <AgentDialoguePanel
      isOpen={isOpen}
      onClose={onClose}
      onStatusChange={onStatusChange}
      onChatActivity={onChatActivity}
      chatId="ceo-chat"
      api="/api/ceo"
      dialogAriaLabel="CEO executive briefing"
      logAriaLabel="Executive briefing conversation"
      assistantName="CEO"
      headerTitle="CEO // EXECUTIVE BRIEFING"
      closeAriaLabel="Close CEO briefing panel"
      placeholder="Speak to the CEO..."
      inputAriaLabel="Message to CEO"
      quickActionsAriaLabel="Quick action shortcuts"
      quickActions={QUICK_ACTIONS}
      toolLabels={TOOL_LABELS}
      theme={CEO_THEME}
      initialMessage={initialMessage}
      renderAssistantContent={(content) => <BriefingRenderer content={content} />}
      opener={{
        label: "CEO",
        labelColor: "rgba(107, 83, 32, 0.9)",
        lines: [
          { text: "You have my attention.", color: "#F5E8C0", marginTop: 0 },
          {
            text: "Ring the bell and I'll have a full briefing from all departments. Or ask me anything directly.",
            color: "rgba(184, 146, 74, 0.8)",
            marginTop: 8,
          },
        ],
      }}
    />
  );
}
