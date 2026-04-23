/**
 * R5.2 — PDF parse unit tests.
 *
 * Focuses on the ReDoS guard (pure fn, easy to test) rather than the
 * pdfjs-dist integration (covered by the route test via an injected mock).
 */
import { describe, it, expect } from "vitest";
import { runRedosGuard, MAX_PAGES, MAX_PARSED_TEXT_BYTES, MAX_FILE_BYTES } from "../parse";

describe("R5.2 ReDoS guard", () => {
  it("accepts a normal resume text block", () => {
    const text = `Jane Doe
        Software Engineer

        Experience
        - Built a thing
        - Shipped another thing

        Education
        - NYU, BS Computer Science`;
    expect(runRedosGuard(text).ok).toBe(true);
  });

  it("rejects a 10k-character token with no whitespace (alternating chars)", () => {
    // Alternating chars so we trip the long-token check without also
    // tripping the long-character-run check.
    const pathological = "ab".repeat(5001); // 10002 chars, no whitespace
    const result = runRedosGuard(pathological);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("pathological_long_token");
    }
  });

  it("rejects a 1000-character run of the same character", () => {
    const text = `Normal resume. ${"y".repeat(1001)} more normal text.`;
    const result = runRedosGuard(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("long_character_run");
    }
  });

  it("rejects 51+ consecutive backslashes", () => {
    const text = `Resume: ${"\\".repeat(51)} more content`;
    const result = runRedosGuard(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("excessive_backslashes");
    }
  });

  it("accepts text with up to 50 consecutive backslashes", () => {
    const text = `Resume: ${"\\".repeat(50)} more content`;
    expect(runRedosGuard(text).ok).toBe(true);
  });

  it("accepts long but well-formed resume text", () => {
    const longButNormal = Array.from({ length: 100 }, () =>
      "Built something interesting and shipped it on time.",
    ).join(" ");
    expect(runRedosGuard(longButNormal).ok).toBe(true);
  });
});

describe("R5.2 parse module constants", () => {
  it("caps page count at 50", () => {
    expect(MAX_PAGES).toBe(50);
  });

  it("caps parsed text at 500KB", () => {
    expect(MAX_PARSED_TEXT_BYTES).toBe(500_000);
  });

  it("caps file size at 10MB (bucket limit parity)", () => {
    expect(MAX_FILE_BYTES).toBe(10_485_760);
  });
});
