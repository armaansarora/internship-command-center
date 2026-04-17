"use client";

import type { JSX, RefObject } from "react";
import type { UIDataTypes, UIMessage, UIMessagePart, UITools } from "ai";
import { isTextUIPart } from "ai";
import { AgentMessageBubble } from "./AgentMessageBubble";
import type {
  AgentDialogueOpener,
  AgentDialogueTheme,
  AgentStreamingCursorConfig,
} from "./types";

interface AgentMessageListProps {
  messages: UIMessage[];
  assistantName: string;
  logAriaLabel: string;
  opener?: AgentDialogueOpener;
  isStreaming: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  toolLabels: Record<string, string>;
  theme: AgentDialogueTheme;
  messageAreaClassName?: string;
  renderAssistantContent?: (content: string) => JSX.Element;
  streamingCursor?: AgentStreamingCursorConfig;
}

export function AgentMessageList({
  messages,
  assistantName,
  logAriaLabel,
  opener,
  isStreaming,
  messagesEndRef,
  toolLabels,
  theme,
  messageAreaClassName,
  renderAssistantContent,
  streamingCursor,
}: AgentMessageListProps): JSX.Element {
  const monoFont = theme.monoFontFamily ?? "IBM Plex Mono, monospace";
  const cursorColor = streamingCursor?.color ?? theme.streamingAccentColor ?? theme.accentColor;

  return (
    <div
      role="log"
      aria-label={logAriaLabel}
      aria-live="polite"
      className={`overflow-y-auto px-5 py-4 flex flex-col gap-4 ${messageAreaClassName ?? ""}`}
      style={{ scrollbarWidth: "thin", scrollbarColor: `${theme.borderColor} ${theme.backgroundColor}` }}
    >
      {messages.length === 0 && opener && (
        <div aria-label={opener.ariaLabel ?? "Conversation opener"}>
          {opener.label && (
            <p
              className="mb-1"
              style={{
                color: opener.labelColor ?? theme.mutedColor,
                fontFamily: monoFont,
                fontSize: "11px",
              }}
            >
              {opener.label}
            </p>
          )}
          {opener.lines.map((line, index) => (
            <p
              key={`${line.text}-${index}`}
              style={{
                color: line.color ?? theme.assistantColor,
                fontSize: "14px",
                lineHeight: 1.65,
                marginTop: line.marginTop ?? (index === 0 ? 0 : 8),
              }}
            >
              {line.text}
            </p>
          ))}
        </div>
      )}

      {messages.map((message: UIMessage) => {
        const textContent = Array.isArray(message.parts)
          ? message.parts
              .filter(isTextUIPart)
              .map((part) => part.text)
              .join("")
          : "";
        return (
          <div key={message.id} className="flex flex-col gap-1">
            <span
              aria-hidden="true"
              style={{
                fontSize: "10px",
                fontFamily: monoFont,
                color: theme.mutedColor,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {message.role === "user" ? "YOU" : assistantName}
            </span>
            <AgentMessageBubble
              role={message.role}
              content={textContent}
              parts={message.parts as Array<UIMessagePart<UIDataTypes, UITools>> | undefined}
              assistantName={assistantName}
              toolLabels={toolLabels}
              theme={theme}
              renderAssistantContent={renderAssistantContent}
            />
          </div>
        );
      })}

      {isStreaming && (
        <div
          role="status"
          aria-label={`${assistantName} is responding`}
          aria-live="polite"
          className="flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            style={{
              width: `${streamingCursor?.width ?? 8}px`,
              height: `${streamingCursor?.height ?? 16}px`,
              backgroundColor: cursorColor,
              display: "inline-block",
              animation: "agent-dialogue-blink 1s step-start infinite",
              opacity: 0.8,
            }}
          />
        </div>
      )}

      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  );
}
