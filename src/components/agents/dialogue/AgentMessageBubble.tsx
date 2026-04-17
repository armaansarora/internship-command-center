"use client";

import type { JSX } from "react";
import type {
  DynamicToolUIPart,
  UIDataTypes,
  UIMessagePart,
  UITools,
} from "ai";
import { getToolName, isToolUIPart } from "ai";
import { AgentToolCallIndicator } from "./AgentToolCallIndicator";
import type { AgentDialogueTheme } from "./types";

interface AgentMessageBubbleProps {
  role: string;
  content: string;
  parts?: Array<UIMessagePart<UIDataTypes, UITools>>;
  assistantName: string;
  toolLabels: Record<string, string>;
  theme: AgentDialogueTheme;
  renderAssistantContent?: (content: string) => JSX.Element;
}

export function AgentMessageBubble({
  role,
  content,
  parts,
  assistantName,
  toolLabels,
  theme,
  renderAssistantContent,
}: AgentMessageBubbleProps): JSX.Element {
  const toolInvocations = parts
    ?.filter(
      (part): part is DynamicToolUIPart =>
        isToolUIPart(part as UIMessagePart<UIDataTypes, UITools>),
    )
    .map((part) => ({ toolName: getToolName(part), state: part.state }));
  const isUser = role === "user";

  const userFont = theme.userFontFamily ?? theme.monoFontFamily ?? "IBM Plex Mono, monospace";
  const assistantFont = theme.assistantFontFamily ?? "inherit";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1.5`}>
      {!isUser &&
        toolInvocations
          ?.filter((tool) => tool.state === "input-streaming" || tool.state === "input-available")
          .map((tool, index) => (
            <AgentToolCallIndicator
              key={`${tool.toolName}-${index}`}
              toolName={tool.toolName}
              labels={toolLabels}
              theme={theme}
            />
          ))}

      {content && (
        <div
          role="article"
          aria-label={isUser ? "Your message" : `${assistantName} response`}
          className="max-w-prose leading-relaxed"
          style={{
            color: isUser ? theme.userColor : theme.assistantColor,
            fontSize: "14px",
            lineHeight: 1.65,
            fontFamily: isUser ? userFont : assistantFont,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {isUser
            ? content
            : renderAssistantContent
              ? renderAssistantContent(content)
              : content}
        </div>
      )}
    </div>
  );
}
