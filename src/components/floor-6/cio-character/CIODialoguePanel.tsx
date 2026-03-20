"use client";

import type { JSX } from "react";
import { useEffect, useRef, useCallback } from "react";
import type {
  UIMessage,
  UIMessagePart,
  UIDataTypes,
  UITools,
  DynamicToolUIPart,
} from "ai";
import { isTextUIPart, isToolUIPart, getToolName } from "ai";
import { useCIOChat } from "@/hooks/useCIOChat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CIODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

// ---------------------------------------------------------------------------
// Quick action buttons — CIO / intelligence research focused
// ---------------------------------------------------------------------------
const QUICK_ACTIONS = [
  {
    label: "Research top companies",
    message: "Research my top target companies and give me a briefing on each.",
  },
  {
    label: "Find stale research",
    message:
      "Show me companies where my research is outdated or missing — more than 2 weeks old.",
  },
  {
    label: "Competitive landscape",
    message:
      "Analyze the competitive landscape for the companies I'm targeting and identify patterns.",
  },
] as const;

// ---------------------------------------------------------------------------
// Tool call indicator — blue/silver research scheme
// ---------------------------------------------------------------------------
function ToolCallIndicator({ toolName }: { toolName: string }): JSX.Element {
  const labels: Record<string, string> = {
    researchCompany: "Researching company...",
    queryCompanies: "Scanning company database...",
    searchCompanyIntel: "Searching intelligence...",
    updateCompanyResearch: "Updating research notes...",
    findSimilarCompanies: "Finding similar companies...",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-3 py-1.5 rounded"
      style={{
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        border: "1px solid rgba(59, 130, 246, 0.2)",
      }}
    >
      {/* Spinner */}
      <span
        aria-hidden="true"
        className="inline-block w-3 h-3 rounded-full border-2 animate-spin"
        style={{
          borderColor: "#3B82F6",
          borderTopColor: "transparent",
        }}
      />
      <span
        style={{
          fontSize: "12px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#60A5FA",
        }}
      >
        {labels[toolName] ?? "Analyzing..."}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble — blue/silver intelligence scheme
// ---------------------------------------------------------------------------
function MessageBubble({
  role,
  content,
  parts,
}: {
  role: string;
  content: string;
  parts?: Array<UIMessagePart<UIDataTypes, UITools>>;
}): JSX.Element {
  const toolInvocations = parts
    ?.filter(
      (p): p is DynamicToolUIPart =>
        isToolUIPart(p as UIMessagePart<UIDataTypes, UITools>)
    )
    .map((p) => ({ toolName: getToolName(p), state: p.state }));
  const isUser = role === "user";

  return (
    <div
      className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1.5`}
    >
      {/* Tool call indicators */}
      {!isUser &&
        toolInvocations
          ?.filter(
            (t) =>
              t.state === "input-streaming" || t.state === "input-available"
          )
          .map((t, i) => <ToolCallIndicator key={i} toolName={t.toolName} />)}

      {/* Message text */}
      {content && (
        <div
          role="article"
          aria-label={isUser ? "Your message" : "CIO response"}
          className="max-w-prose leading-relaxed"
          style={{
            color: isUser ? "#60A5FA" : "#E2E8F0",
            fontSize: "14px",
            lineHeight: 1.65,
            fontFamily: isUser ? "IBM Plex Mono, monospace" : "inherit",
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
export function CIODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: CIODialoguePanelProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setInput,
  } = useCIOChat({
    id: "cio-chat",
    api: "/api/cio",
  });

  // Notify parent of status changes for character animation sync
  useEffect(() => {
    if (status === "streaming") {
      onStatusChange?.("talking");
    } else if (status === "submitted") {
      onStatusChange?.("thinking");
    } else {
      onStatusChange?.("idle");
    }
  }, [status, onStatusChange]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleQuickAction = useCallback(
    (message: string) => {
      setInput(message);
      setTimeout(() => {
        const form = document.getElementById(
          "cio-chat-form"
        ) as HTMLFormElement | null;
        form?.requestSubmit();
      }, 0);
    },
    [setInput]
  );

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CIO research intelligence conversation"
      className="flex flex-col h-full"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        backgroundColor: "#060D16",
        borderLeft: "1px solid #1E3A5F",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: "1px solid #1E3A5F",
          backgroundColor: "#0D1B2A",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "#3B82F6" }}
          />
          <span
            style={{
              fontSize: "13px",
              fontFamily: "IBM Plex Mono, monospace",
              color: "#E2E8F0",
              letterSpacing: "0.06em",
            }}
          >
            CIO // RESEARCH INTELLIGENCE
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close CIO conversation panel"
          className="flex items-center justify-center w-7 h-7 rounded focus-visible:outline focus-visible:outline-2"
          style={{
            color: "#1E3A5F",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            lineHeight: 1,
            outlineColor: "#3B82F6",
          }}
        >
          ×
        </button>
      </div>

      {/* Message thread */}
      <div
        role="log"
        aria-label="Conversation with CIO"
        aria-live="polite"
        className="overflow-y-auto px-5 py-4 flex flex-col gap-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#1E3A5F #060D16" }}
      >
        {messages.length === 0 && (
          <div
            aria-label="CIO opening statement"
            style={{
              color: "#E2E8F0",
              fontSize: "14px",
              lineHeight: 1.65,
            }}
          >
            <p
              className="mb-1"
              style={{
                color: "#60A5FA",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "11px",
              }}
            >
              CIO — CHIEF INTELLIGENCE OFFICER
            </p>
            <p>
              I&apos;ve been mapping your target companies. Some research is getting stale.
            </p>
            <p
              className="mt-2"
              style={{ color: "#93C5FD" }}
            >
              Tell me which companies to dig into, or let me surface the ones that need attention first.
            </p>
          </div>
        )}

        {messages.map((msg: UIMessage) => {
          const textContent = Array.isArray(msg.parts)
            ? msg.parts
                .filter(isTextUIPart)
                .map((p) => p.text)
                .join("")
            : "";
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              <span
                aria-hidden="true"
                style={{
                  fontSize: "10px",
                  fontFamily: "IBM Plex Mono, monospace",
                  color: "#1E3A5F",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {msg.role === "user" ? "YOU" : "CIO"}
              </span>
              <MessageBubble
                role={msg.role}
                content={textContent}
                parts={
                  msg.parts as
                    | Array<UIMessagePart<UIDataTypes, UITools>>
                    | undefined
                }
              />
            </div>
          );
        })}

        {/* Streaming cursor — blue intelligence pulse */}
        {isStreaming && (
          <div
            role="status"
            aria-label="CIO is responding"
            aria-live="polite"
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              style={{
                width: "8px",
                height: "16px",
                backgroundColor: "#3B82F6",
                display: "inline-block",
                animation: "cio-panel-blink 1s step-start infinite",
                opacity: 0.8,
              }}
            />
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div
          className="px-5 py-2 flex flex-wrap gap-2"
          style={{ borderTop: "1px solid #1E3A5F" }}
          role="group"
          aria-label="Quick action shortcuts"
        >
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action.message)}
              disabled={isStreaming}
              aria-label={`Quick action: ${action.label}`}
              className="px-3 py-1.5 rounded text-xs transition-colors focus-visible:outline focus-visible:outline-2"
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "11px",
                color: "#60A5FA",
                backgroundColor: "rgba(59, 130, 246, 0.06)",
                border: "1px solid #1E3A5F",
                cursor: isStreaming ? "not-allowed" : "pointer",
                opacity: isStreaming ? 0.5 : 1,
                outlineColor: "#3B82F6",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form
        id="cio-chat-form"
        onSubmit={handleSubmit}
        className="px-4 py-3 flex gap-2 items-center"
        style={{ borderTop: "1px solid #1E3A5F" }}
        aria-label="Send message to CIO"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about companies, research, intel..."
          disabled={isStreaming}
          aria-label="Message to CIO Chief Intelligence Officer"
          className="flex-1 bg-transparent rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "13px",
            color: "#E2E8F0",
            border: "1px solid #1E3A5F",
            backgroundColor: "rgba(6, 13, 22, 0.8)",
            caretColor: "#3B82F6",
            outlineColor: "#3B82F6",
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send message to CIO"
          className="px-4 py-2 rounded transition-colors focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "12px",
            color:
              isStreaming || !input.trim() ? "#1E3A5F" : "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.08)",
            border: "1px solid #1E3A5F",
            cursor:
              isStreaming || !input.trim() ? "not-allowed" : "pointer",
            outlineColor: "#3B82F6",
          }}
        >
          SEND
        </button>
      </form>

      {/* Blink keyframe */}
      <style>{`
        @keyframes cio-panel-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
