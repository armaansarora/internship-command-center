# R11 Cross-user Warm-Intro Matching — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace the 403 `gated-red-team-pending` hard-stop on `/api/networking/match-candidates` with real cross-user matching behind the full Red Team checklist (consent-version gate, rate limit, audit log, cron populator, delta re-scan).

**Architecture:** Populator cron + delta trigger writes ranked anonymized candidates to `match_candidate_index`. User-facing route reads the index behind consent + version + rate-limit gates and writes each surfaced candidate to `match_events` (audit log). Counterparties anonymized via HMAC of contact_id. Heuristic scoring: `warmth × company_overlap × recency`.

**Tech Stack:** Next.js 16 App Router, Supabase REST (runtime data access), Drizzle (schema only), Postgres RLS, pgcrypto/hmac.

**Ledger mapping:** One task below per ledger row R11.1–R11.10. R11.11 is partner Red Team (post-autopilot). R11.12 is `tower accept R11` (after verify passes).

**Phase-level commits use the `[R11/11.N]` tag.** Autopilot uses `npm run t start R11.N` / `npm run t done R11.N` around each task.

**Verify gate reference:** `npm run t verify R11` — tasks complete + blockers empty + drift clean + tests + tsc + build + lint. Do NOT use `tower accept` until R11.11 partner pass is done.

---

## Task R11.1: Consent-version schema + CURRENT_CONSENT_VERSION constant

**Files:**
- Create: `src/lib/networking/consent-version.ts`
- Create: `src/lib/networking/__tests__/consent-version.test.ts`
- Modify: `src/lib/networking/consent-guard.ts` — extend `ConsentShape` with `networking_consent_version`, extend `assertConsented` to return 403 `consent-version-stale` when stored version < current
- Modify: `src/lib/networking/__tests__/consent-guard.test.ts` (create if missing) — test version gate
- Modify: `src/app/api/networking/opt-in/route.ts` — import and use `CURRENT_CONSENT_VERSION` (replace hardcoded `1`)

**Note:** Schema column `networking_consent_version` already exists from migration 0018. This task is code-only.

**Step 1: Write failing test for CURRENT_CONSENT_VERSION constant**

```ts
// src/lib/networking/__tests__/consent-version.test.ts
import {describe, it, expect} from "vitest";
import {CURRENT_CONSENT_VERSION} from "../consent-version";

describe("CURRENT_CONSENT_VERSION", () => {
  it("is set to 2 for R11 matching copy bump", () => {
    expect(CURRENT_CONSENT_VERSION).toBe(2);
  });
});
```

**Step 2: Run — expect fail (file does not exist)**

`npx vitest run src/lib/networking/__tests__/consent-version.test.ts`

**Step 3: Create constant**

```ts
// src/lib/networking/consent-version.ts
/**
 * R11 — bumped from 1 → 2 when the consent copy gained language about
 * match queries being rate-limited and the audit log surface. All users
 * at version < CURRENT_CONSENT_VERSION become `consent-version-stale`
 * until they re-consent via the NetworkingConsent component.
 */
export const CURRENT_CONSENT_VERSION = 2;
```

**Step 4: Run — expect pass**

**Step 5: Write failing test for version gate**

```ts
// src/lib/networking/__tests__/consent-guard.test.ts
import {describe, it, expect, vi, beforeEach} from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("../consent-version", () => ({
  CURRENT_CONSENT_VERSION: 2,
}));

import {isConsentedShape} from "../consent-guard";

describe("isConsentedShape", () => {
  it("returns true when consented + no revoke", () => {
    expect(isConsentedShape({
      networking_consent_at: "2026-04-24T00:00:00Z",
      networking_revoked_at: null,
    })).toBe(true);
  });
  it("returns false when never consented", () => {
    expect(isConsentedShape({
      networking_consent_at: null,
      networking_revoked_at: null,
    })).toBe(false);
  });
  it("returns false when revoked after consent", () => {
    expect(isConsentedShape({
      networking_consent_at: "2026-04-20T00:00:00Z",
      networking_revoked_at: "2026-04-21T00:00:00Z",
    })).toBe(false);
  });
});
```

Plus a test block for `assertConsented` with version gate — uses createClient mock to return a row with `networking_consent_version: 1`, expects `consent-version-stale` 403.

```ts
describe("assertConsented version gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 consent-version-stale when stored version < CURRENT", async () => {
    const {createClient} = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                networking_consent_at: "2026-04-20T00:00:00Z",
                networking_revoked_at: null,
                networking_consent_version: 1,
              },
            }),
          }),
        }),
      }),
    });
    const {assertConsented} = await import("../consent-guard");
    const res = await assertConsented("user-1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.reason).toBe("consent-version-stale");
  });

  it("returns null when version matches CURRENT", async () => {
    const {createClient} = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                networking_consent_at: "2026-04-20T00:00:00Z",
                networking_revoked_at: null,
                networking_consent_version: 2,
              },
            }),
          }),
        }),
      }),
    });
    const {assertConsented} = await import("../consent-guard");
    const res = await assertConsented("user-1");
    expect(res).toBeNull();
  });

  it("returns 403 consent-required when no row", async () => {
    const {createClient} = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({data: null}),
          }),
        }),
      }),
    });
    const {assertConsented} = await import("../consent-guard");
    const res = await assertConsented("user-1");
    expect(res!.status).toBe(403);
    expect((await res!.json()).reason).toBe("consent-required");
  });
});
```

