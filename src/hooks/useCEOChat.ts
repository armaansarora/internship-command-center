"use client";

/**
 * useCEOChat — Chat hook for the CEO orchestration agent.
 * Mirrors the useCROChat pattern with /api/ceo endpoint.
 */

import { useState, useCallback, useEffect } from "react";
import type { UIMessage, ChatStatus } from "ai";
import { AbstractChat, DefaultChatTransport, generateId } from "ai";

interface UseCEOChatOptions {
  id?: string;
  api: string;
}

interface UseCEOChatReturn {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: ChatStatus;
  setInput: (value: string) => void;
  clearMessages: () => void;
}

class ReactChatState {
  private _status: ChatStatus = "ready";
  private _error: Error | undefined = undefined;
  private _messages: UIMessage[] = [];
  private _notify: (() => void) | null = null;

  setNotify(fn: () => void) {
    this._notify = fn;
  }

  get status(): ChatStatus { return this._status; }
  get error(): Error | undefined { return this._error; }
  get messages(): UIMessage[] { return this._messages; }

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
  snapshot<T>(thing: T): T { return thing; }
  setStatus(status: ChatStatus, error?: Error) {
    this._status = status;
    this._error = error;
    this._notify?.();
  }
}

class CEOChat extends AbstractChat<UIMessage> {
  private readonly _state: ReactChatState;

  constructor(state: ReactChatState, api: string, chatId: string) {
    super({
      generateId: () => generateId(),
      id: chatId,
      transport: new DefaultChatTransport({ api }),
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

export function useCEOChat({ id, api }: UseCEOChatOptions): UseCEOChatReturn {
  const [bundle] = useState(() => {
    const state = new ReactChatState();
    const chatId = id ?? generateId();
    const chat = new CEOChat(state, api, chatId);
    return { state, chat };
  });

  const [slice, setSlice] = useState(() => ({
    messages: bundle.state.messages,
    status: bundle.state.status,
  }));

  useEffect(() => {
    const s = bundle.state;
    const sync = () => {
      setSlice({ messages: s.messages, status: s.status });
    };
    s.setNotify(sync);
    sync();
  }, [bundle.state]);

  const [input, setInputState] = useState("");

  const setInput = useCallback((value: string) => {
    setInputState(value);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputState(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const text = input.trim();
      if (!text) return;
      setInputState("");
      bundle.chat.sendMessage({ text });
    },
    [input, bundle.chat]
  );

  const clearMessages = useCallback(() => {
    bundle.state.clearMessages();
  }, [bundle.state]);

  return {
    messages: slice.messages,
    input,
    handleInputChange,
    handleSubmit,
    status: slice.status,
    setInput,
    clearMessages,
  };
}
