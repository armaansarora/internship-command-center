"use client";

/**
 * useCPOChat — A React hook that wraps the AI SDK v5 AbstractChat pattern.
 * Provides the same interface as @ai-sdk/react useChat for the CPO agent.
 */

import { useState, useCallback, useRef } from "react";
import type { UIMessage, ChatStatus } from "ai";
import { AbstractChat, DefaultChatTransport, generateId } from "ai";

interface UseCPOChatOptions {
  id?: string;
  api: string;
}

interface UseCPOChatReturn {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: ChatStatus;
  setInput: (value: string) => void;
}

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

  snapshot<T>(thing: T): T {
    return thing;
  }

  setStatus(status: ChatStatus, error?: Error) {
    this._status = status;
    this._error = error;
    this._notify?.();
  }
}

class CPOChat extends AbstractChat<UIMessage> {
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

export function useCPOChat({ id, api }: UseCPOChatOptions): UseCPOChatReturn {
  const chatId = useRef(id ?? generateId()).current;
  const stateRef = useRef(new ReactChatState());
  const chatRef = useRef<CPOChat | null>(null);

  const [, forceUpdate] = useState(0);

  // Wire up notification
  if (!stateRef.current.setNotify) {
    // already set
  }
  stateRef.current.setNotify(() => forceUpdate((n) => n + 1));

  if (!chatRef.current) {
    chatRef.current = new CPOChat(stateRef.current, api, chatId);
  }

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
      if (!text || !chatRef.current) return;
      setInputState("");
      chatRef.current.sendMessage({ text });
    },
    [input]
  );

  return {
    messages: stateRef.current.messages,
    input,
    handleInputChange,
    handleSubmit,
    status: stateRef.current.status,
    setInput,
  };
}
