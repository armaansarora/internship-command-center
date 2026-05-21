// src/lib/artlab/speed/telegram-debounce.test.ts
import { describe, expect, it, vi } from "vitest";
import { createTelegramDebouncer } from "./telegram-debounce";

describe("telegram message debouncer", () => {
  it("coalesces multiple sends within the window to one batched send", async () => {
    const sendFn = vi.fn().mockResolvedValue(undefined);
    const debouncer = createTelegramDebouncer({ sendFn, windowMs: 50, maxQueueSize: 100 });
    debouncer.enqueue("msg-1");
    debouncer.enqueue("msg-2");
    debouncer.enqueue("msg-3");
    await new Promise((r) => setTimeout(r, 80));
    expect(sendFn).toHaveBeenCalledOnce();
    const [text] = sendFn.mock.calls[0]!;
    expect(text).toContain("msg-1");
    expect(text).toContain("msg-2");
    expect(text).toContain("msg-3");
  });

  it("flushes immediately when maxQueueSize is hit (quality preserved)", async () => {
    const sendFn = vi.fn().mockResolvedValue(undefined);
    const debouncer = createTelegramDebouncer({ sendFn, windowMs: 1000, maxQueueSize: 2 });
    debouncer.enqueue("a");
    debouncer.enqueue("b");
    await new Promise((r) => setTimeout(r, 10));
    expect(sendFn).toHaveBeenCalledOnce();
  });
});
