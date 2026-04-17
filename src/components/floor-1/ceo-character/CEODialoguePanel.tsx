"use client";

import type { JSX } from "react";
import { useEffect, useRef, useCallback } from "react";
import type { UIMessage, UIMessagePart, UIDataTypes, UITools, DynamicToolUIPart } from "ai";
import { isTextUIPart, isToolUIPart, getToolName } from "ai";
import { useAgentChat } from "@/hooks/useAgentChat";

const QUICK_ACTIONS = [
  { label: "Morning briefing",         message: "Good morning. Give me my morning briefing." },
  { label: "Full pipeline overview",   message: "Give me a full overview of my pipeline and agent status." },
  { label: "What needs my attention?", message: "What's the single most important thing I should focus on today?" },
];

// ---------------------------------------------------------------------------
// Section parser — render structured briefing sections
// ---------------------------------------------------------------------------
function BriefingRenderer({ content }: { content: string }): JSX.Element {
  // Check if content looks like a structured briefing (has ## headers)
  if (content.includes("##") || content.includes("**")) {
    const lines = content.split("\n");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {lines.map((line, i) => {
          if (line.startsWith("## ")) {
            return (
              <div
                key={i}
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
              <div key={i} style={{ fontSize: "13px", color: "rgba(245, 232, 192, 0.95)", fontWeight: 600 }}>
                {line.replace(/\*\*/g, "")}
              </div>
            );
          }
          if (line.startsWith("- ") || line.startsWith("• ")) {
            return (
              <div key={i} style={{ fontSize: "13px", color: "#E8F4FD", paddingLeft: "12px", lineHeight: 1.6 }}>
                {line}
              </div>
            );
          }
          if (line.trim() === "") return <div key={i} style={{ height: "4px" }} />;
          return (
            <div key={i} style={{ fontSize: "13px", color: "#E8F4FD", lineHeight: 1.65 }}>
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

// ---------------------------------------------------------------------------
// Tool indicator
// ---------------------------------------------------------------------------
function ToolCallIndicator({ toolName }: { toolName: string }): JSX.Element {
  const labels: Record<string, string> = {
    runCROBriefing:   "CRO analyzing pipeline...",
    runCOOBriefing:   "COO reviewing operations...",
    runCNOBriefing:   "CNO surveying network...",
    runCIOBriefing:   "CIO fetching intelligence...",
    runCMOBriefing:   "CMO reviewing content...",
    runCPOBriefing:   "CPO checking strategy...",
    compileBriefing:  "Compiling executive briefing...",
    queryApplications: "Querying pipeline...",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-3 py-1.5 rounded"
      style={{ background: "rgba(201, 168, 76, 0.06)", border: "1px solid rgba(201, 168, 76, 0.2)" }}
    >
      <span
        aria-hidden="true"
        className="inline-block w-3 h-3 rounded-full border-2 animate-spin"
        style={{ borderColor: "rgba(201, 168, 76, 0.9)", borderTopColor: "transparent" }}
      />
      <span style={{ fontSize: "12px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(201, 168, 76, 0.9)" }}>
        {labels[toolName] ?? "Working..."}
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
          aria-label={isUser ? "Your message" : "CEO response"}
          className="max-w-prose"
          style={{ color: isUser ? "rgba(201, 168, 76, 0.9)" : undefined }}
        >
          {isUser ? (
            <div style={{ fontSize: "14px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", lineHeight: 1.65 }}>
              {content}
            </div>
          ) : (
            <BriefingRenderer content={content} />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------
interface CEODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill with ring-the-bell briefing */
  initialMessage?: string;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

export function CEODialoguePanel({ isOpen, onClose, initialMessage, onStatusChange }: CEODialoguePanelProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialSentRef = useRef(false);

  const { messages, input, handleInputChange, handleSubmit, status, setInput } = useAgentChat({
    id: "ceo-chat",
    api: "/api/ceo",
  });

  useEffect(() => {
    if (status === "streaming")       onStatusChange?.("talking");
    else if (status === "submitted")  onStatusChange?.("thinking");
    else                              onStatusChange?.("idle");
  }, [status, onStatusChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  // Auto-send initialMessage if provided (ring the bell)
  useEffect(() => {
    if (isOpen && initialMessage && !initialSentRef.current && messages.length === 0) {
      initialSentRef.current = true;
      setInput(initialMessage);
      setTimeout(() => {
        const form = document.getElementById("ceo-chat-form") as HTMLFormElement | null;
        form?.requestSubmit();
      }, 100);
    }
  }, [isOpen, initialMessage, messages.length, setInput]);

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
      const form = document.getElementById("ceo-chat-form") as HTMLFormElement | null;
      form?.requestSubmit();
    }, 0);
  }, [setInput]);

  const isStreaming = status === "streaming" || status === "submitted";

  const goldAccent = "rgba(201, 168, 76, 0.9)";
  const borderColor = "rgba(61, 48, 16, 0.9)";
  const bgDeep = "#0A0803";
  const bgPanel = "#120F07";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CEO executive briefing"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        background: bgDeep,
        borderLeft: `1px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${borderColor}`, background: bgPanel }}>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: goldAccent, boxShadow: `0 0 6px ${goldAccent}` }} />
          <span style={{ fontSize: "13px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "#F5E8C0", letterSpacing: "0.06em" }}>
            CEO // EXECUTIVE BRIEFING
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close CEO briefing panel"
          className="flex items-center justify-center w-7 h-7 rounded focus-visible:outline focus-visible:outline-2"
          style={{ color: "rgba(107, 83, 32, 0.9)", background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-label="Executive briefing conversation"
        aria-live="polite"
        className="overflow-y-auto px-5 py-4 flex flex-col gap-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: `${borderColor} ${bgDeep}` }}
      >
        {messages.length === 0 && (
          <div>
            <p className="mb-1" style={{ color: "rgba(107, 83, 32, 0.9)", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", fontSize: "11px" }}>
              CEO
            </p>
            <p style={{ color: "#F5E8C0", fontSize: "14px", lineHeight: 1.65 }}>
              You have my attention.
            </p>
            <p className="mt-2" style={{ color: "rgba(184, 146, 74, 0.8)", fontSize: "14px", lineHeight: 1.65 }}>
              Ring the bell and I&apos;ll have a full briefing from all departments. Or ask me anything directly.
            </p>
          </div>
        )}

        {messages.map((msg: UIMessage) => {
          const textContent = Array.isArray(msg.parts)
            ? msg.parts.filter(isTextUIPart).map((p) => p.text).join("")
            : "";
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              <span aria-hidden="true" style={{ fontSize: "10px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(107, 83, 32, 0.9)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {msg.role === "user" ? "YOU" : "CEO"}
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
          <div role="status" aria-label="CEO is responding" aria-live="polite" className="flex items-center gap-2">
            <span
              aria-hidden="true"
              style={{ width: "8px", height: "16px", background: goldAccent, display: "inline-block", animation: "ceo-blink 1s step-start infinite", opacity: 0.8 }}
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
              className="px-3 py-1.5 rounded text-xs focus-visible:outline focus-visible:outline-2"
              style={{
                fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                fontSize: "11px",
                color: "rgba(184, 146, 74, 0.9)",
                background: "rgba(201, 168, 76, 0.06)",
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
        id="ceo-chat-form"
        onSubmit={handleSubmit}
        className="px-4 py-3 flex gap-2 items-center"
        style={{ borderTop: `1px solid ${borderColor}` }}
        aria-label="Send message to CEO"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Speak to the CEO..."
          disabled={isStreaming}
          aria-label="Message to CEO"
          className="flex-1 bg-transparent rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            fontSize: "13px",
            color: "#F5E8C0",
            border: `1px solid ${borderColor}`,
            background: "rgba(10, 8, 3, 0.85)",
            caretColor: goldAccent,
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send message"
          className="px-4 py-2 rounded focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            fontSize: "12px",
            color: isStreaming || !input.trim() ? "rgba(107, 83, 32, 0.7)" : goldAccent,
            background: "rgba(201, 168, 76, 0.06)",
            border: `1px solid ${borderColor}`,
            cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          SEND
        </button>
      </form>

      <style>{`
        @keyframes ceo-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
