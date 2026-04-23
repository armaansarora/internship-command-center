"use client";

import type { JSX } from "react";
import type { ChatStatus, UIMessage } from "ai";

export type AgentDialogueStatus = "idle" | "thinking" | "talking";

/**
 * Fired on every messages/status tick so a parent can drive side-channels
 * (e.g. CSuiteClient watches CEO dispatch tool-parts to render the
 * Ring-the-Bell progress cards).
 */
export interface AgentChatActivity {
  messages: UIMessage[];
  status: ChatStatus;
}

export interface AgentQuickAction {
  label: string;
  message: string;
}

export interface AgentOpenerLine {
  text: string;
  color?: string;
  marginTop?: number;
}

export interface AgentDialogueOpener {
  ariaLabel?: string;
  label?: string;
  labelColor?: string;
  lines: AgentOpenerLine[];
}

export interface AgentStreamingCursorConfig {
  width?: number;
  height?: number;
  color?: string;
}

export interface AgentDialogueTheme {
  backgroundColor: string;
  panelColor: string;
  borderColor: string;
  accentColor: string;
  streamingAccentColor?: string;
  assistantColor: string;
  userColor: string;
  mutedColor: string;
  quickActionColor: string;
  inputColor: string;
  inputBackground: string;
  closeColor: string;
  toolIndicatorBg: string;
  toolIndicatorBorder: string;
  toolIndicatorText: string;
  monoFontFamily?: string;
  userFontFamily?: string;
  assistantFontFamily?: string;
}

export interface AgentDialoguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: AgentDialogueStatus) => void;
  /** Forward chat messages + status on every render. Used by Ring-the-Bell. */
  onChatActivity?: (activity: AgentChatActivity) => void;
  /**
   * R3.11 — called once on mount with an `inject(text)` function the parent
   * can store and invoke later to push a message into the chat from outside
   * the normal input form (e.g., the `/`-inject floating prompt on Floor 1).
   * The callback-registration pattern keeps the panel's internal state
   * machine untouched — the parent owns the ref; the panel only wires up.
   */
  registerInject?: (fn: (text: string) => void) => void;
  chatId: string;
  api: string;
  dialogAriaLabel: string;
  logAriaLabel: string;
  assistantName: string;
  headerTitle: string;
  closeAriaLabel: string;
  placeholder: string;
  inputAriaLabel: string;
  sendAriaLabel?: string;
  quickActionsAriaLabel?: string;
  opener?: AgentDialogueOpener;
  quickActions: AgentQuickAction[];
  toolLabels: Record<string, string>;
  theme: AgentDialogueTheme;
  initialMessage?: string;
  renderAssistantContent?: (content: string) => JSX.Element;
  headerAccessory?: JSX.Element;
  messageAreaClassName?: string;
  streamingCursor?: AgentStreamingCursorConfig;
}
