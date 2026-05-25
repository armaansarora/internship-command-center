import { describe, expect, it } from "vitest";
import {
  buildClarificationKeyboard,
  buildConceptInlineKeyboard,
  buildFinalInlineKeyboard,
  buildUrlKeyboard,
  decodeCallback,
  encodeClarificationCallback,
  encodeGateCallback,
  shortenRunId,
} from "./inline-keyboards";

const SAMPLE_RUN_ID = "a4f3c721-3aa8-4d68-9e51-2c30fa6e6f7d";

describe("inline-keyboards encode/decode", () => {
  it("encodes a concept approve-direction callback within 64 bytes", () => {
    const payload = encodeGateCallback("concept", SAMPLE_RUN_ID, { kind: "approve-direction", laneIndex: 3 });
    expect(Buffer.byteLength(payload, "utf8")).toBeLessThanOrEqual(64);
    expect(payload).toMatch(/^gate:c:[a-f0-9]{8}:d3$/);
  });

  it("decodes gate:c:<id>:d3 back to approve-direction lane 3", () => {
    const payload = encodeGateCallback("concept", SAMPLE_RUN_ID, { kind: "approve-direction", laneIndex: 3 });
    const decoded = decodeCallback(payload);
    expect(decoded).toEqual({
      kind: "gate",
      surface: "concept",
      shortRunId: shortenRunId(SAMPLE_RUN_ID),
      action: { kind: "approve-direction", laneIndex: 3 },
    });
  });

  it("round-trips final approve-final", () => {
    const payload = encodeGateCallback("final", SAMPLE_RUN_ID, { kind: "approve-final" });
    const decoded = decodeCallback(payload);
    expect(decoded?.kind).toBe("gate");
    if (decoded?.kind === "gate") {
      expect(decoded.surface).toBe("final");
      expect(decoded.action).toEqual({ kind: "approve-final" });
    }
  });

  it("encodes revise + reject + decodes back", () => {
    expect(decodeCallback(encodeGateCallback("concept", SAMPLE_RUN_ID, { kind: "revise" }))).toMatchObject({
      action: { kind: "revise" },
    });
    expect(decodeCallback(encodeGateCallback("concept", SAMPLE_RUN_ID, { kind: "reject" }))).toMatchObject({
      action: { kind: "reject" },
    });
  });

  it("clarification callbacks encode + decode", () => {
    const payload = encodeClarificationCallback("character-floor");
    const decoded = decodeCallback(payload);
    expect(decoded).toEqual({ kind: "clarification", optionId: "character-floor" });
  });

  it("returns null on garbage callback_data", () => {
    expect(decodeCallback("garbage")).toBeNull();
    expect(decodeCallback("gate:?:?:?")).toBeNull();
    expect(decodeCallback("gate:c:abc:zz")).toBeNull();
  });

  it("concept inline keyboard has 5 direction buttons + refine + revise/reject", () => {
    const kb = buildConceptInlineKeyboard(SAMPLE_RUN_ID);
    expect(kb.inline_keyboard).toHaveLength(3);
    expect(kb.inline_keyboard[0]).toHaveLength(5); // 5 direction buttons
    expect(kb.inline_keyboard[1]).toHaveLength(1); // refine
    expect(kb.inline_keyboard[2]).toHaveLength(2); // revise + reject
    for (const row of kb.inline_keyboard) {
      for (const btn of row) {
        if (btn.callback_data) {
          expect(Buffer.byteLength(btn.callback_data, "utf8")).toBeLessThanOrEqual(64);
        }
      }
    }
  });

  it("final inline keyboard has approve + reject", () => {
    const kb = buildFinalInlineKeyboard(SAMPLE_RUN_ID);
    expect(kb.inline_keyboard).toHaveLength(1);
    expect(kb.inline_keyboard[0]).toHaveLength(2);
    expect(kb.inline_keyboard[0]![0]!.text).toMatch(/approve/i);
  });

  it("clarification keyboard renders each option as its own row", () => {
    const kb = buildClarificationKeyboard([
      { id: "char", label: "👤 Character" },
      { id: "floor", label: "🏙️ Floor plate" },
    ]);
    expect(kb.inline_keyboard).toHaveLength(2);
    expect(kb.inline_keyboard[0]![0]!.text).toBe("👤 Character");
  });

  it("url keyboard sends a single tap-through button", () => {
    const kb = buildUrlKeyboard("Open live floor", "https://www.interntower.com/rolodex-lounge");
    expect(kb.inline_keyboard[0]![0]!.url).toMatch(/^https:/);
  });
});
