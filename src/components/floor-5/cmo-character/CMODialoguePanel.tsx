"use client";

import type { JSX } from "react";
import { useEffect, useRef, useCallback } from "react";
import type { UIMessage, UIMessagePart, UIDataTypes, UITools, DynamicToolUIPart } from "ai";
import { isTextUIPart, isToolUIPart, getToolName } from "ai";
import { useAgentChat } from "@/hooks/useAgentChat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CMODialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: "idle" | "thinking" | "talking") => void;
}

// ---------------------------------------------------------------------------
// Quick action buttons — writing-themed prompts
// ---------------------------------------------------------------------------
const QUICK_ACTIONS = [
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

// ---------------------------------------------------------------------------
// Tool call indicator — warm amber theme
// ---------------------------------------------------------------------------
function ToolCallIndicator({ toolName }: { toolName: string }): JSX.Element {
  const labels: Record<string, string> = {
    draftCoverLetter: "Drafting cover letter...",
    refineDraft: "Refining your draft...",
    analyzeTone: "Analyzing tone...",
    queryDocuments: "Checking your documents...",
    queryApplications: "Checking your applications...",
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
        className="inline-block w-3 h-3 rounded-full border-2"
        style={{
          borderColor: "#C9A84C",
          borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span
        style={{
          fontSize: "12px",
          fontFamily: "'JetBrains Mono', monospace",
          color: "#E8A020",
        }}
      >
        {labels[toolName] ?? "Writing..."}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble — warm amber/gold styling
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
          aria-label={isUser ? "Your message" : "CMO response"}
          className="max-w-prose leading-relaxed"
          style={{
            color: isUser ? "#C9A84C" : "#F5E6C8",
            fontSize: "14px",
            lineHeight: 1.7,
            fontFamily: isUser
              ? "'JetBrains Mono', 'IBM Plex Mono', monospace"
              : "'Satoshi', system-ui, sans-serif",
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
export function CMODialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
}: CMODialoguePanelProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status, setInput } =
    useAgentChat({
      id: "cmo-chat",
      api: "/api/cmo",
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
      // Trigger submit on next tick after input is set
      setTimeout(() => {
        const form = document.getElementById("cmo-chat-form") as HTMLFormElement | null;
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
      aria-label="CMO cover letter conversation"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        backgroundColor: "#1A1008",
        borderLeft: "1px solid #3A2510",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: "1px solid #3A2510",
          backgroundColor: "#211510",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Warm status dot */}
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isStreaming ? "#E8A020" : "#C9A84C",
              boxShadow: isStreaming
                ? "0 0 6px rgba(232,160,32,0.7)"
                : "0 0 4px rgba(201,168,76,0.4)",
              transition: "background-color 0.3s ease",
            }}
          />
          {/* Feather quill icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            style={{ opacity: 0.7 }}
          >
            <path
              d="M12 1C12 1 9 2 6 6C4 9 4 12 4 12L5 11C5 11 5.5 9.5 7 7.5"
              stroke="#C9A84C"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M4 12C4 12 3 10 4 9C5 8 5 10 5 10"
              stroke="#C9A84C"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "#F5E6C8",
              letterSpacing: "0.06em",
            }}
          >
            CMO // WRITING STUDIO
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close CMO writing studio panel"
          className="flex items-center justify-center w-7 h-7 rounded"
          style={{
            color: "#5A3E20",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: 1,
            outlineColor: "#C9A84C",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLButtonElement).style.outline = "2px solid rgba(201,168,76,0.5)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLButtonElement).style.outline = "none";
          }}
        >
          ×
        </button>
      </div>

      {/* Message thread */}
      <div
        role="log"
        aria-label="Conversation with CMO"
        aria-live="polite"
        className="overflow-y-auto px-5 py-4 flex flex-col gap-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#3A2510 #1A1008" }}
      >
        {messages.length === 0 && (
          <div
            aria-label="Conversation opener"
            style={{
              color: "#F5E6C8",
              fontSize: "14px",
              lineHeight: 1.7,
              fontFamily: "'Satoshi', system-ui, sans-serif",
            }}
          >
            <p
              className="mb-1"
              style={{
                color: "#7A5C3A",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
              }}
            >
              CMO
            </p>
            <p>
              You&apos;ve caught me mid-draft. Pull up a chair.
            </p>
            <p className="mt-2" style={{ color: "#C8A878" }}>
              I&apos;ve read every job description you&apos;ve saved. Tell me which company, and I&apos;ll
              help you write a letter that actually gets read.
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
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#5A3E20",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {msg.role === "user" ? "YOU" : "CMO"}
              </span>
              <MessageBubble
                role={msg.role}
                content={textContent}
                parts={msg.parts as Array<UIMessagePart<UIDataTypes, UITools>> | undefined}
              />
            </div>
          );
        })}

        {/* Streaming cursor — warm amber */}
        {isStreaming && (
          <div
            role="status"
            aria-label="CMO is writing a response"
            aria-live="polite"
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              style={{
                width: "2px",
                height: "16px",
                backgroundColor: "#C9A84C",
                display: "inline-block",
                animation: "cmo-cursor-blink 1.1s step-start infinite",
                opacity: 0.85,
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
          style={{ borderTop: "1px solid #3A2510" }}
          role="group"
          aria-label="Quick writing action shortcuts"
        >
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action.message)}
              disabled={isStreaming}
              aria-label={`Quick action: ${action.label}`}
              className="px-3 py-1.5 rounded text-xs transition-colors"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: isStreaming ? "#5A3E20" : "#8B6E42",
                backgroundColor: "rgba(201, 168, 76, 0.06)",
                border: "1px solid #3A2510",
                cursor: isStreaming ? "not-allowed" : "pointer",
                opacity: isStreaming ? 0.5 : 1,
                outlineColor: "#C9A84C",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form
        id="cmo-chat-form"
        onSubmit={handleSubmit}
        className="px-4 py-3 flex gap-2 items-center"
        style={{ borderTop: "1px solid #3A2510" }}
        aria-label="Send message to CMO"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about your cover letters..."
          disabled={isStreaming}
          aria-label="Message to CMO"
          className="flex-1 bg-transparent rounded px-3 py-2 text-sm"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            color: "#F5E6C8",
            border: "1px solid #3A2510",
            backgroundColor: "rgba(33, 21, 16, 0.85)",
            caretColor: "#C9A84C",
            outlineColor: "#C9A84C",
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send message"
          className="px-4 py-2 rounded transition-colors"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            color: isStreaming || !input.trim() ? "#5A3E20" : "#C9A84C",
            backgroundColor: "rgba(201, 168, 76, 0.08)",
            border: "1px solid #3A2510",
            cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
            outlineColor: "#C9A84C",
          }}
        >
          SEND
        </button>
      </form>

      {/* Animation keyframes */}
      <style>{`
        @keyframes cmo-cursor-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
