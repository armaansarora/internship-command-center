"use client";

import type { ChangeEvent, FormEvent, JSX, RefObject } from "react";
import type { AgentDialogueTheme } from "./types";

interface AgentChatInputProps {
  formRef: RefObject<HTMLFormElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  inputAriaLabel: string;
  sendAriaLabel: string;
  isStreaming: boolean;
  theme: AgentDialogueTheme;
}

export function AgentChatInput({
  formRef,
  inputRef,
  value,
  onChange,
  onSubmit,
  placeholder,
  inputAriaLabel,
  sendAriaLabel,
  isStreaming,
  theme,
}: AgentChatInputProps): JSX.Element {
  const monoFont = theme.monoFontFamily ?? "IBM Plex Mono, monospace";

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="px-4 py-3 flex gap-2 items-center"
      style={{ borderTop: `1px solid ${theme.borderColor}` }}
      aria-label={`Send message to ${sendAriaLabel}`}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={isStreaming}
        aria-label={inputAriaLabel}
        className="flex-1 bg-transparent rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2"
        style={{
          fontFamily: monoFont,
          fontSize: "13px",
          color: theme.inputColor,
          border: `1px solid ${theme.borderColor}`,
          backgroundColor: theme.inputBackground,
          caretColor: theme.accentColor,
          outlineColor: theme.accentColor,
        }}
      />
      <button
        type="submit"
        disabled={isStreaming || !value.trim()}
        aria-label={`Send message to ${sendAriaLabel}`}
        className="px-4 py-2 rounded transition-colors focus-visible:outline focus-visible:outline-2"
        style={{
          fontFamily: monoFont,
          fontSize: "12px",
          color: isStreaming || !value.trim() ? theme.mutedColor : theme.accentColor,
          backgroundColor: theme.toolIndicatorBg,
          border: `1px solid ${theme.borderColor}`,
          cursor: isStreaming || !value.trim() ? "not-allowed" : "pointer",
          outlineColor: theme.accentColor,
        }}
      >
        SEND
      </button>
    </form>
  );
}
