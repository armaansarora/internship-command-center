/**
 * Tests for the agent_memory write-path dedup helper.
 *
 * `normaliseMemoryContent` is pure so we test it in isolation. The full
 * `storeAgentMemory` dedup branch is exercised end-to-end against a real
 * Supabase fixture in the memory-pipeline proof test — this file only locks
 * down the matching semantics of the normaliser.
 */
import { describe, expect, it } from "vitest";
import { normaliseMemoryContent } from "../agent-memory-rest";

describe("normaliseMemoryContent", () => {
  it("collapses internal whitespace to a single space", () => {
    expect(normaliseMemoryContent("Sarah  Chen\t\tat  JLL")).toBe(
      "sarah chen at jll",
    );
  });

  it("treats casing as equivalent (Sarah / sarah / SARAH)", () => {
    const a = normaliseMemoryContent("Sarah Chen is the warmest lead at JLL");
    const b = normaliseMemoryContent("sarah chen is the warmest lead at jll");
    const c = normaliseMemoryContent("SARAH CHEN IS THE WARMEST LEAD AT JLL");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("returns empty string for whitespace-only inputs", () => {
    expect(normaliseMemoryContent("")).toBe("");
    expect(normaliseMemoryContent("   ")).toBe("");
    expect(normaliseMemoryContent("\n\t  \n")).toBe("");
  });

  it("preserves punctuation so 'I love Apple.' is NOT the same as 'I love Apple,'", () => {
    // We deliberately keep punctuation so the dedup is conservative — it
    // treats two memories with different punctuation as DIFFERENT memories
    // rather than over-collapsing them.
    const a = normaliseMemoryContent("I love Apple.");
    const b = normaliseMemoryContent("I love Apple,");
    expect(a).not.toBe(b);
  });

  it("trims leading and trailing whitespace", () => {
    expect(normaliseMemoryContent("  hello  ")).toBe("hello");
  });

  it("never returns a value larger than the input length (idempotent on collapse)", () => {
    const input = "a    b    c    d";
    const out = normaliseMemoryContent(input);
    expect(out.length).toBeLessThanOrEqual(input.length);
  });
});
