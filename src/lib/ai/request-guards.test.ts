import { describe, expect, it } from "vitest";
import {
  MAX_UI_MESSAGE_BODY_BYTES,
  parseUiMessageRequest,
} from "@/lib/ai/request-guards";

describe("parseUiMessageRequest", () => {
  it("accepts a bounded UI message payload", async () => {
    const request = new Request("https://example.test/api/agent", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", parts: [{ type: "text", text: "hello" }] }],
      }),
    });

    const result = await parseUiMessageRequest(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.messages).toHaveLength(1);
    }
  });

  it("rejects declared oversized payloads before parsing", async () => {
    const request = new Request("https://example.test/api/agent", {
      method: "POST",
      headers: {
        "content-length": String(MAX_UI_MESSAGE_BODY_BYTES + 1),
      },
      body: "{}",
    });

    const result = await parseUiMessageRequest(request);

    expect(result).toEqual({
      ok: false,
      error: "request_body_too_large",
      status: 413,
    });
  });

  it("rejects streamed oversized payloads without a content-length header", async () => {
    const request = new Request("https://example.test/api/agent", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            parts: [{ type: "text", text: "x".repeat(MAX_UI_MESSAGE_BODY_BYTES) }],
          },
        ],
      }),
    });

    const result = await parseUiMessageRequest(request);

    expect(result).toEqual({
      ok: false,
      error: "request_body_too_large",
      status: 413,
    });
  });
});