**Step 6: Run — expect fail**

**Step 7: Extend consent-guard.ts**

```ts
// Append to ConsentShape interface
export interface ConsentShape {
  networking_consent_at: string | null;
  networking_revoked_at: string | null;
  networking_consent_version: number | null;  // NEW
}

// Extend readConsent select clause
const {data} = await sb
  .from("user_profiles")
  .select("networking_consent_at, networking_revoked_at, networking_consent_version")  // NEW col
  .eq("id", userId)
  .maybeSingle();

// Extend assertConsented
import {CURRENT_CONSENT_VERSION} from "./consent-version";

export async function assertConsented(userId: string): Promise<NextResponse | null> {
  const row = await readConsent(userId);
  if (!row || !isConsentedShape(row)) {
    return NextResponse.json({ok: false, reason: "consent-required"}, {status: 403});
  }
  if ((row.networking_consent_version ?? 0) < CURRENT_CONSENT_VERSION) {
    return NextResponse.json({ok: false, reason: "consent-version-stale"}, {status: 403});
  }
  return null;
}
```

**Step 8: Update opt-in route**

```ts
// src/app/api/networking/opt-in/route.ts — replace local CONSENT_VERSION = 1
import {CURRENT_CONSENT_VERSION} from "@/lib/networking/consent-version";

const {error} = await sb
  .from("user_profiles")
  .update({
    networking_consent_at: new Date().toISOString(),
    networking_revoked_at: null,
    networking_consent_version: CURRENT_CONSENT_VERSION,
  })
  .eq("id", user.id);
```

**Step 9: Run all consent + opt-in tests — expect pass**

`npx vitest run src/lib/networking src/app/api/networking/opt-in`

**Step 10: Commit**

```bash
npm run t start R11.1
# ... edits ...
git add src/lib/networking/consent-version.ts src/lib/networking/__tests__/consent-version.test.ts src/lib/networking/consent-guard.ts src/lib/networking/__tests__/consent-guard.test.ts src/app/api/networking/opt-in/route.ts
git commit -m "[R11/11.1] feat(r11): consent-version gate + CURRENT_CONSENT_VERSION=2"
npm run t done R11.1
```

---

## Task R11.2: Match-candidate index schema (migration 0022)

**Files:**
- Create: `src/db/migrations/0022_r11_cross_user_matching.sql`
- Modify: `src/db/schema.ts` — add `matchCandidateIndex`, `matchEvents`, `matchRateLimits` pgTable definitions + `matchIndexLastRescanAt` user_profiles column
- Create: `src/db/__tests__/schema-r11.test.ts` — assert column names + RLS shape

**Step 1: Write failing schema-assertion test**

```ts
// src/db/__tests__/schema-r11.test.ts
import {describe, it, expect} from "vitest";
import {getTableColumns} from "drizzle-orm";
import {
  matchCandidateIndex, matchEvents, matchRateLimits, userProfiles,
} from "../schema";

describe("R11 schema", () => {
  it("matchCandidateIndex columns", () => {
    const cols = Object.keys(getTableColumns(matchCandidateIndex));
    expect(cols).toEqual(expect.arrayContaining([
      "id", "userId", "counterpartyAnonKey", "companyContext",
      "edgeStrength", "insertedAt", "invalidatesAt",
    ]));
  });
  it("matchEvents columns", () => {
    const cols = Object.keys(getTableColumns(matchEvents));
    expect(cols).toEqual(expect.arrayContaining([
      "id", "userId", "counterpartyAnonKey", "companyContext",
      "edgeStrength", "firedAt", "matchReason",
    ]));
  });
  it("matchRateLimits columns", () => {
    const cols = Object.keys(getTableColumns(matchRateLimits));
    expect(cols).toEqual(expect.arrayContaining([
      "userId", "hourBucket", "count",
    ]));
  });
  it("userProfiles gains matchIndexLastRescanAt", () => {
    const cols = Object.keys(getTableColumns(userProfiles));
    expect(cols).toContain("matchIndexLastRescanAt");
  });
});
```

**Step 2: Run — expect fail (tables not exported)**

**Step 3: Write migration 0022**

See full SQL in the design doc §"Schema additions (migration 0022, additive)". Key tables: `match_candidate_index`, `match_events`, `match_rate_limits` + `bump_match_rate_limit` RPC + `match_index_last_rescan_at` column on `user_profiles`. All tables enable RLS with user-isolation policy.

