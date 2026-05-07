import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("security remediation proof tests", () => {
  it("shared C-suite handler consumes daily quota before streamText", () => {
    const src = read("src/lib/ai/agents/shared-route-handler.ts");
    const quotaAt = src.indexOf("consumeAiQuota(user.id, tier)");
    const streamAt = src.indexOf("streamText({");

    expect(quotaAt).toBeGreaterThan(0);
    expect(streamAt).toBeGreaterThan(quotaAt);
  });

  it("CEO nested dispatch consumes quota before nested generateText", () => {
    const src = read("src/lib/ai/agents/ceo-orchestrator.ts");
    const quotaAt = src.indexOf("consumeAiQuota(userId, tier)");
    const generateAt = src.indexOf("generateText({");

    expect(quotaAt).toBeGreaterThan(0);
    expect(generateAt).toBeGreaterThan(quotaAt);
  });

  it("outreach_queue no longer has authenticated write RLS", () => {
    const migration = read("src/db/migrations/0025_security_remediation.sql");
    const schema = read("src/db/schema.ts");

    expect(migration).toContain('DROP POLICY IF EXISTS "outreach_queue_user_isolation"');
    expect(migration).toContain('FOR SELECT TO "authenticated"');
    expect(schema).toContain('pgPolicy("outreach_queue_user_select"');
    expect(schema).not.toContain('userIsolation("outreach_queue")');
  });

  it("billing-sensitive profile fields are protected by versioned migration", () => {
    const migration = read("src/db/migrations/0025_security_remediation.sql");

    expect(migration).toContain("guard_user_profile_sensitive_fields");
    expect(migration).toContain("subscription_tier is managed by billing workflows");
    expect(migration).toContain("trg_guard_user_profiles_sensitive");
  });
});
