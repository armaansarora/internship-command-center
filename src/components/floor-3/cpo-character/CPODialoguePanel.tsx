"use client";

import type { JSX } from "react";
import { useEffect, useRef, useCallback } from "react";
import type { UIMessage, UIMessagePart, UIDataTypes, UITools, DynamicToolUIPart } from "ai";
import { isTextUIPart, isToolUIPart, getToolName } from "ai";
import { useAgentChat } from "@/hooks/useAgentChat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CPODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

// ---------------------------------------------------------------------------
// Suggested prompts — prep-themed
// ---------------------------------------------------------------------------
const QUICK_ACTIONS = [
  {
    label: "Prep me for my next interview",
    message: "Prep me for my next upcoming interview. What should I know and how should I prepare?",
  },
  {
    label: "Blackstone questions",
    message: "What questions should I expect at Blackstone? Give me a full breakdown by category.",
  },
  {
    label: "CBRE briefing packet",
    message: "Generate a full briefing packet for CBRE — company overview, likely questions, talking points, and interviewer intel.",
  },
];

// ---------------------------------------------------------------------------
// Tool call indicator
// ---------------------------------------------------------------------------
function ToolCallIndicator({ toolName }: { toolName: string }): JSX.Element {
  const labels: Record<string, string> = {
    queryInterviews: "Checking interview schedule...",
    getPrepPacket: "Loading prep materials...",
    generateBriefing: "Generating briefing packet...",
    analyzeCompany: "Researching company...",
    searchQuestions: "Finding likely questions...",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-3 py-1.5 rounded-sm"
      style={{
        backgroundColor: "rgba(74, 158, 219, 0.07)",
        border: "1px solid rgba(74, 158, 219, 0.2)",
      }}
    >
      {/* Spinner */}
      <span
        aria-hidden="true"
        className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#4A9EDB", borderTopColor: "transparent" }}
      />
      <span
        style={{
          fontSize: "12px",
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          color: "#7EC8E3",
        }}
      >
        {labels[toolName] ?? "Processing..."}
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
    ?.filter((p): p is DynamicToolUIPart =>
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
          aria-label={isUser ? "Your message" : "CPO response"}
          className="max-w-prose leading-relaxed"
          style={{
            color: isUser ? "#4A9EDB" : "#E8F4FD",
            fontSize: "14px",
            lineHeight: 1.65,
            fontFamily: isUser
              ? "'JetBrains Mono', 'IBM Plex Mono', monospace"
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
export function CPODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: CPODialoguePanelProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status, setInput } =
    useAgentChat({
      id: "cpo-chat",
      api: "/api/cpo",
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
          "cpo-chat-form"
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
      aria-label="CPO interview preparation briefing"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        backgroundColor: "#060A12",
        borderLeft: "1px solid #1A2E4A",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid #1A2E4A",
          backgroundColor: "#090F1C",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            aria-hidden="true"
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#4A9EDB",
              boxShadow: "0 0 6px rgba(74, 158, 219, 0.8)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "12px",
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
              color: "#E8F4FD",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            CPO // INTERVIEW PREP
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close CPO briefing panel"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "2px",
            color: "#4A6A85",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: 1,
          }}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
        >
          ×
        </button>
      </div>

      {/* Message thread */}
      <div
        role="log"
        aria-label="Conversation with CPO"
        aria-live="polite"
        style={{
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          scrollbarWidth: "thin",
          scrollbarColor: "#1A2E4A #060A12",
        }}
      >
        {messages.length === 0 && (
          <div
            aria-label="Opening message from CPO"
            style={{ color: "#E8F4FD", fontSize: "14px", lineHeight: 1.65 }}
          >
            <p
              style={{
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                fontSize: "10px",
                color: "#8BAECB",
                marginBottom: "6px",
                letterSpacing: "0.06em",
              }}
            >
              CPO
            </p>
            <p>
              You caught me at the whiteboard. I&apos;ve been reviewing your
              interview schedule.
            </p>
            <p style={{ marginTop: "8px", color: "#8BAECB" }}>
              Pick a company, a round, or a question type — I&apos;ll run the
              brief.
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
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                aria-hidden="true"
                style={{
                  fontSize: "9px",
                  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                  color: "#4A6A85",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {msg.role === "user" ? "YOU" : "CPO"}
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

        {/* Streaming cursor */}
        {isStreaming && (
          <div
            role="status"
            aria-label="CPO is responding"
            aria-live="polite"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "7px",
                height: "14px",
                backgroundColor: "#4A9EDB",
                display: "inline-block",
                animation: "cpo-blink 1s step-start infinite",
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
          style={{
            padding: "8px 16px",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            borderTop: "1px solid #1A2E4A",
          }}
          role="group"
          aria-label="Quick briefing shortcuts"
        >
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action.message)}
              disabled={isStreaming}
              aria-label={`Quick action: ${action.label}`}
              style={{
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                fontSize: "10px",
                color: isStreaming ? "#4A6A85" : "#8BAECB",
                backgroundColor: "rgba(74, 158, 219, 0.05)",
                border: "1px solid #1A2E4A",
                borderRadius: "2px",
                padding: "5px 10px",
                cursor: isStreaming ? "not-allowed" : "pointer",
                opacity: isStreaming ? 0.5 : 1,
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
              onMouseEnter={(e) => {
                if (!isStreaming) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "rgba(74, 158, 219, 0.1)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(74, 158, 219, 0.35)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "rgba(74, 158, 219, 0.05)";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#1A2E4A";
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form
        id="cpo-chat-form"
        onSubmit={handleSubmit}
        style={{
          padding: "12px 16px",
          display: "flex",
          gap: "8px",
          alignItems: "center",
          borderTop: "1px solid #1A2E4A",
        }}
        aria-label="Send message to CPO"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about interview prep..."
          disabled={isStreaming}
          aria-label="Message to CPO"
          style={{
            flex: 1,
            background: "rgba(9, 15, 28, 0.8)",
            borderRadius: "2px",
            padding: "8px 12px",
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontSize: "13px",
            color: "#E8F4FD",
            border: "1px solid #1A2E4A",
            caretColor: "#4A9EDB",
            outline: "none",
          }}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send message"
          style={{
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.07em",
            color:
              isStreaming || !input.trim() ? "#4A6A85" : "#4A9EDB",
            backgroundColor: "rgba(74, 158, 219, 0.07)",
            border: "1px solid #1A2E4A",
            borderRadius: "2px",
            padding: "8px 14px",
            cursor:
              isStreaming || !input.trim() ? "not-allowed" : "pointer",
            transition: "background 0.15s ease",
          }}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
        >
          SEND
        </button>
      </form>

      {/* Blink + cursor keyframes */}
      <style>{`
        @keyframes cpo-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