**Step 4: Extend `src/db/schema.ts`**

```ts
// Add to userProfiles
matchIndexLastRescanAt: timestamp("match_index_last_rescan_at", {withTimezone: true}),

// New tables (append near networkingMatchIndex)
export const matchCandidateIndex = pgTable("match_candidate_index", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, {onDelete: "cascade"}),
  counterpartyAnonKey: text("counterparty_anon_key").notNull(),
  companyContext: text("company_context").notNull(),
  edgeStrength: numeric("edge_strength", {precision: 4, scale: 3}).notNull(),
  insertedAt: timestamp("inserted_at", {withTimezone: true}).notNull().defaultNow(),
  invalidatesAt: timestamp("invalidates_at", {withTimezone: true}).notNull(),
}, (table) => [
  userIsolation("match_candidate_index"),
  index("idx_match_candidate_user_invalidates").on(table.userId, table.invalidatesAt),
]);

export const matchEvents = pgTable("match_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, {onDelete: "cascade"}),
  counterpartyAnonKey: text("counterparty_anon_key").notNull(),
  companyContext: text("company_context").notNull(),
  edgeStrength: numeric("edge_strength", {precision: 4, scale: 3}).notNull(),
  firedAt: timestamp("fired_at", {withTimezone: true}).notNull().defaultNow(),
  matchReason: text("match_reason").notNull(),
}, (table) => [
  userIsolation("match_events"),
  index("idx_match_events_user_fired").on(table.userId, table.firedAt.desc()),
]);

export const matchRateLimits = pgTable("match_rate_limits", {
  userId: uuid("user_id").notNull().references(() => userProfiles.id, {onDelete: "cascade"}),
  hourBucket: timestamp("hour_bucket", {withTimezone: true}).notNull(),
  count: integer("count").notNull().default(0),
}, (table) => [
  userIsolation("match_rate_limits"),
  index("idx_match_rate_limits_bucket").on(table.hourBucket),
  primaryKey({columns: [table.userId, table.hourBucket]}),
]);

export type MatchCandidateIndex = typeof matchCandidateIndex.$inferSelect;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type MatchRateLimit = typeof matchRateLimits.$inferSelect;
```

**Step 5: Run schema test — expect pass**

**Step 6: Apply migration to local Supabase via MCP** (skip if MCP unavailable; note for user action)

User applies migration 0022 via Supabase SQL Editor or `mcp__plugin_supabase_supabase__apply_migration` — add this to the final handoff's "USER ACTION" list.

**Step 7: Commit**

```bash
npm run t start R11.2
git add src/db/migrations/0022_r11_cross_user_matching.sql src/db/schema.ts src/db/__tests__/schema-r11.test.ts
git commit -m "[R11/11.2] feat(r11): schema + migration for match_candidate_index, match_events, match_rate_limits"
npm run t done R11.2
```

---

## Task R11.5 (ordering note): Match algorithm (pure function, ship before cron)

**Rationale:** R11.3 (cron) and R11.4 (delta) both call the shared rebuild helper that wraps the algorithm. Ship algorithm first.

**Files:**
- Create: `src/lib/networking/match-anon.ts`
- Create: `src/lib/networking/__tests__/match-anon.test.ts`
- Create: `src/lib/networking/match-algorithm.ts`
- Create: `src/lib/networking/__tests__/match-algorithm.test.ts`

**Step 1: Test match-anon HMAC determinism**

```ts
import {describe, it, expect, vi, beforeEach} from "vitest";

describe("counterpartyAnonKey", () => {
  beforeEach(() => {
    vi.stubEnv("MATCH_ANON_SECRET", "test-secret-32-bytes-minimum-length-ok");
  });
  it("is deterministic for same contact id", async () => {
    const {counterpartyAnonKey} = await import("../match-anon");
    expect(counterpartyAnonKey("c-1")).toBe(counterpartyAnonKey("c-1"));
  });
  it("produces different keys for different contacts", async () => {
    const {counterpartyAnonKey} = await import("../match-anon");
    expect(counterpartyAnonKey("c-1")).not.toBe(counterpartyAnonKey("c-2"));
  });
  it("throws fail-closed when secret missing", async () => {
    vi.stubEnv("MATCH_ANON_SECRET", "");
    vi.resetModules();
    const {counterpartyAnonKey} = await import("../match-anon");
    expect(() => counterpartyAnonKey("c-1")).toThrow(/MATCH_ANON_SECRET/);
  });
});
```

**Step 2: Implement match-anon**

```ts
// src/lib/networking/match-anon.ts
import {createHmac} from "node:crypto";

export function counterpartyAnonKey(contactId: string): string {
  const secret = process.env.MATCH_ANON_SECRET;
  if (!secret) {
    throw new Error("MATCH_ANON_SECRET not configured; fail-closed");
  }
  return createHmac("sha256", secret).update(contactId).digest("hex");
}
```

