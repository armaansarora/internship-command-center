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
import { useAgentChat } from "@/hooks/useAgentChat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface COODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

// ---------------------------------------------------------------------------
// Quick action buttons — COO/operations focused
// ---------------------------------------------------------------------------
const QUICK_ACTIONS = [
  {
    label: "What's on my plate today?",
    message: "Give me a full operations briefing for today.",
  },
  {
    label: "Show overdue follow-ups",
    message:
      "Show me all overdue follow-ups sorted by days overdue.",
  },
  {
    label: "Draft follow-up emails",
    message:
      "Draft follow-up emails for the most overdue applications.",
  },
] as const;

// ---------------------------------------------------------------------------
// Tool call indicator — amber scheme
// ---------------------------------------------------------------------------
function ToolCallIndicator({ toolName }: { toolName: string }): JSX.Element {
  const labels: Record<string, string> = {
    queryCalendar: "Checking calendar...",
    queryFollowUps: "Scanning follow-ups...",
    draftFollowUp: "Drafting email...",
    queryOutreach: "Reviewing outreach queue...",
    queryEmails: "Reading emails...",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-3 py-1.5 rounded"
      style={{
        backgroundColor: "rgba(220, 124, 40, 0.08)",
        border: "1px solid rgba(220, 124, 40, 0.2)",
      }}
    >
      {/* Spinner */}
      <span
        aria-hidden="true"
        className="inline-block w-3 h-3 rounded-full border-2 animate-spin"
        style={{
          borderColor: "#DC7C28",
          borderTopColor: "transparent",
        }}
      />
      <span
        style={{
          fontSize: "12px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#F0A050",
        }}
      >
        {labels[toolName] ?? "Working..."}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble — amber scheme
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
          aria-label={isUser ? "Your message" : "COO response"}
          className="max-w-prose leading-relaxed"
          style={{
            color: isUser ? "#DC7C28" : "#FDF3E8",
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
export function COODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: COODialoguePanelProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setInput,
  } = useAgentChat({
    id: "coo-chat",
    api: "/api/coo",
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
          "coo-chat-form"
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
      aria-label="COO operations briefing conversation"
      className="flex flex-col h-full"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        backgroundColor: "#0A0800",
        borderLeft: "1px solid #3D2E0A",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: "1px solid #3D2E0A",
          backgroundColor: "#120C02",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "#DC7C28" }}
          />
          <span
            style={{
              fontSize: "13px",
              fontFamily: "IBM Plex Mono, monospace",
              color: "#FDF3E8",
              letterSpacing: "0.06em",
            }}
          >
            COO // OPERATIONS BRIEFING
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close COO conversation panel"
          className="flex items-center justify-center w-7 h-7 rounded focus-visible:outline focus-visible:outline-2"
          style={{
            color: "#7A5B35",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            lineHeight: 1,
            outlineColor: "#DC7C28",
          }}
        >
          ×
        </button>
      </div>

      {/* Message thread */}
      <div
        role="log"
        aria-label="Conversation with COO Dylan Shorts"
        aria-live="polite"
        className="overflow-y-auto px-5 py-4 flex flex-col gap-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#3D2E0A #0A0800" }}
      >
        {messages.length === 0 && (
          <div
            aria-label="COO opening statement"
            style={{
              color: "#FDF3E8",
              fontSize: "14px",
              lineHeight: 1.65,
            }}
          >
            <p
              className="mb-1"
              style={{
                color: "#C4925A",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "11px",
              }}
            >
              COO — DYLAN SHORTS
            </p>
            <p>
              Morning. Two things on your plate today.
            </p>
            <p
              className="mt-2"
              style={{ color: "#C4925A" }}
            >
              I&apos;ve already got eyes on your calendar and follow-up queue — ask
              me anything, or let me run the brief.
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
                  color: "#7A5B35",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {msg.role === "user" ? "YOU" : "COO"}
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

        {/* Streaming cursor — amber */}
        {isStreaming && (
          <div
            role="status"
            aria-label="COO is responding"
            aria-live="polite"
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              style={{
                width: "8px",
                height: "16px",
                backgroundColor: "#DC7C28",
                display: "inline-block",
                animation: "coo-blink 1s step-start infinite",
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
          style={{ borderTop: "1px solid #3D2E0A" }}
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
                color: "#C4925A",
                backgroundColor: "rgba(220, 124, 40, 0.06)",
                border: "1px solid #3D2E0A",
                cursor: isStreaming ? "not-allowed" : "pointer",
                opacity: isStreaming ? 0.5 : 1,
                outlineColor: "#DC7C28",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form
        id="coo-chat-form"
        onSubmit={handleSubmit}
        className="px-4 py-3 flex gap-2 items-center"
        style={{ borderTop: "1px solid #3D2E0A" }}
        aria-label="Send message to COO"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about deadlines, follow-ups..."
          disabled={isStreaming}
          aria-label="Message to COO Dylan Shorts"
          className="flex-1 bg-transparent rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "13px",
            color: "#FDF3E8",
            border: "1px solid #3D2E0A",
            backgroundColor: "rgba(18, 12, 2, 0.8)",
            caretColor: "#DC7C28",
            outlineColor: "#DC7C28",
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send message to COO"
          className="px-4 py-2 rounded transition-colors focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "12px",
            color:
              isStreaming || !input.trim() ? "#7A5B35" : "#DC7C28",
            backgroundColor: "rgba(220, 124, 40, 0.08)",
            border: "1px solid #3D2E0A",
            cursor:
              isStreaming || !input.trim() ? "not-allowed" : "pointer",
            outlineColor: "#DC7C28",
          }}
        >
          SEND
        </button>
      </form>

      {/* Blink keyframe */}
      <style>{`
        @keyframes coo-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
