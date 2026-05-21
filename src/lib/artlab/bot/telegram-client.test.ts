import { describe, expect, it, vi, beforeEach } from "vitest";
import { createTelegramClient } from "./telegram-client";

describe("telegram client", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("getUpdates uses long-poll with timeout=60 and offset", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: [{ update_id: 5, message: { chat: { id: 1 }, text: "hi" } }] }),
    } as Response);
    const client = createTelegramClient({ token: "T", fetch: fetchMock });
    const result = await client.getUpdates({ offset: 0 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/timeout=60/);
    expect(String(url)).toMatch(/offset=0/);
    expect(result).toHaveLength(1);
    expect(result[0]!.update_id).toBe(5);
  });

  it("sendMessage POSTs JSON to /sendMessage", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 9 } }),
    } as Response);
    const client = createTelegramClient({ token: "T", fetch: fetchMock });
    const result = await client.sendMessage({ chatId: 99, text: "hello" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({ chat_id: 99, text: "hello" });
    expect(result.message_id).toBe(9);
  });

  it("throws on non-ok HTTP response with status in message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ ok: false, description: "Too Many Requests" }),
    } as Response);
    const client = createTelegramClient({ token: "T", fetch: fetchMock });
    await expect(client.sendMessage({ chatId: 1, text: "x" })).rejects.toThrow(/429/);
  });
});