**Step 3: Test algorithm with fixture**

```ts
// src/lib/networking/__tests__/match-algorithm.test.ts
import {describe, it, expect} from "vitest";
import {computeMatchCandidates} from "../match-algorithm";

describe("computeMatchCandidates", () => {
  const now = new Date("2026-04-24T12:00:00Z");
  const recent = new Date("2026-04-20T00:00:00Z").toISOString();
  const cooling = new Date("2026-04-15T00:00:00Z").toISOString();
  const old = new Date("2026-03-01T00:00:00Z").toISOString();

  it("returns empty when no target companies", () => {
    const out = computeMatchCandidates({
      userTargets: [],
      counterpartyContacts: [
        {id: "c-1", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B"},
      ],
      now,
    });
    expect(out).toEqual([]);
  });

  it("scores warm + company overlap + recent application", () => {
    const out = computeMatchCandidates({
      userTargets: [{companyName: "Acme", insertedAt: recent}],
      counterpartyContacts: [
        {id: "c-1", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B"},
      ],
      now,
    });
    expect(out).toHaveLength(1);
    expect(out[0].companyContext).toBe("Acme");
    expect(parseFloat(out[0].edgeStrength)).toBeCloseTo(1.0 * 1.0 * 1.0, 3);
  });

  it("cold contacts score lower", () => {
    const out = computeMatchCandidates({
      userTargets: [{companyName: "Acme", insertedAt: recent}],
      counterpartyContacts: [
        {id: "c-cold", companyName: "Acme", lastContactAt: old, ownerUserId: "u-B"},
        {id: "c-warm", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B"},
      ],
      now,
    });
    expect(out[0].counterpartyAnonKey).not.toBe(out[1].counterpartyAnonKey);
    expect(parseFloat(out[0].edgeStrength))
      .toBeGreaterThan(parseFloat(out[1].edgeStrength));
  });

  it("excludes contacts at non-targeted companies", () => {
    const out = computeMatchCandidates({
      userTargets: [{companyName: "Acme", insertedAt: recent}],
      counterpartyContacts: [
        {id: "c-1", companyName: "Contoso", lastContactAt: recent, ownerUserId: "u-B"},
      ],
      now,
    });
    expect(out).toEqual([]);
  });

  it("is deterministic — same input → same output twice", () => {
    const input = {
      userTargets: [{companyName: "Acme", insertedAt: recent}],
      counterpartyContacts: [
        {id: "c-1", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B"},
        {id: "c-2", companyName: "Acme", lastContactAt: cooling, ownerUserId: "u-C"},
      ],
      now,
    };
    const a = computeMatchCandidates(input);
    const b = computeMatchCandidates(input);
    expect(a).toEqual(b);
  });
});
```

**Step 4: Implement algorithm**

```ts
// src/lib/networking/match-algorithm.ts
import {counterpartyAnonKey} from "./match-anon";

export interface UserTarget { companyName: string; insertedAt: string; }
export interface CounterpartyContact {
  id: string;
  companyName: string | null;
  lastContactAt: string | null;
  ownerUserId: string;
}
export interface MatchCandidate {
  counterpartyAnonKey: string;
  companyContext: string;
  edgeStrength: string;  // numeric as string for PG insert fidelity
}

function warmthFactor(lastContactAt: string | null, now: Date): number {
  if (!lastContactAt) return 0.2;
  const days = (now.getTime() - new Date(lastContactAt).getTime()) / 86_400_000;
  if (days < 7) return 1.0;
  if (days < 14) return 0.5;
  return 0.2;
}

function recencyFactor(insertedAt: string, now: Date): number {
  const days = (now.getTime() - new Date(insertedAt).getTime()) / 86_400_000;
  if (days < 7) return 1.0;
  if (days < 30) return 0.7;
  return 0.4;
}

export function computeMatchCandidates(opts: {
  userTargets: UserTarget[];
  counterpartyContacts: CounterpartyContact[];
  now: Date;
}): MatchCandidate[] {
  const {userTargets, counterpartyContacts, now} = opts;
  const targetsByCompany = new Map<string, UserTarget>();
  for (const t of userTargets) targetsByCompany.set(t.companyName.toLowerCase(), t);

  const candidates: MatchCandidate[] = [];
  for (const c of counterpartyContacts) {
    if (!c.companyName) continue;
    const target = targetsByCompany.get(c.companyName.toLowerCase());
    if (!target) continue;
    const score = warmthFactor(c.lastContactAt, now)
                * 1.0
                * recencyFactor(target.insertedAt, now);
    candidates.push({
      counterpartyAnonKey: counterpartyAnonKey(c.id),
      companyContext: c.companyName,
      edgeStrength: score.toFixed(3),
    });
  }
  // Sort desc by score, then stable tiebreaker on anon key.
  candidates.sort((a, b) =>
    parseFloat(b.edgeStrength) - parseFloat(a.edgeStrength)
    || a.counterpartyAnonKey.localeCompare(b.counterpartyAnonKey),
  );
  return candidates;
}
```

