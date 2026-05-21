export interface TelegramDebouncerOptions {
  sendFn(text: string): Promise<void>;
  windowMs: number;
  maxQueueSize: number;
}

export interface TelegramDebouncer {
  enqueue(text: string): void;
  flush(): Promise<void>;
}

export function createTelegramDebouncer(options: TelegramDebouncerOptions): TelegramDebouncer {
  let queue: string[] = [];
  let timer: NodeJS.Timeout | null = null;

  async function flush(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    if (queue.length === 0) return;
    const batch = queue.slice();
    queue = [];
    const text = batch.join("\n");
    await options.sendFn(text);
  }

  return {
    enqueue(text: string): void {
      queue.push(text);
      if (queue.length >= options.maxQueueSize) {
        void flush();
        return;
      }
      if (!timer) {
        timer = setTimeout(() => { void flush(); }, options.windowMs);
      }
    },
    flush,
  };
}
