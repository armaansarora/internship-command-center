"use client";

/**
 * useConciergeChat — dedicated AI SDK v6 chat hook for Otis.
 *
 * A focused fork of `useAgentChat` that does NOT piggyback on the C-suite
 * `AgentKey` enum. Otis is a Lobby-only character; he shouldn't show up
 * anywhere downstream that iterates the agent roster. Same AbstractChat +
 * DefaultChatTransport wiring, tighter scope.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import type { UIMessage, ChatStatus } from "ai";
import { AbstractChat, DefaultChatTransport, generateId } from "ai";

export interface UseConciergeChatOptions {
  /** Stable chat id; auto-generated if omitted. */
  id?: string;
  /** Concierge chat endpoint. Defaults to /api/concierge/chat. */
  api?: string;
  /** Extra fields merged into every outbound POST body. */
  body?: Record<string, unknown>;
}

export interface UseConciergeChatReturn {
  messages: UIMessage[];
  input: string;
  setInput: (value: string) => void;
  submit: () => void;
  status: ChatStatus;
  /** True while streaming or awaiting the first token. */
  isWorking: boolean;
  clear: () => void;
  sendRaw: (text: string) => void;
}

class ConciergeState {
  private _messages: UIMessage[] = [];
  private _status: ChatStatus = "ready";
  private _error: Error | undefined;
  private _notify: (() => void) | undefined;

  get messages() { return this._messages; }
  get status() { return this._status; }
  get error() { return this._error; }

  setNotify(fn: () => void | undefined) { this._notify = fn; }

  pushMessage(m: UIMessage) {
    this._messages = [...this._messages, m];
    this._notify?.();
  }
  popMessage() {
    this._messages = this._messages.slice(0, -1);
    this._notify?.();
  }
  replaceMessage(i: number, m: UIMessage) {
    const next = this._messages.slice();
    next[i] = m;
    this._messages = next;
    this._notify?.();
  }
  clearMessages() {
    this._messages = [];
    this._notify?.();
  }
  snapshot<T>(thing: T): T { return thing; }
  setStatus(status: ChatStatus, error?: Error) {
    this._status = status;
    this._error = error;
    this._notify?.();
  }
}

class ConciergeChatImpl extends AbstractChat<UIMessage> {
  private readonly _state: ConciergeState;
  constructor(state: ConciergeState, api: string, chatId: string, body?: Record<string, unknown>) {
    super({
      generateId: () => generateId(),
      id: chatId,
      transport: new DefaultChatTransport({ api, body }),
      state: {
        get status() { return state.status; },
        get error() { return state.error; },
        get messages() { return state.messages; },
        pushMessage: (m) => state.pushMessage(m),
        popMessage: () => state.popMessage(),
        replaceMessage: (i, m) => state.replaceMessage(i, m),
        snapshot: <T>(t: T) => state.snapshot(t),
      },
    });
    this._state = state;
  }
  protected override setStatus({ status, error }: { status: ChatStatus; error?: Error }) {
    this._state.setStatus(status, error);
  }
}

export function useConciergeChat(
  opts: UseConciergeChatOptions = {},
): UseConciergeChatReturn {
  const api = opts.api ?? "/api/concierge/chat";
  const chatIdRef = useRef<string | null>(null);
  if (chatIdRef.current === null) {
    chatIdRef.current = opts.id ?? generateId();
  }
  const stateRef = useRef<ConciergeState | null>(null);
  if (stateRef.current === null) {
    stateRef.current = new ConciergeState();
  }
  const chatRef = useRef<ConciergeChatImpl | null>(null);

  // Mirror state into React state so consumers get reactive reads without
  // dereferencing a ref during render (which the lint rule rightly flags).
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [input, setInputState] = useState("");

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const sync = () => {
      setMessages(state.messages);
      setStatus(state.status);
    };
    state.setNotify(sync);
    sync();
    return () => {
      state.setNotify(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (chatRef.current !== null) return;
    const state = stateRef.current;
    const chatId = chatIdRef.current;
    if (!state || !chatId) return;
    chatRef.current = new ConciergeChatImpl(state, api, chatId, opts.body);
  }, [api, opts.body]);

  const setInput = useCallback((value: string) => setInputState(value), []);
  const submit = useCallback(() => {
    const text = input.trim();
    if (!text || !chatRef.current) return;
    setInputState("");
    chatRef.current.sendMessage({ text });
  }, [input]);
  const sendRaw = useCallback((text: string) => {
    const t = text.trim();
    if (!t || !chatRef.current) return;
    chatRef.current.sendMessage({ text: t });
  }, []);
  const clear = useCallback(() => {
    stateRef.current?.clearMessages();
  }, []);

  const isWorking = status === "streaming" || status === "submitted";

  return {
    messages,
    input,
    setInput,
    submit,
    status,
    isWorking,
    clear,
    sendRaw,
  };
}
