import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createGeminiBrain } from "./gemini-brain";

describe("gemini-brain", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch") as ReturnType<typeof vi.spyOn>;
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function mockOkResponse(jsonString: string): Response {
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: jsonString }] } }],
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 100 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }

  it("parses a valid JSON response from Gemini and returns outputJson", async () => {
    fetchSpy.mockResolvedValue(mockOkResponse(JSON.stringify({
      prompts: [{ laneIndex: 1, prompt: "test", variationAxis: "stance" }],
    })));
    const brain = createGeminiBrain({ apiKey: "test-key" });
    const result = await brain.decide({
      kind: "generate-concept-prompts",
      input: { characterId: "cno" },
    });
    expect(result.outputJson.prompts).toBeDefined();
    expect(result.tokensIn).toBe(50);
    expect(result.tokensOut).toBe(100);
    expect(result.model).toBe("gemini-3-pro-preview");
  });

  it("calls the configured Gemini text-completion endpoint with json response mime", async () => {
    fetchSpy.mockResolvedValue(mockOkResponse(JSON.stringify({ ok: true })));
    const brain = createGeminiBrain({ apiKey: "test-key" });
    await brain.decide({ kind: "recommend-direction", input: { lanes: [] } });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toContain("gemini-3-pro-preview:generateContent");
    expect(url).toContain("key=test-key");
    const body = JSON.parse(opts.body) as {
      systemInstruction?: { parts: { text: string }[] };
      generationConfig?: { responseMimeType?: string };
    };
    expect(body.generationConfig?.responseMimeType).toBe("application/json");
    expect(body.systemInstruction?.parts[0]?.text).toMatch(/recommendation brain/i);
  });

  it("returns {rawText} when Gemini emits non-JSON", async () => {
    fetchSpy.mockResolvedValue(mockOkResponse("this is not json"));
    const brain = createGeminiBrain({ apiKey: "test-key" });
    const result = await brain.decide({
      kind: "blocker-message-drafting",
      input: { blocker: "x" },
    });
    expect(result.outputJson.rawText).toBe("this is not json");
  });

  it("throws on HTTP errors with a short snippet of the body", async () => {
    fetchSpy.mockResolvedValue(new Response("API_KEY_INVALID", { status: 400 }));
    const brain = createGeminiBrain({ apiKey: "bad-key" });
    await expect(
      brain.decide({ kind: "recommend-direction", input: {} }),
    ).rejects.toThrow(/HTTP 400.*API_KEY_INVALID/);
  });

  it("accepts an explicit model override", async () => {
    fetchSpy.mockResolvedValue(mockOkResponse(JSON.stringify({ ok: true })));
    const brain = createGeminiBrain({ apiKey: "k", model: "gemini-2.5-pro" });
    await brain.decide({ kind: "recommend-direction", input: {} });
    const [url] = fetchSpy.mock.calls[0] as unknown as [string];
    expect(url).toContain("gemini-2.5-pro:generateContent");
  });

  it("attaches inlineData parts when req.images is provided (multimodal)", async () => {
    fetchSpy.mockResolvedValue(mockOkResponse(JSON.stringify({ recommendedLane: 3, summary: "ok" })));
    const brain = createGeminiBrain({ apiKey: "k" });
    const bytes = Buffer.from("fake-png-bytes");
    await brain.decide({
      kind: "critique-concept-board",
      input: { laneCount: 5 },
      images: [{ bytes, mimeType: "image/png" }],
    });
    const [, opts] = fetchSpy.mock.calls[0] as unknown as [string, { body: string }];
    const body = JSON.parse(opts.body) as {
      contents: Array<{ parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }>;
    };
    const userParts = body.contents[0]!.parts;
    expect(userParts).toHaveLength(2); // text + 1 image
    expect(userParts[0]!.text).toBeDefined();
    expect(userParts[1]!.inlineData?.mimeType).toBe("image/png");
    expect(userParts[1]!.inlineData?.data).toBe(bytes.toString("base64"));
  });

  it("retries on transient 503 then succeeds", async () => {
    const fail = new Response("temporarily unavailable", { status: 503 });
    const ok = mockOkResponse(JSON.stringify({ recommendedLane: 3, summary: "ok" }));
    fetchSpy
      .mockResolvedValueOnce(fail as never)
      .mockResolvedValueOnce(ok as never);
    const brain = createGeminiBrain({ apiKey: "k" });
    const result = await brain.decide({ kind: "recommend-direction", input: {} });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.retryCount).toBe(1);
    expect(result.lastTransientError).toMatch(/503/);
  }, 20_000);

  it("does NOT retry on non-retryable 400", async () => {
    fetchSpy.mockResolvedValue(new Response("API_KEY_INVALID", { status: 400 }) as never);
    const brain = createGeminiBrain({ apiKey: "bad" });
    await expect(brain.decide({ kind: "recommend-direction", input: {} }))
      .rejects.toThrow(/400/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("tags _parseError when Gemini emits non-JSON", async () => {
    fetchSpy.mockResolvedValue(mockOkResponse("this is not json"));
    const brain = createGeminiBrain({ apiKey: "k" });
    const result = await brain.decide({ kind: "blocker-message-drafting", input: { blocker: "x" } });
    expect(result.outputJson._parseError).toBe("malformed-json");
    expect(result.outputJson.rawText).toBe("this is not json");
    expect(result.validationError).toMatch(/raw-text/);
  });

  it("sets validationError when output misses required schema fields", async () => {
    // generate-concept-prompts requires {prompts: [...].length===5}; supply 2.
    fetchSpy.mockResolvedValue(mockOkResponse(JSON.stringify({
      prompts: [
        { laneIndex: 1, prompt: "p1 here is enough content", variationAxis: "axis" },
        { laneIndex: 2, prompt: "p2 here is enough content", variationAxis: "axis" },
      ],
    })));
    const brain = createGeminiBrain({ apiKey: "k" });
    const result = await brain.decide({
      kind: "generate-concept-prompts",
      input: { characterId: "cno" },
    });
    expect(result.validationError).toBeDefined();
    expect(result.validationError).toMatch(/prompts/);
  });

  it("returns no validationError for clean valid output", async () => {
    fetchSpy.mockResolvedValue(mockOkResponse(JSON.stringify({
      laneIndex: 3,
      reasoning: "balanced",
    })));
    const brain = createGeminiBrain({ apiKey: "k" });
    const result = await brain.decide({ kind: "recommend-direction", input: {} });
    expect(result.validationError).toBeUndefined();
    expect(result.retryCount).toBe(0);
  });

  it("records durationMs", async () => {
    fetchSpy.mockResolvedValue(mockOkResponse(JSON.stringify({ ok: true })));
    const brain = createGeminiBrain({ apiKey: "k" });
    const result = await brain.decide({ kind: "blocker-message-drafting", input: { blocker: "x" } });
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs!).toBeGreaterThanOrEqual(0);
  });

  it("attaches multiple images in order", async () => {
    fetchSpy.mockResolvedValue(mockOkResponse(JSON.stringify({ ok: true })));
    const brain = createGeminiBrain({ apiKey: "k" });
    const a = Buffer.from("aaa");
    const b = Buffer.from("bbb");
    await brain.decide({
      kind: "critique-production-sprites",
      input: {},
      images: [{ bytes: a, mimeType: "image/png" }, { bytes: b, mimeType: "image/jpeg" }],
    });
    const [, opts] = fetchSpy.mock.calls[0] as unknown as [string, { body: string }];
    const body = JSON.parse(opts.body) as {
      contents: Array<{ parts: Array<{ inlineData?: { mimeType: string; data: string } }> }>;
    };
    const parts = body.contents[0]!.parts;
    expect(parts).toHaveLength(3); // 1 text + 2 images
    expect(parts[1]!.inlineData?.data).toBe(a.toString("base64"));
    expect(parts[2]!.inlineData?.data).toBe(b.toString("base64"));
    expect(parts[2]!.inlineData?.mimeType).toBe("image/jpeg");
  });
});
