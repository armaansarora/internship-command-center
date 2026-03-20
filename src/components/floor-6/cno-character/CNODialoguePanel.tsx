"use client";

import type { JSX } from "react";
import { useEffect, useRef, useCallback } from "react";
import type { UIMessage, UIMessagePart, UIDataTypes, UITools, DynamicToolUIPart } from "ai";
import { isTextUIPart, isToolUIPart, getToolName } from "ai";
import { useCNOChat } from "@/hooks/useCNOChat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CNODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

// ---------------------------------------------------------------------------
// Quick action buttons
// ---------------------------------------------------------------------------
const QUICK_ACTIONS = [
  { label: "How's my network?", message: "Give me a full network health briefing." },
  {
    label: "Who's going cold?",
    message: "Show me contacts that are cooling off or going cold. Who needs attention?",
  },
  {
    label: "Suggest outreach",
    message:
      "Which contacts should I reach out to this week? Help me draft a quick message.",
  },
];

// ---------------------------------------------------------------------------
// Tool call indicator
// ---------------------------------------------------------------------------
function ToolCallIndicator({ toolName }: { toolName: string }): JSX.Element {
  const labels: Record<string, string> = {
    queryContacts: "Checking network...",
    getContactStats: "Analyzing warmth...",
    logContactActivity: "Logging interaction...",
    findColdContacts: "Scanning cold contacts...",
    suggestOutreach: "Drafting outreach...",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-3 py-1.5 rounded"
      style={{
        backgroundColor: "rgba(201, 168, 76, 0.08)",
        border: "1px solid rgba(201, 168, 76, 0.2)",
      }}
    >
      {/* Spinner */}
      <span
        aria-hidden="true"
        className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#C9A84C", borderTopColor: "transparent" }}
      />
      <span
        style={{
          fontSize: "12px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#E8C87A",
        }}
      >
        {labels[toolName] ?? "Working..."}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
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
    ?.filter((p): p is DynamicToolUIPart => isToolUIPart(p as UIMessagePart<UIDataTypes, UITools>))
    .map((p) => ({ toolName: getToolName(p), state: p.state }));
  const isUser = role === "user";

  return (
    <div
      className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1.5`}
    >
      {/* Tool call indicators */}
      {!isUser &&
        toolInvocations
          ?.filter((t) => t.state === "input-streaming" || t.state === "input-available")
          .map((t, i) => (
            <ToolCallIndicator key={i} toolName={t.toolName} />
          ))}

      {/* Message text */}
      {content && (
        <div
          role="article"
          aria-label={isUser ? "Your message" : "CNO response"}
          className="max-w-prose leading-relaxed"
          style={{
            color: isUser ? "#C9A84C" : "#FDF3E8",
            fontSize: "14px",
            lineHeight: 1.65,
            fontFamily: isUser
              ? "IBM Plex Mono, monospace"
              : "inherit",
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
export function CNODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: CNODialoguePanelProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status, setInput } =
    useCNOChat({
      id: "cno-chat",
      api: "/api/cno",
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
        const form = document.getElementById("cno-chat-form") as HTMLFormElement | null;
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
      aria-label="CNO networking conversation"
      className="flex flex-col h-full"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        backgroundColor: "#1A0F05",
        borderLeft: "1px solid #5C3A1E",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: "1px solid #5C3A1E",
          backgroundColor: "#231508",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "#C9A84C" }}
          />
          <span
            style={{
              fontSize: "13px",
              fontFamily: "IBM Plex Mono, monospace",
              color: "#FDF3E8",
              letterSpacing: "0.06em",
            }}
          >
            CNO // NETWORK REVIEW
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close CNO conversation panel"
          className="flex items-center justify-center w-7 h-7 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]"
          style={{
            color: "#7A5B35",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Message thread */}
      <div
        role="log"
        aria-label="Conversation with CNO"
        aria-live="polite"
        className="overflow-y-auto px-5 py-4 flex flex-col gap-4 lounge-scroll"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#5C3A1E #1A0F05" }}
      >
        {messages.length === 0 && (
          <div
            aria-label="Conversation opener"
            style={{
              color: "#FDF3E8",
              fontSize: "14px",
              lineHeight: 1.65,
            }}
          >
            <p className="mb-1" style={{ color: "#7A5B35", fontFamily: "IBM Plex Mono, monospace", fontSize: "11px" }}>
              CNO
            </p>
            <p>
              Glad you dropped by. Pull up a chair.
            </p>
            <p className="mt-2" style={{ color: "#C4925A" }}>
              I&apos;ve got eyes on your whole network — who&apos;s warm, who&apos;s cooling, and who we&apos;re about to lose.
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
                {msg.role === "user" ? "YOU" : "CNO"}
              </span>
              <MessageBubble
                role={msg.role}
                content={textContent}
                parts={msg.parts as Array<UIMessagePart<UIDataTypes, UITools>> | undefined}
              />
            </div>
          );
        })}

        {/* Streaming cursor */}
        {isStreaming && (
          <div
            role="status"
            aria-label="CNO is responding"
            aria-live="polite"
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              style={{
                width: "8px",
                height: "16px",
                backgroundColor: "#C9A84C",
                display: "inline-block",
                animation: "cno-blink 1s step-start infinite",
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
          style={{ borderTop: "1px solid #5C3A1E" }}
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
              className="px-3 py-1.5 rounded text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]"
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "11px",
                color: "#C4925A",
                backgroundColor: "rgba(201, 168, 76, 0.06)",
                border: "1px solid #5C3A1E",
                cursor: isStreaming ? "not-allowed" : "pointer",
                opacity: isStreaming ? 0.5 : 1,
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form
        id="cno-chat-form"
        onSubmit={handleSubmit}
        className="px-4 py-3 flex gap-2 items-center"
        style={{ borderTop: "1px solid #5C3A1E" }}
        aria-label="Send message to CNO"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about your network..."
          disabled={isStreaming}
          aria-label="Message to CNO"
          className="flex-1 bg-transparent rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "13px",
            color: "#FDF3E8",
            border: "1px solid #5C3A1E",
            backgroundColor: "rgba(35, 21, 8, 0.8)",
            caretColor: "#C9A84C",
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send message"
          className="px-4 py-2 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "12px",
            color: isStreaming || !input.trim() ? "#7A5B35" : "#C9A84C",
            backgroundColor: "rgba(201, 168, 76, 0.08)",
            border: "1px solid #5C3A1E",
            cursor:
              isStreaming || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          SEND
        </button>
      </form>

      {/* Blink keyframe */}
      <style>{`
        @keyframes cno-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