**Step 5: Run — expect pass**

**Step 6: Commit**

```bash
npm run t start R11.5
git add src/lib/networking/match-anon.ts src/lib/networking/match-algorithm.ts src/lib/networking/__tests__/*
git commit -m "[R11/11.5] feat(r11): heuristic match algorithm + HMAC anonymization"
npm run t done R11.5
```

---

## Task R11.3: Index populator cron `/api/cron/match-index`

**Files:**
- Create: `src/lib/networking/rebuild-match-index.ts` — shared per-user rebuild helper (used by cron + delta)
- Create: `src/lib/networking/__tests__/rebuild-match-index.test.ts`
- Create: `src/app/api/cron/match-index/route.ts`
- Create: `src/app/api/cron/match-index/__tests__/route.test.ts`

**Step 1: Test the shared rebuild helper**

```ts
// rebuild-match-index.test.ts — uses mocked getSupabaseAdmin
// Mocks two consented users: A targets "Acme", B has a contact "Sarah" at "Acme"
// Expected: rebuildMatchIndexForUser("A") DELETEs A's existing rows, then
// INSERTs one row keyed to hmac(Sarah.id) with edge_strength > 0.
```

(Full mock setup — see inline stubs in `src/lib/networking/__tests__/match-algorithm.test.ts` for patterns; tests should assert DELETE + INSERT call order using spies.)

**Step 2: Implement rebuild helper**

```ts
// src/lib/networking/rebuild-match-index.ts
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {computeMatchCandidates} from "./match-algorithm";
import {CURRENT_CONSENT_VERSION} from "./consent-version";
import {log} from "@/lib/logger";

const TTL_HOURS = 24;
const COUNTERPARTY_BUDGET = 500;  // cap per-user rebuild cost
const TOP_N = 25;

export async function rebuildMatchIndexForUser(userId: string): Promise<{written: number}> {
  const admin = getSupabaseAdmin();
  const now = new Date();

  // Is this user current-consent? If not, clear their index and skip.
  const {data: profile} = await admin
    .from("user_profiles")
    .select("networking_consent_at, networking_revoked_at, networking_consent_version")
    .eq("id", userId).maybeSingle();
  const consented = profile
    && profile.networking_consent_at
    && (!profile.networking_revoked_at
        || new Date(profile.networking_revoked_at) < new Date(profile.networking_consent_at))
    && (profile.networking_consent_version ?? 0) >= CURRENT_CONSENT_VERSION;

  if (!consented) {
    await admin.from("match_candidate_index").delete().eq("user_id", userId);
    return {written: 0};
  }

  const {data: targetRows} = await admin
    .from("networking_match_index")
    .select("target_company_name, created_at")
    .eq("user_id", userId);

  const userTargets = (targetRows ?? []).map((r) => ({
    companyName: r.target_company_name as string,
    insertedAt: r.created_at as string,
  }));
  if (userTargets.length === 0) {
    await admin.from("match_candidate_index").delete().eq("user_id", userId);
    return {written: 0};
  }

  // Pull ONLY contacts at target companies across OTHER consented users.
  const targetNames = userTargets.map((t) => t.companyName);
  const {data: otherContacts} = await admin
    .from("contacts")
    .select("id, company_name, last_contact_at, user_id")
    .in("company_name", targetNames)
    .neq("user_id", userId)
    .limit(COUNTERPARTY_BUDGET);

  // Filter counterparty pool to consented + current-version owners.
  const otherUserIds = Array.from(new Set((otherContacts ?? []).map((c) => c.user_id as string)));
  const {data: otherProfiles} = await admin
    .from("user_profiles")
    .select("id, networking_consent_at, networking_revoked_at, networking_consent_version")
    .in("id", otherUserIds);
  const consentedOwnerIds = new Set(
    (otherProfiles ?? [])
      .filter((p) => p.networking_consent_at
        && (!p.networking_revoked_at
            || new Date(p.networking_revoked_at as string) < new Date(p.networking_consent_at as string))
        && ((p.networking_consent_version as number | null) ?? 0) >= CURRENT_CONSENT_VERSION)
      .map((p) => p.id as string),
  );

  const counterpartyContacts = (otherContacts ?? [])
    .filter((c) => consentedOwnerIds.has(c.user_id as string))
    .map((c) => ({
      id: c.id as string,
      companyName: c.company_name as string | null,
      lastContactAt: c.last_contact_at as string | null,
      ownerUserId: c.user_id as string,
    }));

  const ranked = computeMatchCandidates({userTargets, counterpartyContacts, now}).slice(0, TOP_N);

  // Atomic-ish: delete all, insert new. Fire-and-forget log on partial fail.
  await admin.from("match_candidate_index").delete().eq("user_id", userId);
  if (ranked.length > 0) {
    const invalidatesAt = new Date(now.getTime() + TTL_HOURS * 3600_000).toISOString();
    await admin.from("match_candidate_index").insert(
      ranked.map((c) => ({
        user_id: userId,
        counterparty_anon_key: c.counterpartyAnonKey,
        company_context: c.companyContext,
        edge_strength: c.edgeStrength,
        inserted_at: now.toISOString(),
        invalidates_at: invalidatesAt,
      })),
    );
  }
  log.info("match_index.rebuilt", {userId, written: ranked.length});
  return {written: ranked.length};
}
```

