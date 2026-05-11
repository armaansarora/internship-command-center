import { describe, it, expect } from "vitest";
import {
  hashForAudit,
  hashForAuditOrNull,
  redactSnippetForAudit,
} from "./pii-redact";

describe("hashForAudit", () => {
  it("returns a stable 16-char hex digest", () => {
    const a = hashForAudit("alice@example.com");
    const b = hashForAudit("alice@example.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it("differs across inputs", () => {
    expect(hashForAudit("alice@example.com")).not.toBe(
      hashForAudit("bob@example.com"),
    );
  });
});

describe("hashForAuditOrNull", () => {
  it("returns null for empty / nullish inputs", () => {
    expect(hashForAuditOrNull(null)).toBeNull();
    expect(hashForAuditOrNull(undefined)).toBeNull();
    expect(hashForAuditOrNull("")).toBeNull();
  });

  it("hashes when a value is present", () => {
    expect(hashForAuditOrNull("alice@example.com")).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("redactSnippetForAudit", () => {
  it("strips embedded email addresses", () => {
    const out = redactSnippetForAudit("ping victim@example.org for details");
    expect(out).not.toContain("victim@example.org");
    expect(out).toContain("[email]");
  });

  it("strips http(s) urls", () => {
    const out = redactSnippetForAudit("visit https://phish.example/abc now");
    expect(out).not.toContain("phish.example");
    expect(out).toContain("[url]");
  });

  it("strips long digit runs (>=7)", () => {
    const out = redactSnippetForAudit("call 5551234567 or short 12345");
    expect(out).not.toContain("5551234567");
    // Short digit groups are preserved — keep numeric prose readable.
    expect(out).toContain("12345");
    expect(out).toContain("[digits]");
  });

  it("collapses whitespace and caps length", () => {
    const out = redactSnippetForAudit("a".repeat(500), 200);
    expect(out.length).toBeLessThanOrEqual(200);
  });

  it("preserves benign prose intact (no false positives)", () => {
    const benign = "User clicked a button at 12:00, then closed the modal.";
    expect(redactSnippetForAudit(benign)).toBe(benign);
  });

  it("handles empty input safely", () => {
    expect(redactSnippetForAudit("")).toBe("");
  });
});
