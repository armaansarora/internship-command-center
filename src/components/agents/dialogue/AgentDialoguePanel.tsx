"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useAgentChat, type AgentKey } from "@/hooks/useAgentChat";
import { AgentChatInput } from "./AgentChatInput";
import { AgentMessageList } from "./AgentMessageList";
import { AgentQuickActions } from "./AgentQuickActions";
import type { AgentDialoguePanelProps } from "./types";

export function AgentDialoguePanel({
  isOpen,
  onClose,
  onStatusChange,
  onChatActivity,
  chatId,
  api,
  dialogAriaLabel,
  logAriaLabel,
  assistantName,
  headerTitle,
  closeAriaLabel,
  placeholder,
  inputAriaLabel,
  sendAriaLabel,
  quickActionsAriaLabel,
  opener,
  quickActions,
  toolLabels,
  theme,
  initialMessage,
  renderAssistantContent,
  headerAccessory,
  messageAreaClassName,
  streamingCursor,
}: AgentDialoguePanelProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const initialSentRef = useRef(false);

  // Derive AgentKey from api path (`/api/ceo` → `ceo`). Each panel is wired
  // to a known C-suite agent so this is always the trailing path segment.
  const agentKey = (api.replace(/^.*\/api\//, "").split("/")[0] || "ceo") as AgentKey;

  const { messages, input, handleInputChange, handleSubmit, status, setInput } = useAgentChat(
    agentKey,
    { id: chatId, api },
  );

  useEffect(() => {
    if (status === "streaming") {
      onStatusChange?.("talking");
      return;
    }
    if (status === "submitted") {
      onStatusChange?.("thinking");
      return;
    }
    onStatusChange?.("idle");
  }, [status, onStatusChange]);

  // Forward every message/status tick so parents can observe tool-call parts
  // for side-channel UI (e.g. Ring-the-Bell subagent progress).
  useEffect(() => {
    onChatActivity?.({ messages, status });
  }, [messages, status, onChatActivity]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !initialMessage || initialSentRef.current || messages.length > 0) {
      return;
    }
    initialSentRef.current = true;
    setInput(initialMessage);
    const timer = window.setTimeout(() => formRef.current?.requestSubmit(), 100);
    return () => window.clearTimeout(timer);
  }, [initialMessage, isOpen, messages.length, setInput]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleQuickAction = useCallback(
    (message: string) => {
      setInput(message);
      window.setTimeout(() => formRef.current?.requestSubmit(), 0);
    },
    [setInput],
  );

  const isStreaming = status === "streaming" || status === "submitted";
  const monoFont = theme.monoFontFamily ?? "IBM Plex Mono, monospace";
  const accentColor = isStreaming && theme.streamingAccentColor ? theme.streamingAccentColor : theme.accentColor;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialogAriaLabel}
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        backgroundColor: theme.backgroundColor,
        borderLeft: `1px solid ${theme.borderColor}`,
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid ${theme.borderColor}`, backgroundColor: theme.panelColor }}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          {headerAccessory}
          <span
            style={{
              fontSize: "13px",
              fontFamily: monoFont,
              color: theme.assistantColor,
              letterSpacing: "0.06em",
            }}
          >
            {headerTitle}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeAriaLabel}
          className="flex items-center justify-center w-7 h-7 rounded focus-visible:outline focus-visible:outline-2"
          style={{
            color: theme.closeColor,
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            lineHeight: 1,
            outlineColor: theme.accentColor,
          }}
        >
          ×
        </button>
      </div>

      <AgentMessageList
        messages={messages}
        assistantName={assistantName}
        logAriaLabel={logAriaLabel}
        opener={opener}
        isStreaming={isStreaming}
        messagesEndRef={messagesEndRef}
        toolLabels={toolLabels}
        theme={theme}
        messageAreaClassName={messageAreaClassName}
        renderAssistantContent={renderAssistantContent}
        streamingCursor={streamingCursor}
      />

      {messages.length === 0 && quickActions.length > 0 && (
        <AgentQuickActions
          actions={quickActions}
          isStreaming={isStreaming}
          onSelect={handleQuickAction}
          ariaLabel={quickActionsAriaLabel ?? "Quick action shortcuts"}
          theme={theme}
        />
      )}

      <AgentChatInput
        formRef={formRef}
        inputRef={inputRef}
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        inputAriaLabel={inputAriaLabel}
        sendAriaLabel={sendAriaLabel ?? assistantName}
        isStreaming={isStreaming}
        theme={theme}
      />

      <style>{`
        @keyframes agent-dialogue-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
