"use client";

/**
 * useAgentChat — A single React hook that wraps the AI SDK v5 AbstractChat
 * pattern for ALL eight C-suite agents (CEO, CFO, CIO, CMO, CNO, COO, CPO, CRO).
 *
 * Replaces eight near-identical per-agent hooks (~140 LOC each) with one
 * factory consumed via thin re-exports (`useCEOChat`, `useCROChat`, etc.)
 * to keep call-sites stable.
 *
 * NOTE on the `setNotify(...)` call: it intentionally runs once on mount via
 * `useEffect` (not during render). Calling it during render would re-register
 * a fresh callback every commit and discard the previous one.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { UIMessage, ChatStatus } from "ai";
import { AbstractChat, DefaultChatTransport, generateId } from "ai";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export type AgentKey =
  | "ceo"
  | "cfo"
  | "cio"
  | "cmo"
  | "cno"
  | "coo"
  | "cpo"
  | "cro";

export interface UseAgentChatOptions {
  /** Stable chat id; auto-generated if omitted. */
  id?: string;
  /**
   * API endpoint to POST to. Defaults to `/api/${agentKey}` so most callers
   * never need to pass it.
   */
  api?: string;
}

export interface UseAgentChatReturn {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: ChatStatus;
  setInput: (value: string) => void;
  /**
   * Programmatically push a message into the chat without going through the
   * input form. Used by R3.11's `/`-inject feature: mid-orchestration the
   * user can press `/`, type a directive, and have it enter the chat stream
   * as if they'd typed it in the panel's input. No-op when `text` is empty
   * or blank.
   */
  sendMessage: (text: string) => void;
  /** Reset the conversation. Some panels expose this; others don't. */
  clearMessages: () => void;
}

// ---------------------------------------------------------------------------
// React-driven Chat state — bridges the AI SDK's mutable state contract
// to a force-update callback that triggers React re-renders.
// ---------------------------------------------------------------------------
class ReactChatState {
  private _status: ChatStatus = "ready";
  private _error: Error | undefined = undefined;
  private _messages: UIMessage[] = [];
  private _notify: (() => void) | null = null;

  setNotify(fn: () => void) {
    this._notify = fn;
  }

  get status(): ChatStatus {
    return this._status;
  }
  get error(): Error | undefined {
    return this._error;
  }
  get messages(): UIMessage[] {
    return this._messages;
  }

  pushMessage(message: UIMessage) {
    this._messages = [...this._messages, message];
    this._notify?.();
  }
  popMessage() {
    this._messages = this._messages.slice(0, -1);
    this._notify?.();
  }
  replaceMessage(index: number, message: UIMessage) {
    const next = [...this._messages];
    next[index] = message;
    this._messages = next;
    this._notify?.();
  }
  clearMessages() {
    this._messages = [];
    this._notify?.();
  }
  snapshot<T>(thing: T): T {
    return thing;
  }
  setStatus(status: ChatStatus, error?: Error) {
    this._status = status;
    this._error = error;
    this._notify?.();
  }
}

// ---------------------------------------------------------------------------
// Concrete AbstractChat subclass wired to ReactChatState.
// ---------------------------------------------------------------------------
class AgentChatImpl extends AbstractChat<UIMessage> {
  private readonly _state: ReactChatState;

  constructor(state: ReactChatState, api: string, chatId: string) {
    super({
      generateId: () => generateId(),
      id: chatId,
      transport: new DefaultChatTransport({ api }),
      state: {
        get status() {
          return state.status;
        },
        get error() {
          return state.error;
        },
        get messages() {
          return state.messages;
        },
        pushMessage: (m) => state.pushMessage(m),
        popMessage: () => state.popMessage(),
        replaceMessage: (i, m) => state.replaceMessage(i, m),
        snapshot: <T>(t: T) => state.snapshot(t),
      },
    });
    this._state = state;
  }

  protected override setStatus({
    status,
    error,
  }: {
    status: ChatStatus;
    error?: Error;
  }) {
    this._state.setStatus(status, error);
  }
}

// ---------------------------------------------------------------------------
// Factory hook
// ---------------------------------------------------------------------------
export function useAgentChat(
  agentKey: AgentKey,
  opts: UseAgentChatOptions = {},
): UseAgentChatReturn {
  const api = opts.api ?? `/api/${agentKey}`;
  const chatId = useRef(opts.id ?? generateId()).current;
  const stateRef = useRef<ReactChatState | null>(null);
  if (!stateRef.current) {
    stateRef.current = new ReactChatState();
  }
  const chatRef = useRef<AgentChatImpl | null>(null);

  const [, forceUpdate] = useState(0);

  // Register the notify callback exactly once. Doing this in render would
  // re-register on every commit (the bug flagged in audit H3).
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.setNotify(() => forceUpdate((n) => n + 1));
    return () => {
      state.setNotify(() => undefined);
    };
  }, []);

  if (!chatRef.current && stateRef.current) {
    chatRef.current = new AgentChatImpl(stateRef.current, api, chatId);
  }

  const [input, setInputState] = useState("");

  const setInput = useCallback((value: string) => {
    setInputState(value);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputState(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || !chatRef.current) return;
      setInputState("");
      chatRef.current.sendMessage({ text });
    },
    [input],
  );

  const clearMessages = useCallback(() => {
    stateRef.current?.clearMessages();
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !chatRef.current) return;
    chatRef.current.sendMessage({ text: trimmed });
  }, []);

  return {
    messages: stateRef.current.messages,
    input,
    handleInputChange,
    handleSubmit,
    status: stateRef.current.status,
    setInput,
    sendMessage,
    clearMessages,
  };
}