**Step 3: Implement cron route (briefing shape)**

```ts
// src/app/api/cron/match-index/route.ts
import {NextResponse, type NextRequest} from "next/server";
import {verifyCronRequest} from "@/lib/auth/cron";
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {rebuildMatchIndexForUser} from "@/lib/networking/rebuild-match-index";
import {log} from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE_SIZE = 500;
const WORKERS = 6;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) return NextResponse.json({error: guard.error ?? "unauthorized"}, {status: 401});

  const admin = getSupabaseAdmin();
  const results: Array<{userId: string; status: string; written?: number}> = [];
  let page = 0;

  for (;;) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const {data: users, error} = await admin
      .from("user_profiles")
      .select("id")
      .not("networking_consent_at", "is", null)
      .range(from, to).order("id", {ascending: true});
    if (error) {
      log.error("cron.match_index.fetch_users_failed", error, {page});
      return NextResponse.json({error: error.message}, {status: 500});
    }
    const batch = users ?? [];
    if (batch.length === 0) break;

    const queue = [...batch];
    await Promise.all(
      Array.from({length: Math.min(WORKERS, batch.length)}, async () => {
        for (;;) {
          const u = queue.pop();
          if (!u) return;
          try {
            const res = await rebuildMatchIndexForUser(u.id as string);
            results.push({userId: u.id as string, status: "ok", written: res.written});
          } catch (err) {
            log.warn("cron.match_index.user_failed", {
              userId: u.id,
              error: err instanceof Error ? err.message : "unknown",
            });
            results.push({userId: u.id as string, status: "error"});
          }
        }
      }),
    );

    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }
  log.info("cron.match_index.complete", {processed: results.length});
  return NextResponse.json({ok: true, processed: results.length, results});
}
```

**Step 4: Test cron route** — auth rejection + per-user iteration + idempotency (run twice → same output).

**Step 5: Commit**

```bash
npm run t start R11.3
git add src/lib/networking/rebuild-match-index.ts src/lib/networking/__tests__/rebuild-match-index.test.ts src/app/api/cron/match-index/
git commit -m "[R11/11.3] feat(r11): match-index populator cron + shared rebuild helper"
npm run t done R11.3
```

---

## Task R11.4: Delta re-scan triggers

**Files:**
- Create: `src/lib/networking/match-delta.ts`
- Create: `src/lib/networking/__tests__/match-delta.test.ts`
- Modify: `src/lib/db/queries/contacts-rest.ts` — on insert/update, fire `enqueueMatchRescan(userId)` (non-blocking)
- Modify: `src/lib/db/queries/applications-rest.ts` — on insert/update/status change, fire `enqueueMatchRescan(userId)`

**Step 1: Test debounce**

```ts
// match-delta.test.ts
// Mock getSupabaseAdmin. First call: last_rescan_at is null → triggers rebuild.
// Second call within 5min: last_rescan_at is fresh → does NOT trigger rebuild.
// Third call after 6min: triggers again.
// Use vi.useFakeTimers to control time.
```

**Step 2: Implement**

```ts
// src/lib/networking/match-delta.ts
import {getSupabaseAdmin} from "@/lib/supabase/admin";
import {rebuildMatchIndexForUser} from "./rebuild-match-index";
import {log} from "@/lib/logger";

const DEBOUNCE_MS = 5 * 60 * 1000;

export async function enqueueMatchRescan(userId: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const {data} = await admin
      .from("user_profiles")
      .select("match_index_last_rescan_at")
      .eq("id", userId).maybeSingle();
    const last = data?.match_index_last_rescan_at as string | null;
    if (last && Date.now() - new Date(last).getTime() < DEBOUNCE_MS) return;
    await rebuildMatchIndexForUser(userId);
    await admin.from("user_profiles")
      .update({match_index_last_rescan_at: new Date().toISOString()})
      .eq("id", userId);
  } catch (err) {
    log.warn("match_delta.failed", {userId, error: err instanceof Error ? err.message : "unknown"});
  }
}
```

**Step 3: Wire into contacts + applications REST**

In `contacts-rest.ts`, after successful insert/update, call (non-blocking): `void enqueueMatchRescan(userId).catch(() => {});`.
Same in `applications-rest.ts` for insert + status-change paths.

**Step 4: Commit**

