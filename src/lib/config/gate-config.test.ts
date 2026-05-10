import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { GATE_CONFIG, GateConfigSchema } from "./gate-config";

/**
 * Gate cadence guardrails:
 *   - Zod parses the config.
 *   - Top-level keys match a frozen whitelist.
 *   - Locked-value spot checks for brand, beta mode, waitlist flag.
 *   - url() and plausibleEnabled() are env-thunks: reads process.env on call.
 *   - .strict() rejects unknown keys.
 */
describe("GATE_CONFIG", () => {
  let prevAppUrl: string | undefined;
  let prevPlausible: string | undefined;

  beforeEach(() => {
    prevAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    prevPlausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  });

  afterEach(() => {
    if (prevAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevAppUrl;

    if (prevPlausible === undefined) delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    else process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = prevPlausible;
  });

  it("parses cleanly through GateConfigSchema", () => {
    const parsed = GateConfigSchema.safeParse(GATE_CONFIG);
    if (!parsed.success) {
      throw new Error(
        `GateConfig failed strict parse: ${JSON.stringify(parsed.error.issues, null, 2)}`,
      );
    }
    expect(parsed.success).toBe(true);
  });

  it("exposes exactly the whitelisted top-level keys", () => {
    expect(Object.keys(GATE_CONFIG).sort()).toEqual(
      ["brand", "beta", "eligibility", "flags"].sort(),
    );
  });

  it("locks the brand identity values", () => {
    expect(GATE_CONFIG.brand.name).toBe("The Tower");
    expect(GATE_CONFIG.brand.tagline).toBe(
      "An immersive command center for the internship search.",
    );
    expect(GATE_CONFIG.brand.domain).toBe("interntower.com");
    expect(GATE_CONFIG.brand.senderEmail).toBe("concierge@interntower.com");
  });

  it("url() returns env override when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://preview.interntower.com";
    expect(GATE_CONFIG.brand.url()).toBe("https://preview.interntower.com");
  });

  it("url() falls back to production when env unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(GATE_CONFIG.brand.url()).toBe("https://www.interntower.com");
  });

  it("locks beta gate to waitlist mode with the rolling invite cap", () => {
    expect(GATE_CONFIG.beta.mode).toBe("waitlist");
    expect(GATE_CONFIG.beta.rollingInvitesPerDay).toBe(25);
  });

  it("opens to all jurisdictions by default", () => {
    expect(GATE_CONFIG.eligibility.blockedCountries).toEqual([]);
  });

  it("flags waitlist public; plausibleEnabled is a thunk over env", () => {
    expect(GATE_CONFIG.flags.waitlistPublic).toBe(true);

    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    expect(GATE_CONFIG.flags.plausibleEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "example.com";
    expect(GATE_CONFIG.flags.plausibleEnabled()).toBe(true);
  });

  it("rejects an unknown top-level key under .strict()", () => {
    const bad = { ...GATE_CONFIG, mystery: true };
    expect(GateConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown nested brand key under .strict()", () => {
    const bad = {
      ...GATE_CONFIG,
      brand: { ...GATE_CONFIG.brand, ghost: "x" },
    };
    expect(GateConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid beta mode", () => {
    const bad = {
      ...GATE_CONFIG,
      beta: { ...GATE_CONFIG.beta, mode: "secret-mode" },
    };
    expect(GateConfigSchema.safeParse(bad).success).toBe(false);
  });
});
