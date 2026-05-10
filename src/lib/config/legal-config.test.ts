import { describe, it, expect } from "vitest";
import { LEGAL_CONFIG, LegalConfigSchema } from "./legal-config";

/**
 * Legal cadence guardrails:
 *   - Zod parses the config without throwing.
 *   - Top-level keys match a frozen whitelist (catches rogue additions).
 *   - Locked-value spot checks for governing law, retention, sub-processors.
 *   - .strict() rejects unknown top-level + nested keys.
 */
describe("LEGAL_CONFIG", () => {
  it("parses cleanly through LegalConfigSchema", () => {
    const parsed = LegalConfigSchema.safeParse(LEGAL_CONFIG);
    if (!parsed.success) {
      throw new Error(
        `LegalConfig failed strict parse: ${JSON.stringify(parsed.error.issues, null, 2)}`,
      );
    }
    expect(parsed.success).toBe(true);
  });

  it("exposes exactly the whitelisted top-level keys", () => {
    expect(Object.keys(LEGAL_CONFIG).sort()).toEqual(
      ["entity", "refund", "eligibility", "retention", "subProcessors"].sort(),
    );
  });

  it("locks the entity values", () => {
    expect(LEGAL_CONFIG.entity.legalEntity).toBe(
      "The Tower (Armaan Arora, sole proprietor)",
    );
    expect(LEGAL_CONFIG.entity.governingLaw).toBe(
      "the State of New York, United States",
    );
    expect(LEGAL_CONFIG.entity.supportEmail).toBe("hello@interntower.com");
    expect(LEGAL_CONFIG.entity.legalRevisedOn).toBe("2026-04-25");
  });

  it("locks the refund copy verbatim", () => {
    expect(LEGAL_CONFIG.refund.headline).toBe(
      "Cancel anytime through Settings → Billing.",
    );
    expect(LEGAL_CONFIG.refund.body).toBe(
      "Subscriptions are billed monthly or annually and renew automatically until canceled. Cancel anytime through Settings → Billing — your access continues through the end of the current paid period, then stops. We do not refund partial periods.",
    );
  });

  it("locks eligibility + retention numbers", () => {
    expect(LEGAL_CONFIG.eligibility.minimumAge).toBe(13);
    expect(LEGAL_CONFIG.retention.softDeleteDays).toBe(30);
    expect(LEGAL_CONFIG.retention.rightsRequestSlaDays).toBe(30);
  });

  it("renders exactly nine sub-processors in the locked order", () => {
    expect(LEGAL_CONFIG.subProcessors).toHaveLength(9);
    expect(LEGAL_CONFIG.subProcessors.map((s) => s.name)).toEqual([
      "Supabase",
      "Vercel",
      "Anthropic",
      "OpenAI",
      "Firecrawl",
      "Resend",
      "Sentry",
      "Stripe",
      "Plausible",
    ]);
  });

  it("every sub-processor has a valid HTTPS privacy URL", () => {
    for (const sp of LEGAL_CONFIG.subProcessors) {
      expect(() => new URL(sp.privacyUrl)).not.toThrow();
      expect(sp.privacyUrl).toMatch(/^https:\/\//);
    }
  });

  it("rejects an unknown top-level key under .strict()", () => {
    const bad = { ...LEGAL_CONFIG, mystery: true };
    expect(LegalConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown nested key under .strict()", () => {
    const bad = {
      ...LEGAL_CONFIG,
      entity: { ...LEGAL_CONFIG.entity, ghost: "x" },
    };
    expect(LegalConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a malformed legalRevisedOn date", () => {
    const bad = {
      ...LEGAL_CONFIG,
      entity: { ...LEGAL_CONFIG.entity, legalRevisedOn: "Apr 25, 2026" },
    };
    expect(LegalConfigSchema.safeParse(bad).success).toBe(false);
  });
});