```bash
npm run t start R11.4
git add src/lib/networking/match-delta.ts src/lib/networking/__tests__/match-delta.test.ts src/lib/db/queries/contacts-rest.ts src/lib/db/queries/applications-rest.ts
git commit -m "[R11/11.4] feat(r11): delta re-scan triggers on contact + application mutations"
npm run t done R11.4
```

---

## Task R11.6: Consent-version gate (already done in R11.1)

**Status:** Bundled into R11.1. Mark done with no separate commit — `npm run t done R11.6` after `npm run t start R11.6` with a trivial no-op or log the bundling in the ledger's `history`.

Alternative: leave R11.6 pending and explicitly note in the accept step that it was bundled into R11.1.

**Pragmatic:** run `npm run t start R11.6 && npm run t done R11.6` back-to-back with ledger note in handoff.

---

## Task R11.7: Rate limit (20/hour/user)

**Files:**
- Create: `src/lib/networking/rate-limit.ts`
- Create: `src/lib/networking/__tests__/rate-limit.test.ts`
- Migration 0022 already includes the RPC (written in R11.2)

**Step 1: Test behavior**

```ts
// rate-limit.test.ts
// Mock supabase.rpc("bump_match_rate_limit").
// Test 1: returns {allowed:true, count: 1..20} → ok: true, remaining correct
// Test 2: returns {allowed:false, count: 21} → ok: false, retryAfterSeconds sensible
// Test 3: rpc throws → fail-closed {ok: false, retryAfterSeconds: 3600}
```

**Step 2: Implement** — see design doc §"Rate limit".

**Step 3: Commit**

```bash
npm run t start R11.7
git add src/lib/networking/rate-limit.ts src/lib/networking/__tests__/rate-limit.test.ts
git commit -m "[R11/11.7] feat(r11): 20/hour rate limit with atomic RPC + fail-closed"
npm run t done R11.7
```

---

## Task R11.8: Unblock `/api/networking/match-candidates`

**Files:**
- Modify: `src/app/api/networking/match-candidates/route.ts` — replace 403 gated stub with real flow
- Create: `src/app/api/networking/match-candidates/__tests__/route.test.ts`

**Step 1: Tests**

```ts
// Tests must cover:
// (a) 401 unauthenticated (no session)
// (b) 403 consent-required (user with no consent)
// (c) 403 consent-version-stale (user with old version)
// (d) 429 rate-limited (21st call in window)
// (e) 200 with candidates + rate_limit_remaining + writes match_events rows
// (f) 200 with empty candidates when index is empty — still returns 200 but empty array
```

**Step 2: Implement** — see design doc §"Unblock route".

**Step 3: Commit**

```bash
npm run t start R11.8
git add src/app/api/networking/match-candidates/route.ts src/app/api/networking/match-candidates/__tests__/route.test.ts
git commit -m "[R11/11.8] feat(r11): unblock match-candidates with real flow + audit + rate limit"
npm run t done R11.8
```

---

## Task R11.9: Audit log UI — Settings → Networking → "How your data is used"

**Files:**
- Create: `src/components/settings/NetworkingAudit.tsx`
- Create: `src/components/settings/__tests__/NetworkingAudit.test.tsx`
- Modify: `src/app/(authenticated)/settings/page.tsx` — fetch last 20 `match_events` for user, pass to settings-client
- Modify: `src/app/(authenticated)/settings/settings-client.tsx` — render `NetworkingAudit` below `NetworkingConsent`
- Modify: `docs/r8/consent-copy.md` — add rate-limit + audit-log language
- Modify: `src/components/settings/NetworkingConsent.tsx` — add matching canary sentences to COPY
- Modify: `src/app/__tests__/r8-consent-copy.proof.test.ts` — new canary for rate limit + audit mention; version bumped to 2

**Step 1: Implement NetworkingAudit component + test** — see design doc.

**Step 2: Update consent copy** — "Match queries are rate-limited to 20 per hour…" canary sentence.

**Step 3: Wire fetch in settings page**

```tsx
// settings/page.tsx — server component
const {data: events} = await supabase
  .from("match_events")
  .select("id, counterparty_anon_key, company_context, fired_at, edge_strength, match_reason")
  .eq("user_id", user.id).order("fired_at", {ascending: false}).limit(20);
```

**Step 4: Commit**

```bash
npm run t start R11.9
git add src/components/settings/NetworkingAudit.tsx src/components/settings/__tests__/NetworkingAudit.test.tsx src/app/(authenticated)/settings/page.tsx src/app/(authenticated)/settings/settings-client.tsx docs/r8/consent-copy.md src/components/settings/NetworkingConsent.tsx src/app/__tests__/r8-consent-copy.proof.test.ts
git commit -m "[R11/11.9] feat(r11): audit log UI + consent copy v2 with rate-limit + audit language"
npm run t done R11.9
```

---

## Task R11.10: Proof tests — bind each invariant

