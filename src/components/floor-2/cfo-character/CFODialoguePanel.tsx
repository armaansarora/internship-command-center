"use client";

import type { JSX } from "react";
import { useEffect, useRef, useCallback } from "react";
import type { UIMessage, UIMessagePart, UIDataTypes, UITools, DynamicToolUIPart } from "ai";
import { isTextUIPart, isToolUIPart, getToolName } from "ai";
import { useCFOChat } from "@/hooks/useCFOChat";

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------
const QUICK_ACTIONS = [
  { label: "Full analytics report",  message: "Give me a full analytics report on my pipeline." },
  { label: "Conversion rates",       message: "Analyze my conversion rates at each pipeline stage." },
  { label: "What should I improve?", message: "Where is my pipeline weakest right now?" },
];

// ---------------------------------------------------------------------------
// Tool call indicator
// ---------------------------------------------------------------------------
function ToolCallIndicator({ toolName }: { toolName: string }): JSX.Element {
  const labels: Record<string, string> = {
    analyzeConversionRates: "Analyzing conversion rates...",
    queryApplications:      "Querying pipeline data...",
    generateInsight:        "Generating insight...",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-3 py-1.5 rounded"
      style={{
        background: "rgba(60, 140, 220, 0.08)",
        border: "1px solid rgba(60, 140, 220, 0.2)",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block w-3 h-3 rounded-full border-2 animate-spin"
        style={{ borderColor: "rgba(60, 140, 220, 0.9)", borderTopColor: "transparent" }}
      />
      <span style={{ fontSize: "12px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(100, 180, 255, 0.9)" }}>
        {labels[toolName] ?? "Analyzing..."}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({
  role, content, parts,
}: {
  role: string;
  content: string;
  parts?: Array<UIMessagePart<UIDataTypes, UITools>>;
}): JSX.Element {
  const toolInvocations = parts
    ?.filter((p): p is DynamicToolUIPart => isToolUIPart(p as UIMessagePart<UIDataTypes, UITools>))
    .map((p) => ({ toolName: getToolName(p), state: p.state }));
  const isUser = role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1.5`}>
      {!isUser && toolInvocations
        ?.filter((t) => t.state === "input-streaming" || t.state === "input-available")
        .map((t, i) => <ToolCallIndicator key={i} toolName={t.toolName} />)}

      {content && (
        <div
          role="article"
          aria-label={isUser ? "Your message" : "CFO response"}
          className="max-w-prose leading-relaxed"
          style={{
            color: isUser ? "rgba(60, 140, 220, 0.9)" : "#E8F4FD",
            fontSize: "14px",
            lineHeight: 1.65,
            fontFamily: isUser ? "JetBrains Mono, IBM Plex Mono, monospace" : "inherit",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------
interface CFODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

export function CFODialoguePanel({ isOpen, onClose, onStatusChange }: CFODialoguePanelProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status, setInput } = useCFOChat({
    id: "cfo-chat",
    api: "/api/cfo",
  });

  useEffect(() => {
    if (status === "streaming")  onStatusChange?.("talking");
    else if (status === "submitted") onStatusChange?.("thinking");
    else                         onStatusChange?.("idle");
  }, [status, onStatusChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleQuickAction = useCallback((message: string) => {
    setInput(message);
    setTimeout(() => {
      const form = document.getElementById("cfo-chat-form") as HTMLFormElement | null;
      form?.requestSubmit();
    }, 0);
  }, [setInput]);

  const isStreaming = status === "streaming" || status === "submitted";

  const accentColor = "rgba(60, 140, 220, 0.9)";
  const borderColor = "rgba(26, 58, 92, 0.9)";
  const bgDeep = "#050B12";
  const bgPanel = "#081220";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CFO analytics conversation"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        backgroundColor: bgDeep,
        borderLeft: `1px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid ${borderColor}`, backgroundColor: bgPanel }}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
          <span style={{ fontSize: "13px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "#E8F4FD", letterSpacing: "0.06em" }}>
            CFO // ANALYTICS REVIEW
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close CFO conversation panel"
          className="flex items-center justify-center w-7 h-7 rounded focus-visible:outline focus-visible:outline-2"
          style={{ color: "rgba(74, 122, 155, 0.8)", background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-label="Conversation with CFO"
        aria-live="polite"
        className="overflow-y-auto px-5 py-4 flex flex-col gap-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: `${borderColor} ${bgDeep}` }}
      >
        {messages.length === 0 && (
          <div aria-label="Conversation opener">
            <p className="mb-1" style={{ color: "rgba(127, 179, 211, 0.8)", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", fontSize: "11px" }}>
              CFO
            </p>
            <p style={{ color: "#E8F4FD", fontSize: "14px", lineHeight: 1.65 }}>
              Good. You found me at the Observatory.
            </p>
            <p className="mt-2" style={{ color: "rgba(127, 179, 211, 0.8)", fontSize: "14px", lineHeight: 1.65 }}>
              The numbers don&apos;t lie — I&apos;ve been watching your pipeline. What do you want to know?
            </p>
          </div>
        )}

        {messages.map((msg: UIMessage) => {
          const textContent = Array.isArray(msg.parts)
            ? msg.parts.filter(isTextUIPart).map((p) => p.text).join("")
            : "";
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              <span aria-hidden="true" style={{ fontSize: "10px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(74, 122, 155, 0.8)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {msg.role === "user" ? "YOU" : "CFO"}
              </span>
              <MessageBubble
                role={msg.role}
                content={textContent}
                parts={msg.parts as Array<UIMessagePart<UIDataTypes, UITools>> | undefined}
              />
            </div>
          );
        })}

        {isStreaming && (
          <div role="status" aria-label="CFO is responding" aria-live="polite" className="flex items-center gap-2">
            <span
              aria-hidden="true"
              style={{ width: "8px", height: "16px", background: accentColor, display: "inline-block", animation: "cfo-blink 1s step-start infinite", opacity: 0.8 }}
            />
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="px-5 py-2 flex flex-wrap gap-2" style={{ borderTop: `1px solid ${borderColor}` }} role="group" aria-label="Quick action shortcuts">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action.message)}
              disabled={isStreaming}
              aria-label={`Quick action: ${action.label}`}
              className="px-3 py-1.5 rounded text-xs transition-colors focus-visible:outline focus-visible:outline-2"
              style={{
                fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                fontSize: "11px",
                color: "rgba(127, 179, 211, 0.9)",
                background: "rgba(60, 140, 220, 0.06)",
                border: `1px solid ${borderColor}`,
                cursor: isStreaming ? "not-allowed" : "pointer",
                opacity: isStreaming ? 0.5 : 1,
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        id="cfo-chat-form"
        onSubmit={handleSubmit}
        className="px-4 py-3 flex gap-2 items-center"
        style={{ borderTop: `1px solid ${borderColor}` }}
        aria-label="Send message to CFO"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about your analytics..."
          disabled={isStreaming}
          aria-label="Message to CFO"
          className="flex-1 bg-transparent rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            fontSize: "13px",
            color: "#E8F4FD",
            border: `1px solid ${borderColor}`,
            background: "rgba(8, 18, 32, 0.8)",
            caretColor: accentColor,
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send message"
          className="px-4 py-2 rounded transition-colors focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            fontSize: "12px",
            color: isStreaming || !input.trim() ? "rgba(74, 122, 155, 0.6)" : accentColor,
            background: "rgba(60, 140, 220, 0.08)",
            border: `1px solid ${borderColor}`,
            cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          SEND
        </button>
      </form>

      <style>{`
        @keyframes cfo-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
