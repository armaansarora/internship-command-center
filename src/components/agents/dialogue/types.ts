"use client";

import type { JSX } from "react";

export type AgentDialogueStatus = "idle" | "thinking" | "talking";

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