**Files:**
- Create: `src/app/__tests__/r11-cross-user-rls.proof.test.ts` — the cross-user leak invariant
- Create: `src/app/__tests__/r11-no-contact-leak.proof.test.ts` — grep invariant that `match_candidate_index` read paths never touch `contacts.name`/`email`/`private_note`/`phone`

**Step 1: Cross-user RLS proof (jsdom carveout)**

jsdom can't do full RLS simulation. Use: direct supabase client with two authenticated sessions via service-role bypass pattern, OR mock-level test that `user_id = auth.uid()` is present on every `match_candidate_index` read. Document the carveout in the test file header.

```ts
// r11-cross-user-rls.proof.test.ts
import {describe, it, expect} from "vitest";
import {readFileSync} from "node:fs";
import {glob} from "glob";

describe("R11 cross-user RLS proof", () => {
  it("every match_candidate_index read/write is scoped to user_id/auth.uid()", async () => {
    // Read all source files that touch match_candidate_index.
    const files = await glob("src/**/*.{ts,tsx}", {ignore: ["**/__tests__/**", "**/*.test.*"]});
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (!src.includes("match_candidate_index")) continue;
      // Every reference must be within 200 chars of `user_id` OR `auth.uid` OR `.eq("user_id"`
      // This is a structural proxy for RLS enforcement.
      const idx = src.indexOf("match_candidate_index");
      const window = src.slice(Math.max(0, idx - 200), idx + 400);
      if (!/user_id|auth\.uid/.test(window)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
```

**Step 2: No contact leak proof (grep style — mirrors R8's privateNote pattern)**

```ts
// r11-no-contact-leak.proof.test.ts
describe("R11 no cross-user contact data leak", () => {
  it("match_candidate_index query paths never project contacts.name/email/private_note/phone", async () => {
    const files = await glob("src/**/*.ts", {ignore: ["**/__tests__/**", "**/*.test.*"]});
    const offenders: Array<{file: string; snippet: string}> = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (!src.includes("match_candidate_index")) continue;
      // Within the same file, bar any reference to contacts.name / contacts.private_note / contacts.email / contacts.phone.
      const pattern = /contacts\.(name|email|private_note|phone)/;
      if (pattern.test(src)) offenders.push({file: f, snippet: src.match(pattern)![0]});
    }
    expect(offenders).toEqual([]);
  });
});
```

**Step 3: Aggregate — the other invariants (consent gate, version, rate limit, audit log insert, delta debounce, algorithm determinism, cron idempotency) are covered in the per-task tests already. R11.10 is the proof layer on top of those.**

**Step 4: Commit**

```bash
npm run t start R11.10
git add src/app/__tests__/r11-cross-user-rls.proof.test.ts src/app/__tests__/r11-no-contact-leak.proof.test.ts
git commit -m "[R11/11.10] test(r11): cross-user RLS + no-contact-leak proof tests"
npm run t done R11.10
```

---

## Task R11.11 — SKIP (partner Red Team, post-autopilot)

Do not execute in autopilot. Leave the task `status: not_started`.

## Task R11.12 — SKIP (accept close, post-partner)

Do not execute in autopilot. Autopilot finishes at R11.10 `done`. Run `npm run t verify R11` before handoff — expect 1 failure (R11.11 + R11.12 not started). Document in handoff as expected / partner-owned.

---

## Close-out

1. Run `npm run t verify R11` — expect all green EXCEPT R11.11/R11.12 per the §8 escalation rules (these are owned by the partner).
2. Handoff: `cat <<'EOF' | npm run t handoff -- --stdin … EOF`
3. **Do not run `npm run t accept R11`**. Partner runs it after Red Team pass (R11.11) and closes R11.12.
4. Set `.tower/autopilot.yml` `paused: true` when done, with `ended_reason: "R11.1–R11.10 shipped; awaiting partner Red Team (R11.11) and accept (R11.12)"`.

---

## Parallel-execution hints for subagent-driven-development

Tasks that can run in parallel (independent files, no shared state within task group):

- **Group A (schema/algorithm foundation)**: R11.1 (consent-version), R11.2 (migration), R11.5 (algorithm + anon) — any order, but do R11.2 first if possible since R11.5 doesn't depend but aligns.
- **Group B (depends on A)**: R11.3 (cron uses rebuild helper), R11.4 (delta uses rebuild helper), R11.7 (rate limit).
- **Group C (depends on A+B)**: R11.8 (route uses consent, rate limit, index), R11.9 (UI uses match_events schema).
- **Group D**: R11.10 (proof tests last — they grep the final codebase).

Run groups serially; within a group, dispatch parallel subagents.

---

## Env var for next handoff

Add to handoff USER ACTION list:
- `MATCH_ANON_SECRET` — 32+ byte random string, set via `vercel env add MATCH_ANON_SECRET`. Applies in Development, Preview, Production.
- Apply migration 0022 via Supabase MCP or SQL Editor.
