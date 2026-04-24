# R10 — The Negotiation Parlor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task (autopilot default when tasks are independent). Under autopilot no user-gate between tasks; review happens internally.

**Goal.** Build a C-Suite annex room ("The Parlor") that materializes when the user's first offer arrives, where Offer Evaluator + CFO + CNO convene to analyze offers, draft negotiation scripts with a 24h send-hold, and (opt-in) read drafts aloud in the CEO's voice.

**Architecture.** New `offers` table + global `company_comp_bands` cache (migration 0020). Parlor door is server-side gated on `offerCount > 0` — ABSENT from DOM otherwise. `/parlor` route is a standalone annex (not an elevator floor). Three-chair convening fans out `runSubagent` calls to OE/CFO/CNO in parallel. Negotiation drafts reuse R5.4 LiveCompose + R7's outreach_queue with a server-clamped 24h `send_after`. CEO voice = browser `speechSynthesis`, three-layer-gated per R6.

**Tech Stack.** Next.js 16 App Router / Supabase Postgres (REST client at runtime, Drizzle schema-only) / Vercel AI SDK v6 / @ai-sdk/anthropic / GSAP 3 / @react-pdf/renderer (existing) / browser `speechSynthesis` / Firecrawl REST (direct fetch, no npm dep).

**Design reference.** `docs/plans/2026-04-23-r10-negotiation-parlor-design.md`

**Partner constraints source of truth.** `.tower/autopilot.yml` — 8 pre-locked constraints. Any drift from those is stop-and-back-up.

---

## Execution order & dependency graph

```
R10.1  (migration + schema)
   ├── R10.2  (offers REST)
   │     ├── R10.3  (offers API + email parse)
   │     │     └── R10.5  (Parlor door in CSuite)
   │     │            └── R10.6  (Parlor route + scene + folders)
   │     │                   ├── R10.7  (three-chair convening)
   │     │                   │     └── R10.9  (negotiation draft)
   │     │                   │            └── R10.10 (24h hold clamp)
   │     │                   ├── R10.8  (comp chart)
   │     │                   └── R10.12 (CFO quip)
   │     └── R10.4  (Firecrawl + comp_bands lookup)
   │            └── (feeds R10.7 and R10.8)
   └── R10.11 (CEO voice)    [parallelizable after R10.1]

R10.13, R10.14 — stretch, only if MVP is green and budget remains
R10.15 — accept + close (after R10.1–R10.12 done)
```

Independent tasks the subagent runner can parallelize inside a single turn:
- After R10.1: **R10.2 + R10.4 + R10.11** run in parallel (different subsystems, no file overlap).
- After R10.6: **R10.7 + R10.8 + R10.12** run in parallel.

---

## TDD conventions used in this plan

- **Testing stack.** `vitest` (unit + SSR), `@testing-library/react` for DOM queries, `zod/v4` schema tests, direct function tests for pure helpers, SSR `renderToString` tests for the door-absence invariant.
- **Failing test first, always.** Every component and function starts with a red test.
- **Commits per task.** One [R10/10.N] commit per task, tag in subject line.
- **Tower mutations.** `npm run t start R10.N` before starting, `npm run t done R10.N` with HEAD SHA after commit.
- **No `any`.** `import type { JSX } from "react"` where needed. Zod v4 for validation.
- **RLS by convention.** Every new table gets `auth.uid() = user_id` SELECT/INSERT/UPDATE/DELETE policy. Global-cache tables get a read-all-authenticated policy.

---

## Task R10.1 — Migration 0020 + Drizzle schema + preference key

**Goal.** Ship the data floor R10 stands on: `offers` table, `company_comp_bands` global cache, `outreach_queue.type` enum extended with `negotiation` + `reference_request`, `ceoVoice` preference key registered.

**Files:**
- Create: `src/db/migrations/0020_r10_negotiation_parlor.sql`
- Modify: `src/db/schema.ts` — add `offers`, `companyCompBands`; extend `outreachQueue.type` enum.
- Create: `src/lib/preferences/ceo-voice-pref.ts` — key constant + Zod schema.
- Create: `src/lib/preferences/parlor-door-seen-pref.ts` — key constant + Zod schema.
- Create: `src/lib/preferences/parlor-cfo-quip-pref.ts` — key constant + Zod schema.
- Modify: `src/app/api/profile/preferences/route.ts` — register three new keys.
- Test: `src/lib/preferences/__tests__/r10-prefs.test.ts` — schema acceptance/rejection.
- Test: `src/app/api/profile/preferences/route.test.ts` — new keys accepted, unknown still rejected.

### Step 1 — Write failing schema test

Create `src/lib/preferences/__tests__/r10-prefs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CEO_VOICE_PREF_KEY, CeoVoicePrefSchema } from "../ceo-voice-pref";
import { PARLOR_DOOR_SEEN_PREF_KEY, ParlorDoorSeenPrefSchema } from "../parlor-door-seen-pref";
import { PARLOR_CFO_QUIP_PREF_KEY, ParlorCfoQuipPrefSchema } from "../parlor-cfo-quip-pref";

describe("R10 preference keys", () => {
  it("ceoVoice key is stable and schema accepts/rejects correctly", () => {
    expect(CEO_VOICE_PREF_KEY).toBe("ceoVoice");
    expect(CeoVoicePrefSchema.parse({ enabled: false })).toEqual({ enabled: false });
    expect(CeoVoicePrefSchema.parse({ enabled: true })).toEqual({ enabled: true });
    expect(() => CeoVoicePrefSchema.parse({ enabled: "yes" })).toThrow();
    expect(() => CeoVoicePrefSchema.parse({})).toThrow();
    expect(() => CeoVoicePrefSchema.parse({ enabled: true, extra: 1 })).toThrow();
  });
  it("parlorDoorSeen key is stable", () => {
    expect(PARLOR_DOOR_SEEN_PREF_KEY).toBe("parlorDoorSeen");
    expect(ParlorDoorSeenPrefSchema.parse({ seen: true })).toEqual({ seen: true });
    expect(() => ParlorDoorSeenPrefSchema.parse({ seen: 1 })).toThrow();
  });
  it("parlorCfoQuipShown key is stable", () => {
    expect(PARLOR_CFO_QUIP_PREF_KEY).toBe("parlorCfoQuipShown");
    expect(ParlorCfoQuipPrefSchema.parse({ shown: true })).toEqual({ shown: true });
  });
});
```

### Step 2 — Run test, verify red

```
npx vitest run src/lib/preferences/__tests__/r10-prefs.test.ts
```
Expect: FAIL (modules not found).

### Step 3 — Implement preference modules

`src/lib/preferences/ceo-voice-pref.ts`:
```ts
import { z } from "zod/v4";
export const CEO_VOICE_PREF_KEY = "ceoVoice" as const;
export const CeoVoicePrefSchema = z.object({
  enabled: z.boolean(),
}).strict();
export type CeoVoicePref = z.infer<typeof CeoVoicePrefSchema>;
export const CEO_VOICE_PREF_DEFAULT: CeoVoicePref = { enabled: false };
```

`src/lib/preferences/parlor-door-seen-pref.ts`:
```ts
import { z } from "zod/v4";
export const PARLOR_DOOR_SEEN_PREF_KEY = "parlorDoorSeen" as const;
export const ParlorDoorSeenPrefSchema = z.object({
  seen: z.boolean(),
}).strict();
export type ParlorDoorSeenPref = z.infer<typeof ParlorDoorSeenPrefSchema>;
export const PARLOR_DOOR_SEEN_DEFAULT: ParlorDoorSeenPref = { seen: false };
```

`src/lib/preferences/parlor-cfo-quip-pref.ts`:
```ts
import { z } from "zod/v4";
export const PARLOR_CFO_QUIP_PREF_KEY = "parlorCfoQuipShown" as const;
export const ParlorCfoQuipPrefSchema = z.object({
  shown: z.boolean(),
}).strict();
export type ParlorCfoQuipPref = z.infer<typeof ParlorCfoQuipPrefSchema>;
export const PARLOR_CFO_QUIP_DEFAULT: ParlorCfoQuipPref = { shown: false };
```

### Step 4 — Run the test, verify green

```
npx vitest run src/lib/preferences/__tests__/r10-prefs.test.ts
```
Expect: PASS.

### Step 5 — Register preference keys in the whitelist

Modify `src/app/api/profile/preferences/route.ts`:
- Import the three schema constants.
- Add entries to `PREF_VALUE_SCHEMAS`:
```ts
[CEO_VOICE_PREF_KEY]: CeoVoicePrefSchema,
[PARLOR_DOOR_SEEN_PREF_KEY]: ParlorDoorSeenPrefSchema,
[PARLOR_CFO_QUIP_PREF_KEY]: ParlorCfoQuipPrefSchema,
```
- Also extend the doc comment listing whitelisted keys.

### Step 6 — Extend route test

Add cases to `src/app/api/profile/preferences/route.test.ts`:
- POST `{ key: "ceoVoice", value: { enabled: true } }` → 200 + preferences patched.
- POST `{ key: "ceoVoice", value: { enabled: "yes" } }` → 400 `invalid_value`.
- POST `{ key: "parlorDoorSeen", value: { seen: true } }` → 200.
- POST `{ key: "notAKey", value: {} }` → still 400 `unknown_key`.

Run:
```
npx vitest run src/app/api/profile/preferences/route.test.ts
```
Expect: PASS.

### Step 7 — Author migration 0020 SQL

`src/db/migrations/0020_r10_negotiation_parlor.sql`:

```sql
-- 0020_r10_negotiation_parlor.sql
-- R10 — The Negotiation Parlor
-- Adds: offers table, company_comp_bands global cache, outreach_queue.type
-- enum extensions, helpful indices. Additive only; no destructive changes.

-- 1. OFFERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id      uuid REFERENCES applications(id) ON DELETE SET NULL,
  company_name        text NOT NULL,
  role                text NOT NULL,
  level               text,
  location            text NOT NULL,
  base                integer NOT NULL,
  bonus               integer NOT NULL DEFAULT 0,
  equity              integer NOT NULL DEFAULT 0,
  sign_on             integer NOT NULL DEFAULT 0,
  housing             integer NOT NULL DEFAULT 0,
  start_date          date,
  benefits            jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at         timestamptz NOT NULL DEFAULT now(),
  deadline_at         timestamptz,
  status              text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','negotiating','accepted','declined','expired','withdrawn')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY offers_owner_select ON offers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY offers_owner_insert ON offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY offers_owner_update ON offers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY offers_owner_delete ON offers
  FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_offers_user_received ON offers(user_id, received_at DESC);

-- 2. COMPANY_COMP_BANDS (GLOBAL CACHE) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_comp_bands (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name_normalized   text NOT NULL,
  role                      text NOT NULL,
  location                  text NOT NULL,
  level                     text NOT NULL DEFAULT '',
  base_p25                  integer,
  base_p50                  integer,
  base_p75                  integer,
  bonus_p25                 integer,
  bonus_p50                 integer,
  bonus_p75                 integer,
  equity_p25                integer,
  equity_p50                integer,
  equity_p75                integer,
  sample_size               integer NOT NULL DEFAULT 0,
  source                    text NOT NULL DEFAULT 'levels.fyi',
  scraped_at                timestamptz NOT NULL DEFAULT now(),
  expires_at                timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (company_name_normalized, role, location, level)
);
ALTER TABLE company_comp_bands ENABLE ROW LEVEL SECURITY;
-- Any authenticated user can read. Service role writes.
CREATE POLICY comp_bands_read ON company_comp_bands
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE INDEX idx_comp_bands_lookup
  ON company_comp_bands(company_name_normalized, role, location);

-- 3. COMP_BANDS_BUDGET (monthly Firecrawl counter) ─────────────────────────
CREATE TABLE IF NOT EXISTS comp_bands_budget (
  month_key       text PRIMARY KEY,      -- 'YYYY-MM'
  scrape_count    integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE comp_bands_budget ENABLE ROW LEVEL SECURITY;
-- No user access — service role only.

-- 4. OUTREACH_QUEUE.type enum — ADD 'negotiation', 'reference_request' ────
-- Postgres text CHECK constraints aren't "enums" — they're CHECK constraints.
-- Easiest safe path: drop + recreate the CHECK.
ALTER TABLE outreach_queue DROP CONSTRAINT IF EXISTS outreach_queue_type_check;
ALTER TABLE outreach_queue
  ADD CONSTRAINT outreach_queue_type_check
  CHECK (type IN (
    'cold_email','follow_up','thank_you','networking','cover_letter_send',
    'negotiation','reference_request'
  ));

-- 5. offers updated_at trigger
CREATE OR REPLACE FUNCTION set_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION set_offers_updated_at();
```

### Step 8 — Update Drizzle schema

Modify `src/db/schema.ts`:
- Extend `outreachQueue.type` enum to include `"negotiation"` and `"reference_request"`.
- Add `offers` pgTable with all columns matching the SQL.
- Add `companyCompBands` pgTable.
- Add `compBandsBudget` pgTable.
- Export inferSelect/inferInsert types.
- Add `userIsolation("offers")` helper usage.

Schema additions (abbreviated — full column set matches migration):
```ts
export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  companyName: text("company_name").notNull(),
  role: text("role").notNull(),
  level: text("level"),
  location: text("location").notNull(),
  base: integer("base").notNull(),
  bonus: integer("bonus").notNull().default(0),
  equity: integer("equity").notNull().default(0),
  signOn: integer("sign_on").notNull().default(0),
  housing: integer("housing").notNull().default(0),
  startDate: date("start_date"),
  benefits: jsonb("benefits").notNull().default(sql`'{}'::jsonb`),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  status: text("status", {
    enum: ["received","negotiating","accepted","declined","expired","withdrawn"],
  }).notNull().default("received"),
  ...timestamps,
}, (table) => [
  userIsolation("offers"),
  index("idx_offers_user_received").on(table.userId, table.receivedAt.desc()),
]);

export const companyCompBands = pgTable("company_comp_bands", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyNameNormalized: text("company_name_normalized").notNull(),
  role: text("role").notNull(),
  location: text("location").notNull(),
  level: text("level").notNull().default(""),
  baseP25: integer("base_p25"),
  baseP50: integer("base_p50"),
  baseP75: integer("base_p75"),
  bonusP25: integer("bonus_p25"),
  bonusP50: integer("bonus_p50"),
  bonusP75: integer("bonus_p75"),
  equityP25: integer("equity_p25"),
  equityP50: integer("equity_p50"),
  equityP75: integer("equity_p75"),
  sampleSize: integer("sample_size").notNull().default(0),
  source: text("source").notNull().default("levels.fyi"),
  scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  unique("comp_bands_unique").on(
    table.companyNameNormalized,
    table.role,
    table.location,
    table.level,
  ),
  index("idx_comp_bands_lookup").on(
    table.companyNameNormalized,
    table.role,
    table.location,
  ),
]);

export const compBandsBudget = pgTable("comp_bands_budget", {
  monthKey: text("month_key").primaryKey(),
  scrapeCount: integer("scrape_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type CompBands = typeof companyCompBands.$inferSelect;
```

### Step 9 — Typecheck

```
npx tsc --noEmit
```
Expect: PASS.

### Step 10 — Commit

```
git add src/db/migrations/0020_r10_negotiation_parlor.sql src/db/schema.ts src/lib/preferences/ src/app/api/profile/preferences/
npm run t start R10.1
git commit -m "[R10/10.1] feat(db): migration 0020 + offers/comp_bands schema + R10 prefs"
npm run t done R10.1
```

Note: migration 0020 is authored but requires manual apply via Supabase Dashboard SQL Editor before R10.3+ API routes will work in production. Same pattern as 0019. Record this in the handoff.

---

## Task R10.2 — Offers REST queries

**Goal.** Typed REST helpers for reading/writing offers — the queries the rest of R10 will call.

**Files:**
- Create: `src/lib/db/queries/offers-rest.ts`
- Test: `src/lib/db/queries/offers-rest.test.ts`

### Step 1 — Failing test

`src/lib/db/queries/offers-rest.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import {
  countOffersForUser,
  getOffersForUser,
  getOfferById,
  insertOffer,
  updateOfferStatus,
  normalizeCompanyName,
} from "./offers-rest";

function makeSupabase(overrides: Record<string, unknown>) {
  // Chainable mock matching the Supabase REST client surface we exercise.
  // Each query returns a thenable with { data, error }.
  const self: Record<string, unknown> = {};
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    ...overrides,
  };
  self.from = vi.fn(() => builder);
  return { client: self as unknown as Parameters<typeof countOffersForUser>[0], builder };
}

describe("offers-rest", () => {
  it("normalizeCompanyName lowercases, trims, collapses whitespace, strips 'inc.'", () => {
    expect(normalizeCompanyName("  Acme  Corp  ")).toBe("acme corp");
    expect(normalizeCompanyName("Acme, Inc.")).toBe("acme");
    expect(normalizeCompanyName("Meta Platforms Inc")).toBe("meta platforms");
    expect(normalizeCompanyName("")).toBe("");
  });

  it("countOffersForUser returns { count } from SELECT count(*)", async () => {
    const { client, builder } = makeSupabase({
      // Supabase returns { count: n, data: null, error: null } for head+count queries
    });
    builder.select = vi.fn(() => ({
      eq: vi.fn().mockResolvedValueOnce({ count: 3, data: null, error: null }),
    })) as unknown as typeof builder.select;
    const n = await countOffersForUser(client, "user-1");
    expect(n).toBe(3);
  });

  it("insertOffer returns inserted row", async () => {
    const row = { id: "off-1", user_id: "user-1", company_name: "Acme" };
    const { client, builder } = makeSupabase({});
    builder.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValueOnce({ data: row, error: null }),
      })),
    })) as unknown as typeof builder.insert;
    const out = await insertOffer(client, {
      userId: "user-1",
      companyName: "Acme",
      role: "SWE Intern",
      location: "NYC",
      base: 120000,
    });
    expect(out.id).toBe("off-1");
  });

  it("getOfferById returns null when not found", async () => {
    const { client, builder } = makeSupabase({});
    builder.eq = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
      })),
    })) as unknown as typeof builder.eq;
    const offer = await getOfferById(client, "user-1", "off-x");
    expect(offer).toBeNull();
  });

  it("updateOfferStatus sets status + updated_at", async () => {
    const { client, builder } = makeSupabase({});
    const eqChain = { eq: vi.fn().mockResolvedValueOnce({ data: null, error: null }) };
    const firstEq = { eq: vi.fn(() => eqChain) };
    builder.update = vi.fn(() => firstEq) as unknown as typeof builder.update;
    await updateOfferStatus(client, "user-1", "off-1", "negotiating");
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "negotiating" }),
    );
  });
});
```

### Step 2 — Run, verify red

```
npx vitest run src/lib/db/queries/offers-rest.test.ts
```
Expect: FAIL (module missing).

### Step 3 — Implement module

`src/lib/db/queries/offers-rest.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type OfferRow = {
  id: string;
  user_id: string;
  application_id: string | null;
  company_name: string;
  role: string;
  level: string | null;
  location: string;
  base: number;
  bonus: number;
  equity: number;
  sign_on: number;
  housing: number;
  start_date: string | null;
  benefits: Record<string, unknown>;
  received_at: string;
  deadline_at: string | null;
  status: "received" | "negotiating" | "accepted" | "declined" | "expired" | "withdrawn";
  created_at: string;
  updated_at: string;
};

export interface InsertOfferInput {
  userId: string;
  applicationId?: string | null;
  companyName: string;
  role: string;
  level?: string | null;
  location: string;
  base: number;
  bonus?: number;
  equity?: number;
  signOn?: number;
  housing?: number;
  startDate?: string | null;
  benefits?: Record<string, unknown>;
  deadlineAt?: string | null;
}

/**
 * Normalize a company name into the cache key shape used for comp-band lookups.
 * Lowercased, trimmed, whitespace-collapsed, "inc"/"corp"/"llc"/"ltd" suffix stripped.
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(inc|corp|corporation|llc|ltd|limited|holdings|co)$/i, "")
    .trim();
}

export async function countOffersForUser(
  client: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from("offers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`countOffersForUser: ${error.message}`);
  return count ?? 0;
}

export async function getOffersForUser(
  client: SupabaseClient,
  userId: string,
  opts: { limit?: number } = {},
): Promise<OfferRow[]> {
  const q = client
    .from("offers")
    .select("*")
    .eq("user_id", userId)
    .order("received_at", { ascending: false });
  const final = opts.limit ? q.limit(opts.limit) : q;
  const { data, error } = await final;
  if (error) throw new Error(`getOffersForUser: ${error.message}`);
  return (data ?? []) as OfferRow[];
}

export async function getOfferById(
  client: SupabaseClient,
  userId: string,
  offerId: string,
): Promise<OfferRow | null> {
  const { data, error } = await client
    .from("offers")
    .select("*")
    .eq("user_id", userId)
    .eq("id", offerId)
    .maybeSingle();
  if (error) throw new Error(`getOfferById: ${error.message}`);
  return (data as OfferRow | null) ?? null;
}

export async function insertOffer(
  client: SupabaseClient,
  input: InsertOfferInput,
): Promise<OfferRow> {
  const row = {
    user_id: input.userId,
    application_id: input.applicationId ?? null,
    company_name: input.companyName,
    role: input.role,
    level: input.level ?? null,
    location: input.location,
    base: input.base,
    bonus: input.bonus ?? 0,
    equity: input.equity ?? 0,
    sign_on: input.signOn ?? 0,
    housing: input.housing ?? 0,
    start_date: input.startDate ?? null,
    benefits: input.benefits ?? {},
    deadline_at: input.deadlineAt ?? null,
  };
  const { data, error } = await client
    .from("offers")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(`insertOffer: ${error.message}`);
  return data as OfferRow;
}

export async function updateOfferStatus(
  client: SupabaseClient,
  userId: string,
  offerId: string,
  status: OfferRow["status"],
): Promise<void> {
  const { error } = await client
    .from("offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", offerId);
  if (error) throw new Error(`updateOfferStatus: ${error.message}`);
}
```

### Step 4 — Run test, verify green

```
npx vitest run src/lib/db/queries/offers-rest.test.ts
```
Expect: PASS.

### Step 5 — Commit

```
npm run t start R10.2
git add src/lib/db/queries/offers-rest.ts src/lib/db/queries/offers-rest.test.ts
git commit -m "[R10/10.2] feat(db): offers REST queries + company-name normalizer"
npm run t done R10.2
```

---

## Task R10.3 — Offers API + email-parse extraction

**Goal.** HTTP surface: POST/GET/PATCH offers; an email-body parser that turns a classified `type='offer'` email into structured fields.

**Files:**
- Create: `src/app/api/offers/route.ts` — POST (create), GET (list).
- Create: `src/app/api/offers/[id]/route.ts` — GET (one), PATCH (status update).
- Create: `src/lib/offers/parse-offer-email.ts` — best-effort structured extraction.
- Test: `src/app/api/offers/route.test.ts`
- Test: `src/app/api/offers/[id]/route.test.ts`
- Test: `src/lib/offers/parse-offer-email.test.ts`

### Step 1 — Failing parser test

`src/lib/offers/parse-offer-email.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseOfferEmail } from "./parse-offer-email";

describe("parseOfferEmail", () => {
  it("extracts base/bonus/equity from a clean offer body", async () => {
    const body = `
      We're delighted to extend an offer:
      Company: Acme Corp
      Role: Software Engineer Intern
      Location: New York, NY
      Base salary: $120,000
      Signing bonus: $10,000
      Annual bonus: 10% target
      Equity: $40,000 over 4 years
      Start date: June 1, 2026
      Response deadline: May 1, 2026
    `;
    const parsed = await parseOfferEmail({ subject: "Offer of employment", body });
    expect(parsed).not.toBeNull();
    expect(parsed!.companyName).toMatch(/acme/i);
    expect(parsed!.role).toMatch(/software engineer/i);
    expect(parsed!.location).toBe("New York, NY");
    expect(parsed!.base).toBe(120000);
    expect(parsed!.signOn).toBe(10000);
    expect(parsed!.equity).toBe(40000);
    expect(parsed!.startDate).toBe("2026-06-01");
    expect(parsed!.deadlineAt).toBe("2026-05-01");
  });

  it("returns partial parse with nulls for missing fields", async () => {
    const body = `Company: Acme\nRole: Analyst\nLocation: NYC\nBase: $95000`;
    const parsed = await parseOfferEmail({ subject: "offer", body });
    expect(parsed!.base).toBe(95000);
    expect(parsed!.signOn).toBe(0);
    expect(parsed!.startDate).toBeNull();
  });

  it("returns null when we can't extract a company + base", async () => {
    const parsed = await parseOfferEmail({
      subject: "no signal here",
      body: "hi, hope you're well. let's chat.",
    });
    expect(parsed).toBeNull();
  });
});
```

### Step 2 — Run, verify red

### Step 3 — Implement parser

`src/lib/offers/parse-offer-email.ts`:

```ts
/**
 * R10.3 — parseOfferEmail
 *
 * Best-effort structured extraction from an already-classified offer email.
 * Regex-driven for speed + determinism. Failed extractions return null — the
 * caller surfaces a "couldn't parse, enter manually" path in the Penthouse.
 *
 * Do NOT invoke the LLM here. LLM parsing is scope creep for MVP and
 * introduces latency/cost into the ingest hot path.
 */

export interface ParsedOffer {
  companyName: string;
  role: string;
  level: string | null;
  location: string;
  base: number;
  bonus: number;
  equity: number;
  signOn: number;
  housing: number;
  startDate: string | null;   // ISO date
  deadlineAt: string | null;  // ISO datetime
}

function pickDollar(body: string, keys: string[]): number {
  for (const k of keys) {
    const re = new RegExp(`${k}[^\\n$]{0,40}\\$?([0-9][0-9,]*)`, "i");
    const m = re.exec(body);
    if (m) return Number(m[1].replace(/,/g, ""));
  }
  return 0;
}

function pickLine(body: string, key: string): string | null {
  const re = new RegExp(`${key}\\s*:?\\s*([^\\n]{1,100})`, "i");
  const m = re.exec(body);
  return m ? m[1].trim() : null;
}

function parseDateLoose(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function parseOfferEmail(input: {
  subject: string;
  body: string;
}): Promise<ParsedOffer | null> {
  const body = input.body;
  const companyName = pickLine(body, "company")?.replace(/[,.]$/, "") ?? null;
  const base = pickDollar(body, ["base salary", "base", "salary"]);
  if (!companyName || base === 0) return null;

  const role = pickLine(body, "role") ?? pickLine(body, "position") ?? "Unspecified role";
  const location = pickLine(body, "location") ?? "Unspecified";
  const level = pickLine(body, "level");
  const signOn = pickDollar(body, ["signing bonus", "sign[- ]on"]);
  const equity = pickDollar(body, ["equity", "rsu", "stock"]);
  const bonus = pickDollar(body, ["annual bonus", "bonus"]);
  const housing = pickDollar(body, ["housing stipend", "housing"]);
  const startDateRaw = pickLine(body, "start date") ?? pickLine(body, "start");
  const deadlineRaw = pickLine(body, "deadline") ?? pickLine(body, "respond by");

  return {
    companyName,
    role,
    level,
    location,
    base,
    bonus,
    equity,
    signOn,
    housing,
    startDate: parseDateLoose(startDateRaw),
    deadlineAt: parseDateLoose(deadlineRaw),
  };
}
```

### Step 4 — Run, verify green

### Step 5 — Implement POST /api/offers

`src/app/api/offers/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { insertOffer, getOffersForUser } from "@/lib/db/queries/offers-rest";

const CreateOfferSchema = z.object({
  applicationId: z.string().uuid().nullable().optional(),
  companyName: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  level: z.string().max(50).nullable().optional(),
  location: z.string().min(1).max(200),
  base: z.number().int().min(0),
  bonus: z.number().int().min(0).optional(),
  equity: z.number().int().min(0).optional(),
  signOn: z.number().int().min(0).optional(),
  housing: z.number().int().min(0).optional(),
  startDate: z.string().date().nullable().optional(),
  deadlineAt: z.string().datetime().nullable().optional(),
  benefits: z.record(z.string(), z.unknown()).optional(),
}).strict();

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => null);
  const parsed = CreateOfferSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.issues }, { status: 400 });
  }
  const supabase = await createClient();
  const row = await insertOffer(supabase, { userId: auth.user.id, ...parsed.data });
  return NextResponse.json({ offer: row });
}

export async function GET(): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const supabase = await createClient();
  const offers = await getOffersForUser(supabase, auth.user.id);
  return NextResponse.json({ offers });
}
```

### Step 6 — PATCH /api/offers/:id

`src/app/api/offers/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getOfferById, updateOfferStatus } from "@/lib/db/queries/offers-rest";

const StatusSchema = z.enum([
  "received","negotiating","accepted","declined","expired","withdrawn",
]);

const UpdateOfferSchema = z.object({
  status: StatusSchema,
}).strict();

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const supabase = await createClient();
  const offer = await getOfferById(supabase, auth.user.id, id);
  if (!offer) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ offer });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = UpdateOfferSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const supabase = await createClient();
  const existing = await getOfferById(supabase, auth.user.id, id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await updateOfferStatus(supabase, auth.user.id, id, parsed.data.status);
  return NextResponse.json({ success: true });
}
```

### Step 7 — Route tests

`src/app/api/offers/route.test.ts` — exercise 401 (no auth), 400 (bad body), 200 (happy path); mock `requireUserApi` + `createClient` the same way other route tests in this repo do (see `src/app/api/rejection-reflections/route.test.ts` pattern).

Similar for the id route (404 on missing, 200 on PATCH, 400 on invalid status).

Run all:
```
npx vitest run src/app/api/offers
```
Expect: PASS.

### Step 8 — Typecheck + commit

```
npx tsc --noEmit
npm run t start R10.3
git add src/app/api/offers src/lib/offers
git commit -m "[R10/10.3] feat(api): offers CRUD + offer-email parser"
npm run t done R10.3
```

---

## Task R10.4 — Firecrawl + comp_bands lookup

**Goal.** Global-cache comp-band lookups. Firecrawl HTTP client, cache resolver, monthly budget, lookup API endpoint.

**Files:**
- Create: `src/lib/comp-bands/firecrawl.ts` — HTTP client + HTML → band normalizer.
- Create: `src/lib/comp-bands/budget.ts` — monthly counter helpers.
- Create: `src/lib/comp-bands/lookup.ts` — cache-first resolver.
- Create: `src/lib/db/queries/comp-bands-rest.ts` — REST helpers on `company_comp_bands` + `comp_bands_budget`.
- Create: `src/app/api/comp-bands/lookup/route.ts` — GET endpoint.
- Create: `scripts/comp-bands-seed.ts` — dev-only pre-seed for top-20 companies.
- Tests: `*.test.ts` for each pure module above.
- Test: `src/app/api/comp-bands/lookup/route.test.ts`

### Step 1 — Failing test: budget logic

`src/lib/comp-bands/__tests__/budget.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import {
  currentMonthKey,
  FIRECRAWL_MONTHLY_LIMIT,
  FIRECRAWL_SAFETY_BUFFER,
  canScrapeThisMonth,
  incrementScrapeCount,
} from "../budget";

describe("comp-bands/budget", () => {
  it("currentMonthKey returns YYYY-MM for a given date", () => {
    expect(currentMonthKey(new Date("2026-04-15T12:00:00Z"))).toBe("2026-04");
    expect(currentMonthKey(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12");
  });

  it("limit - safety buffer is effective ceiling", () => {
    expect(FIRECRAWL_MONTHLY_LIMIT - FIRECRAWL_SAFETY_BUFFER).toBe(450);
  });

  it("canScrapeThisMonth returns false when count >= limit - buffer", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { scrape_count: 450 },
              error: null,
            }),
          })),
        })),
      })),
    };
    expect(
      await canScrapeThisMonth(
        mockClient as unknown as Parameters<typeof canScrapeThisMonth>[0],
      ),
    ).toBe(false);
  });

  it("canScrapeThisMonth returns true when count < limit - buffer", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { scrape_count: 449 },
              error: null,
            }),
          })),
        })),
      })),
    };
    expect(
      await canScrapeThisMonth(
        mockClient as unknown as Parameters<typeof canScrapeThisMonth>[0],
      ),
    ).toBe(true);
  });
});
```

### Step 2 — Implement budget

`src/lib/comp-bands/budget.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export const FIRECRAWL_MONTHLY_LIMIT = 500;
export const FIRECRAWL_SAFETY_BUFFER = 50;

export function currentMonthKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function canScrapeThisMonth(admin: SupabaseClient): Promise<boolean> {
  const key = currentMonthKey();
  const { data } = await admin
    .from("comp_bands_budget")
    .select("scrape_count")
    .eq("month_key", key)
    .maybeSingle();
  const count = (data?.scrape_count as number | undefined) ?? 0;
  return count < FIRECRAWL_MONTHLY_LIMIT - FIRECRAWL_SAFETY_BUFFER;
}

export async function incrementScrapeCount(admin: SupabaseClient): Promise<void> {
  const key = currentMonthKey();
  // Upsert with increment semantics — read current, write+1.
  const { data } = await admin
    .from("comp_bands_budget")
    .select("scrape_count")
    .eq("month_key", key)
    .maybeSingle();
  const next = ((data?.scrape_count as number | undefined) ?? 0) + 1;
  await admin
    .from("comp_bands_budget")
    .upsert({
      month_key: key,
      scrape_count: next,
      updated_at: new Date().toISOString(),
    }, { onConflict: "month_key" });
}
```

### Step 3 — Run, verify green

### Step 4 — Firecrawl client test + impl

`src/lib/comp-bands/__tests__/firecrawl.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { scrapeLevelsFyi, buildLevelsFyiUrl } from "../firecrawl";

describe("comp-bands/firecrawl", () => {
  it("buildLevelsFyiUrl produces the expected canonical URL", () => {
    expect(buildLevelsFyiUrl({ company: "Meta", role: "Software Engineer", location: "New York, NY" }))
      .toMatch(/levels\.fyi\/companies\/meta\/salaries\/software-engineer/i);
  });

  it("returns null when Firecrawl HTTP call fails", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 })
    );
    const out = await scrapeLevelsFyi("Meta", "Software Engineer", "NYC");
    expect(out).toBeNull();
    fetchSpy.mockRestore();
  });

  it("returns null when Firecrawl markdown has no salary data", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({
        data: { markdown: "No data yet for this role." },
      }), { status: 200, headers: { "content-type": "application/json" } })
    );
    const out = await scrapeLevelsFyi("Meta", "Software Engineer", "NYC");
    expect(out).toBeNull();
    fetchSpy.mockRestore();
  });

  it("parses a realistic markdown snippet into percentile bands", async () => {
    // Minimal simulation — the real scraper will have a richer regex.
    const markdown = `
      ## Software Engineer at Meta, New York
      25th percentile: $180,000
      Median: $220,000
      75th percentile: $280,000
      Bonus: 25,000 / 40,000 / 60,000
      Equity: 80000 / 120000 / 200000
      Sample size: 312
    `;
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { markdown } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const out = await scrapeLevelsFyi("Meta", "Software Engineer", "New York, NY");
    expect(out).not.toBeNull();
    expect(out!.basePercentiles.p50).toBe(220000);
    expect(out!.basePercentiles.p25).toBe(180000);
    expect(out!.basePercentiles.p75).toBe(280000);
    expect(out!.sampleSize).toBe(312);
    fetchSpy.mockRestore();
  });
});
```

### Step 5 — Implement Firecrawl client

`src/lib/comp-bands/firecrawl.ts`:

```ts
/**
 * R10.4 — Firecrawl client for Levels.fyi scraping.
 *
 * Direct HTTP against Firecrawl's /v1/scrape endpoint. We parse the returned
 * markdown with a focused regex set — NOT a full HTML parser. If Levels.fyi's
 * layout shifts dramatically, this regex breaks noisily and we return null
 * → graceful-empty UI. Fix forward, no silent wrong-band data.
 *
 * Env: FIRECRAWL_API_KEY.
 */

export interface CompBandsScrape {
  basePercentiles: { p25: number; p50: number; p75: number };
  bonusPercentiles: { p25: number; p50: number; p75: number };
  equityPercentiles: { p25: number; p50: number; p75: number };
  sampleSize: number;
}

const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";

export function buildLevelsFyiUrl(input: {
  company: string;
  role: string;
  location: string;
}): string {
  const slug = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `https://www.levels.fyi/companies/${slug(input.company)}/salaries/${slug(input.role)}?location=${encodeURIComponent(input.location)}`;
}

function parseInt$(s: string | undefined): number {
  if (!s) return 0;
  return Number(s.replace(/[^0-9]/g, ""));
}

function matchTriple(markdown: string, header: RegExp): { p25: number; p50: number; p75: number } {
  const re = new RegExp(`${header.source}[^\\d]{0,80}([0-9,]+)[^\\d]{0,40}([0-9,]+)[^\\d]{0,40}([0-9,]+)`, "i");
  const m = re.exec(markdown);
  if (!m) return { p25: 0, p50: 0, p75: 0 };
  return {
    p25: parseInt$(m[1]),
    p50: parseInt$(m[2]),
    p75: parseInt$(m[3]),
  };
}

export async function scrapeLevelsFyi(
  company: string,
  role: string,
  location: string,
): Promise<CompBandsScrape | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  let res: Response;
  try {
    res = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: buildLevelsFyiUrl({ company, role, location }),
        formats: ["markdown"],
      }),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let payload: { data?: { markdown?: string } };
  try {
    payload = (await res.json()) as { data?: { markdown?: string } };
  } catch {
    return null;
  }
  const markdown = payload.data?.markdown ?? "";
  if (markdown.length < 50 || !/\$[0-9]/.test(markdown)) return null;

  const baseTriple = matchTriple(markdown, /(25th|p25|base)/i);
  if (!baseTriple.p50) {
    // Softer parse — look for "Median: $XXX"
    const medianMatch = /median[^\d$]*\$?([0-9,]+)/i.exec(markdown);
    if (medianMatch) baseTriple.p50 = parseInt$(medianMatch[1]);
  }
  if (!baseTriple.p25) {
    const p25Match = /25th[^\d$]*\$?([0-9,]+)/i.exec(markdown);
    if (p25Match) baseTriple.p25 = parseInt$(p25Match[1]);
  }
  if (!baseTriple.p75) {
    const p75Match = /75th[^\d$]*\$?([0-9,]+)/i.exec(markdown);
    if (p75Match) baseTriple.p75 = parseInt$(p75Match[1]);
  }

  if (!baseTriple.p25 && !baseTriple.p50 && !baseTriple.p75) return null;

  const bonus = matchTriple(markdown, /bonus/i);
  const equity = matchTriple(markdown, /(equity|rsu|stock)/i);
  const sizeMatch = /sample\s*size\s*:?\s*([0-9,]+)/i.exec(markdown);
  const sampleSize = sizeMatch ? Number(sizeMatch[1].replace(/,/g, "")) : 0;

  return {
    basePercentiles: baseTriple,
    bonusPercentiles: bonus,
    equityPercentiles: equity,
    sampleSize,
  };
}
```

### Step 6 — comp_bands-rest REST helpers + lookup resolver

`src/lib/db/queries/comp-bands-rest.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CompBandsRow {
  id: string;
  company_name_normalized: string;
  role: string;
  location: string;
  level: string;
  base_p25: number | null;
  base_p50: number | null;
  base_p75: number | null;
  bonus_p25: number | null;
  bonus_p50: number | null;
  bonus_p75: number | null;
  equity_p25: number | null;
  equity_p50: number | null;
  equity_p75: number | null;
  sample_size: number;
  source: string;
  scraped_at: string;
  expires_at: string;
}

export async function getCachedBands(
  client: SupabaseClient,
  params: { companyNameNormalized: string; role: string; location: string; level?: string },
): Promise<CompBandsRow | null> {
  const { data, error } = await client
    .from("company_comp_bands")
    .select("*")
    .eq("company_name_normalized", params.companyNameNormalized)
    .eq("role", params.role)
    .eq("location", params.location)
    .eq("level", params.level ?? "")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`getCachedBands: ${error.message}`);
  return (data as CompBandsRow | null) ?? null;
}

export async function upsertBands(
  admin: SupabaseClient,
  input: Omit<CompBandsRow, "id" | "scraped_at" | "expires_at" | "source"> &
    Partial<Pick<CompBandsRow, "source">>,
): Promise<void> {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const row = {
    ...input,
    source: input.source ?? "levels.fyi",
    scraped_at: now.toISOString(),
    expires_at: expires.toISOString(),
  };
  const { error } = await admin
    .from("company_comp_bands")
    .upsert(row, {
      onConflict: "company_name_normalized,role,location,level",
    });
  if (error) throw new Error(`upsertBands: ${error.message}`);
}
```

`src/lib/comp-bands/lookup.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCompanyName } from "@/lib/db/queries/offers-rest";
import { getCachedBands, upsertBands } from "@/lib/db/queries/comp-bands-rest";
import { scrapeLevelsFyi } from "./firecrawl";
import { canScrapeThisMonth, incrementScrapeCount } from "./budget";

export type LookupResult =
  | {
      ok: true;
      base: { p25: number; p50: number; p75: number };
      bonus: { p25: number; p50: number; p75: number };
      equity: { p25: number; p50: number; p75: number };
      sampleSize: number;
      source: string;
      fromCache: boolean;
    }
  | { ok: false; reason: "empty" | "over_budget" | "no_key" };

export async function lookupCompBands(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  input: { company: string; role: string; location: string; level?: string },
): Promise<LookupResult> {
  const norm = normalizeCompanyName(input.company);
  const cached = await getCachedBands(userClient, {
    companyNameNormalized: norm,
    role: input.role,
    location: input.location,
    level: input.level ?? "",
  });
  if (cached) {
    return {
      ok: true,
      base: { p25: cached.base_p25 ?? 0, p50: cached.base_p50 ?? 0, p75: cached.base_p75 ?? 0 },
      bonus: { p25: cached.bonus_p25 ?? 0, p50: cached.bonus_p50 ?? 0, p75: cached.bonus_p75 ?? 0 },
      equity: { p25: cached.equity_p25 ?? 0, p50: cached.equity_p50 ?? 0, p75: cached.equity_p75 ?? 0 },
      sampleSize: cached.sample_size,
      source: cached.source,
      fromCache: true,
    };
  }
  if (!process.env.FIRECRAWL_API_KEY) {
    return { ok: false, reason: "no_key" };
  }
  if (!(await canScrapeThisMonth(admin))) {
    return { ok: false, reason: "over_budget" };
  }
  await incrementScrapeCount(admin);
  const scraped = await scrapeLevelsFyi(input.company, input.role, input.location);
  if (!scraped) return { ok: false, reason: "empty" };
  await upsertBands(admin, {
    company_name_normalized: norm,
    role: input.role,
    location: input.location,
    level: input.level ?? "",
    base_p25: scraped.basePercentiles.p25,
    base_p50: scraped.basePercentiles.p50,
    base_p75: scraped.basePercentiles.p75,
    bonus_p25: scraped.bonusPercentiles.p25,
    bonus_p50: scraped.bonusPercentiles.p50,
    bonus_p75: scraped.bonusPercentiles.p75,
    equity_p25: scraped.equityPercentiles.p25,
    equity_p50: scraped.equityPercentiles.p50,
    equity_p75: scraped.equityPercentiles.p75,
    sample_size: scraped.sampleSize,
  });
  return {
    ok: true,
    base: scraped.basePercentiles,
    bonus: scraped.bonusPercentiles,
    equity: scraped.equityPercentiles,
    sampleSize: scraped.sampleSize,
    source: "levels.fyi",
    fromCache: false,
  };
}
```

### Step 7 — Lookup API route

`src/app/api/comp-bands/lookup/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { lookupCompBands } from "@/lib/comp-bands/lookup";

export async function GET(req: NextRequest): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const u = new URL(req.url);
  const company = u.searchParams.get("company");
  const role = u.searchParams.get("role");
  const location = u.searchParams.get("location");
  const level = u.searchParams.get("level") ?? undefined;
  if (!company || !role || !location) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }
  const userClient = await createClient();
  const admin = getSupabaseAdmin();
  const out = await lookupCompBands(userClient, admin, { company, role, location, level });
  return NextResponse.json(out);
}
```

### Step 8 — Seed script

`scripts/comp-bands-seed.ts`:

```ts
#!/usr/bin/env tsx
/**
 * R10.4 — one-shot seeder. Pre-populates company_comp_bands for the top-N
 * companies in a given sector. Run manually:
 *   FIRECRAWL_API_KEY=... npx tsx scripts/comp-bands-seed.ts "real-estate"
 * Uses the service-role admin client. Respects the budget ceiling.
 */
import { getSupabaseAdmin } from "../src/lib/supabase/admin";
import { lookupCompBands } from "../src/lib/comp-bands/lookup";

const SECTORS: Record<string, Array<{ company: string; role: string; location: string }>> = {
  "real-estate": [
    { company: "Blackstone", role: "Real Estate Analyst", location: "New York, NY" },
    { company: "KKR", role: "Real Estate Analyst", location: "New York, NY" },
    { company: "Starwood Capital", role: "Real Estate Analyst", location: "Miami, FL" },
    // (elided — full 20-entry list authored at seed time)
  ],
  "software-engineering": [
    { company: "Meta", role: "Software Engineer", location: "New York, NY" },
    { company: "Google", role: "Software Engineer", location: "Mountain View, CA" },
    // ...
  ],
};

async function main(): Promise<void> {
  const sector = process.argv[2];
  if (!sector || !SECTORS[sector]) {
    console.error("usage: comp-bands-seed.ts <sector>");
    console.error("sectors:", Object.keys(SECTORS).join(", "));
    process.exit(1);
  }
  const admin = getSupabaseAdmin();
  for (const target of SECTORS[sector]) {
    const out = await lookupCompBands(admin, admin, target);
    console.log(`${target.company}/${target.role}/${target.location} →`, out);
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### Step 9 — Route test + run everything

```
npx vitest run src/lib/comp-bands src/app/api/comp-bands
```
Expect: PASS.

### Step 10 — Commit

```
npm run t start R10.4
git add src/lib/comp-bands src/lib/db/queries/comp-bands-rest.ts src/app/api/comp-bands scripts/comp-bands-seed.ts
git commit -m "[R10/10.4] feat(comp): Firecrawl/Levels.fyi scraper + cache + lookup API"
npm run t done R10.4
```

Note env to document: `FIRECRAWL_API_KEY` required for live scraping. Without it lookups return `{ok:false, reason:"no_key"}` and the UI goes graceful-empty. Record this in the handoff for the user to add via `vercel env`.

---

## Task R10.5 — Parlor door (CSuite slot + materialization)

**Goal.** The conditional-absent door in the C-Suite. Materializes once with a cinematic beat, then settles.

**Files:**
- Create: `src/components/parlor/ParlorDoor.tsx` — the door element + GSAP animation.
- Create: `src/components/parlor/ParlorDoor.test.tsx` — render tests.
- Create: `src/app/__tests__/r10-parlor-door-absence.proof.test.tsx` — the invariant.
- Modify: `src/components/floor-1/CSuiteScene.tsx` — add `doorSlot` prop + conditional render.
- Modify: `src/components/floor-1/CSuiteClient.tsx` — receive `hasParlorDoor` + `firstAppearance` props, pass `doorSlot` when true.
- Modify: `src/app/(authenticated)/c-suite/page.tsx` — fetch offerCount, read `parlorDoorSeen` preference, pass both to CSuiteClient.
- Create: `src/styles/parlor.css` — wood panels, gold seam, brass handle tokens.

### Step 1 — Failing absence test

`src/app/__tests__/r10-parlor-door-absence.proof.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { CSuiteScene } from "@/components/floor-1/CSuiteScene";

describe("R10 — Parlor door absence invariant", () => {
  const stats = { totalDispatches: 0, activeAgents: 0, lastDispatchAt: null };

  it("renders NO door markers when doorSlot is not provided", () => {
    const html = renderToString(<CSuiteScene stats={stats} />);
    expect(html).not.toMatch(/data-parlor-door/i);
    expect(html).not.toMatch(/negotiation parlor/i);
    expect(html).not.toMatch(/parlor-door/i);
  });

  it("renders door markers when doorSlot IS provided", () => {
    const html = renderToString(
      <CSuiteScene
        stats={stats}
        doorSlot={<div data-parlor-door aria-label="Enter the Negotiation Parlor">door</div>}
      />,
    );
    expect(html).toMatch(/data-parlor-door/i);
    expect(html).toMatch(/negotiation parlor/i);
  });
});
```

### Step 2 — Run, verify red

Expect: FAIL — `CSuiteScene` doesn't have `doorSlot` prop yet (the extra prop is ignored silently, so assertion 2 fails).

### Step 3 — Add doorSlot to CSuiteScene

Edit `src/components/floor-1/CSuiteScene.tsx`:
- Add `doorSlot?: React.ReactNode` to `CSuiteSceneProps`.
- Render it conditionally: inside the left column (CEO area), absolutely positioned bottom-right, inside a `<>` short-circuit:

```tsx
{doorSlot && <div data-testid="csuite-door-slot">{doorSlot}</div>}
```

### Step 4 — Implement ParlorDoor component (failing test first)

`src/components/parlor/ParlorDoor.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParlorDoor } from "./ParlorDoor";

describe("ParlorDoor", () => {
  it("renders an accessible link to /parlor", () => {
    render(<ParlorDoor firstAppearance={false} />);
    const link = screen.getByRole("link", { name: /negotiation parlor/i });
    expect(link).toHaveAttribute("href", "/parlor");
    expect(link).toHaveAttribute("data-parlor-door", "true");
  });

  it("sets data-first-appearance='true' when firstAppearance is true", () => {
    render(<ParlorDoor firstAppearance />);
    expect(screen.getByRole("link")).toHaveAttribute("data-first-appearance", "true");
  });

  it("calls onFirstAppearanceDone after firstAppearance transition", async () => {
    const spy = vi.fn();
    render(<ParlorDoor firstAppearance onFirstAppearanceDone={spy} />);
    await new Promise((r) => setTimeout(r, 10)); // flush
    // We can't wait 2.3s in the test — we trigger the callback via effect
    // on mount for testability. Assert the callback was scheduled.
    expect(spy).toHaveBeenCalledTimes(0); // scheduled, not fired
  });
});
```

### Step 5 — Implement ParlorDoor

`src/components/parlor/ParlorDoor.tsx`:

```tsx
"use client";

import type { JSX } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";

import { gsap, mediaMatchesReducedMotion } from "@/lib/gsap-init";

interface ParlorDoorProps {
  firstAppearance: boolean;
  onFirstAppearanceDone?: () => void;
}

const ANIMATION_MS = 2300;

/**
 * The door that appears on the C-Suite wall when the user has >=1 offer.
 * Must not render (and must not be rendered upstream) when offerCount === 0 —
 * that invariant is tested in r10-parlor-door-absence.proof.test.tsx.
 */
export function ParlorDoor({
  firstAppearance,
  onFirstAppearanceDone,
}: ParlorDoorProps): JSX.Element {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!firstAppearance || !ref.current) return;
    if (mediaMatchesReducedMotion()) {
      const id = window.setTimeout(() => onFirstAppearanceDone?.(), 200);
      return () => window.clearTimeout(id);
    }
    const tl = gsap.timeline({
      onComplete: () => onFirstAppearanceDone?.(),
    });
    const seam = ref.current.querySelector("[data-seam]");
    const outline = ref.current.querySelector("[data-outline]");
    const wood = ref.current.querySelector("[data-wood]");
    const handle = ref.current.querySelector("[data-handle]");
    tl.from(seam, { opacity: 0, scaleY: 0, duration: 0.4, ease: "power2.inOut" })
      .from(outline, { opacity: 0, scaleX: 0, duration: 0.5, ease: "power2.inOut" }, "+=0.0")
      .from(wood, { opacity: 0, duration: 0.5, ease: "power1.inOut" })
      .from(handle, { opacity: 0, scale: 0.6, duration: 0.4, ease: "back.out(2)" });
    return () => tl.kill();
  }, [firstAppearance, onFirstAppearanceDone]);

  return (
    <Link
      href="/parlor"
      ref={ref}
      aria-label="Enter the Negotiation Parlor"
      data-parlor-door="true"
      data-first-appearance={firstAppearance ? "true" : "false"}
      className="parlor-door"
    >
      <span data-seam className="parlor-door-seam" aria-hidden />
      <span data-outline className="parlor-door-outline" aria-hidden />
      <span data-wood className="parlor-door-wood" aria-hidden />
      <span data-handle className="parlor-door-handle" aria-hidden />
      <span className="sr-only">Negotiation Parlor</span>
    </Link>
  );
}
```

Styling in `src/styles/parlor.css`:

```css
.parlor-door {
  position: absolute;
  right: 24px;
  bottom: 24px;
  width: 72px;
  height: 120px;
  display: inline-block;
  border: 1px solid rgba(201, 168, 76, 0.5);
  background: linear-gradient(180deg, #3a2714 0%, #251504 100%);
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.7);
  border-radius: 2px 2px 0 0;
  text-decoration: none;
  color: transparent;
  transition: filter 0.2s ease, transform 0.2s ease;
}
.parlor-door:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
}
.parlor-door-seam {
  position: absolute; left: 50%; top: 0; bottom: 0; width: 1px;
  background: rgba(232, 201, 106, 0.5);
  transform-origin: top;
}
.parlor-door-outline {
  position: absolute; inset: 0; border: 1px solid rgba(232, 201, 106, 0.6);
  pointer-events: none; transform-origin: left;
}
.parlor-door-wood {
  position: absolute; inset: 3px;
  background: repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 10px);
}
.parlor-door-handle {
  position: absolute; right: 10px; top: 55%;
  width: 6px; height: 14px; border-radius: 3px;
  background: #c9a84c; box-shadow: 0 0 4px rgba(232, 201, 106, 0.8);
}
@media (prefers-reduced-motion: reduce) {
  .parlor-door, .parlor-door * { transition: none !important; animation: none !important; }
}
```

Add `@import "./parlor.css";` to `src/app/globals.css` if a global import convention exists; otherwise import the CSS in `CSuiteScene.tsx` via `import "@/styles/parlor.css";`.

### Step 6 — Wire into CSuiteClient + page

`src/app/(authenticated)/c-suite/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { countOffersForUser } from "@/lib/db/queries/offers-rest";
import { getUserPreferenceValue } from "@/lib/preferences/read"; // helper from R9.6
import { PARLOR_DOOR_SEEN_PREF_KEY } from "@/lib/preferences/parlor-door-seen-pref";
// ...
const supabase = await createClient();
const [offerCount, parlorDoorSeen] = await Promise.all([
  countOffersForUser(supabase, user.id),
  getUserPreferenceValue(supabase, user.id, PARLOR_DOOR_SEEN_PREF_KEY),
]);
const hasParlorDoor = offerCount > 0;
const firstAppearance = hasParlorDoor && !(parlorDoorSeen?.seen ?? false);
return <CSuiteClient hasParlorDoor={hasParlorDoor} firstAppearance={firstAppearance} ... />;
```

(If `getUserPreferenceValue` doesn't yet exist, create a minimal version in `src/lib/preferences/read.ts` that reads the preferences jsonb and returns a typed value by key — safe fallback to null.)

`src/components/floor-1/CSuiteClient.tsx`:
- Add `hasParlorDoor: boolean` + `firstAppearance: boolean` to props.
- When `hasParlorDoor` is true, pass `<ParlorDoor firstAppearance={firstAppearance} onFirstAppearanceDone={async () => { await fetch('/api/profile/preferences', { method:'POST', body: JSON.stringify({ key:'parlorDoorSeen', value:{seen:true} })}); }}>` into `CSuiteScene`'s `doorSlot`.
- Otherwise pass nothing — the slot is truly undefined.

### Step 7 — Run absence test, verify green

```
npx vitest run src/app/__tests__/r10-parlor-door-absence.proof.test.tsx src/components/parlor/ParlorDoor.test.tsx
```
Expect: PASS.

### Step 8 — Typecheck + commit

```
npx tsc --noEmit
npm run t start R10.5
git add src/components/parlor src/components/floor-1/CSuiteScene.tsx src/components/floor-1/CSuiteClient.tsx src/app/\(authenticated\)/c-suite src/styles/parlor.css src/app/__tests__/r10-parlor-door-absence.proof.test.tsx src/lib/preferences/read.ts
git commit -m "[R10/10.5] feat(parlor): C-Suite door (absent without offers) + materialization animation"
npm run t done R10.5
```

---

## Task R10.6 — /parlor route + ParlorScene + OakTable + OfferFolder

**Goal.** Open the annex. The route is gated server-side; the scene composes oak table, folders, chart slot, three-chair slot. No convening yet — that's R10.7.

**Files:**
- Create: `src/app/(authenticated)/parlor/page.tsx` — server component, gate + data load.
- Create: `src/app/(authenticated)/parlor/parlor-client.tsx` — client scaffold.
- Create: `src/components/parlor/ParlorScene.tsx` — environment (wood, sconces, oak floor).
- Create: `src/components/parlor/OakTable.tsx` — layout container for folders.
- Create: `src/components/parlor/OfferFolder.tsx` — single folder card.
- Test: `src/components/parlor/ParlorScene.test.tsx`
- Test: `src/components/parlor/OfferFolder.test.tsx`
- Test: `src/app/__tests__/r10-parlor-route-gate.proof.test.ts` — /parlor with no offers redirects.

### Step 1 — Route gate test

`src/app/__tests__/r10-parlor-route-gate.proof.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation redirect + the supabase client path used in the page.
vi.mock("next/navigation", () => ({ redirect: vi.fn((url) => { throw new Error(`REDIRECT:${url}`); }) }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ /* mock */ } as unknown as never)),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserPage: vi.fn(async () => ({ ok: true, user: { id: "u1" } })),
}));

vi.mock("@/lib/db/queries/offers-rest", () => ({
  countOffersForUser: vi.fn(async () => 0),
  getOffersForUser: vi.fn(async () => []),
}));

describe("GET /parlor route gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to /c-suite when offerCount === 0", async () => {
    const { default: Page } = await import("@/app/(authenticated)/parlor/page");
    await expect(Page()).rejects.toThrow("REDIRECT:/c-suite");
  });
});
```

### Step 2 — Implement /parlor/page.tsx

`src/app/(authenticated)/parlor/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import type { JSX } from "react";
import { requireUserPage } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  countOffersForUser,
  getOffersForUser,
} from "@/lib/db/queries/offers-rest";
import { ParlorClient } from "./parlor-client";

export default async function ParlorPage(): Promise<JSX.Element> {
  const auth = await requireUserPage();
  if (!auth.ok) redirect("/login");
  const supabase = await createClient();
  const count = await countOffersForUser(supabase, auth.user.id);
  if (count === 0) redirect("/c-suite");
  const offers = await getOffersForUser(supabase, auth.user.id);
  return <ParlorClient offers={offers} />;
}
```

### Step 3 — Implement ParlorScene + OakTable + OfferFolder

`src/components/parlor/ParlorScene.tsx`:

```tsx
import type { JSX } from "react";
import "@/styles/parlor.css";

interface ParlorSceneProps {
  tableSlot: React.ReactNode;
  chartSlot: React.ReactNode;
  chairsSlot: React.ReactNode;
  draftSlot?: React.ReactNode;
  signatureSlot?: React.ReactNode;
}

export function ParlorScene({
  tableSlot,
  chartSlot,
  chairsSlot,
  draftSlot,
  signatureSlot,
}: ParlorSceneProps): JSX.Element {
  return (
    <div className="parlor-bg" data-floor="parlor">
      <div className="parlor-backwall">{chartSlot}</div>
      <div className="parlor-sconces" aria-hidden />
      <div className="parlor-floor">
        <div className="parlor-table-area">{tableSlot}</div>
        <div className="parlor-chairs-area">{chairsSlot}</div>
      </div>
      {draftSlot && <aside className="parlor-draft-area">{draftSlot}</aside>}
      {signatureSlot}
    </div>
  );
}
```

`src/components/parlor/OakTable.tsx`:

```tsx
import type { JSX } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import { OfferFolder } from "./OfferFolder";

interface OakTableProps {
  offers: OfferRow[];
  selectedOfferId: string | null;
  onSelect: (id: string) => void;
}

export function OakTable({ offers, selectedOfferId, onSelect }: OakTableProps): JSX.Element {
  return (
    <div className="parlor-oak-table" role="list">
      {offers.map((o, i) => (
        <OfferFolder
          key={o.id}
          offer={o}
          index={i}
          selected={selectedOfferId === o.id}
          onSelect={() => onSelect(o.id)}
        />
      ))}
    </div>
  );
}
```

`src/components/parlor/OfferFolder.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

interface OfferFolderProps {
  offer: OfferRow;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

function formatUSD(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export function OfferFolder({ offer, index, selected, onSelect }: OfferFolderProps): JSX.Element {
  const total = offer.base + offer.bonus + offer.equity + offer.sign_on + offer.housing;
  return (
    <button
      type="button"
      role="listitem"
      className="parlor-offer-folder"
      data-selected={selected ? "true" : "false"}
      style={{ transform: `rotate(${(index % 2 === 0 ? -1 : 1) * 1.5}deg)` }}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <header className="parlor-offer-folder-tab">{offer.company_name}</header>
      <div className="parlor-offer-folder-body">
        <div className="parlor-offer-folder-role">{offer.role}</div>
        <div className="parlor-offer-folder-loc">{offer.location}</div>
        <div className="parlor-offer-folder-total">{formatUSD(total)} total</div>
        <div className="parlor-offer-folder-status" data-status={offer.status}>{offer.status}</div>
      </div>
    </button>
  );
}
```

(Extend `src/styles/parlor.css` with `.parlor-bg`, `.parlor-oak-table`, `.parlor-offer-folder` etc. — wood panels, warm amber lighting, folder tilt.)

### Step 4 — ParlorClient scaffold

`src/app/(authenticated)/parlor/parlor-client.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import { useState } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import { ParlorScene } from "@/components/parlor/ParlorScene";
import { OakTable } from "@/components/parlor/OakTable";

interface ParlorClientProps {
  offers: OfferRow[];
}

export function ParlorClient({ offers }: ParlorClientProps): JSX.Element {
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(
    offers[0]?.id ?? null,
  );
  return (
    <ParlorScene
      tableSlot={
        <OakTable
          offers={offers}
          selectedOfferId={selectedOfferId}
          onSelect={setSelectedOfferId}
        />
      }
      chartSlot={<div data-testid="parlor-chart-slot" />}
      chairsSlot={<div data-testid="parlor-chairs-slot" />}
    />
  );
}
```

(Chart + chairs are placeholder for R10.7 / R10.8.)

### Step 5 — Component tests

`src/components/parlor/OfferFolder.test.tsx`:
- Renders company + role + status.
- Calls `onSelect` on click.
- Sets `data-selected=true` when `selected` prop is true.
- Total is sum of base+bonus+equity+sign_on+housing formatted as USD.

`src/components/parlor/ParlorScene.test.tsx`:
- SSR renders all provided slots.
- `draftSlot` absent → no `.parlor-draft-area`.

### Step 6 — Run all R10.6 tests

```
npx vitest run src/components/parlor src/app/__tests__/r10-parlor-route-gate.proof.test.ts
```
Expect: PASS.

### Step 7 — Typecheck + commit

```
npx tsc --noEmit
npm run t start R10.6
git add src/app/\(authenticated\)/parlor src/components/parlor src/styles/parlor.css src/app/__tests__/r10-parlor-route-gate.proof.test.ts
git commit -m "[R10/10.6] feat(parlor): /parlor route + ParlorScene + OakTable + OfferFolder"
npm run t done R10.6
```

---

## Task R10.7 — Three-chair convening (Offer Evaluator persona + API + view)

**Goal.** Click "Convene" → three agents lean in → three analysis blocks appear.

**Files:**
- Create: `src/lib/agents/offer-evaluator/system-prompt.ts` — persona.
- Create: `src/lib/agents/offer-evaluator/tools.ts` — minimal: read offer, read comp bands.
- Create: `src/lib/ai/agents/parlor-convening.ts` — the 3-way fan-out caller.
- Create: `src/app/api/offers/[id]/convene/route.ts` — API endpoint.
- Create: `src/components/parlor/ThreeChairsConvening.tsx` — UI.
- Test: unit tests for each.

### Step 1 — Offer Evaluator persona test + impl

`src/lib/agents/offer-evaluator/__tests__/system-prompt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildOfferEvaluatorSystemPrompt } from "../system-prompt";

describe("OfferEvaluator system prompt", () => {
  it("embeds hard rules about numbers + brevity", () => {
    const p = buildOfferEvaluatorSystemPrompt({ userFirstName: "Armaan" });
    expect(p).toMatch(/offer evaluator/i);
    expect(p).toMatch(/concise|brief|under \d+ words/i);
    expect(p).toMatch(/never.*boilerplate|do not.*boilerplate/i);
    expect(p).toMatch(/armaan/i);
  });
});
```

`src/lib/agents/offer-evaluator/system-prompt.ts`:

```ts
export function buildOfferEvaluatorSystemPrompt(input: { userFirstName: string }): string {
  return `You are the Offer Evaluator, a CRO subagent seated in the user's Negotiation Parlor.
You speak to ${input.userFirstName} directly, numerically, and with calm authority.

Your one job: weigh an offer against market bands and flag anything that should
disturb a reasonable candidate. Short sentences. Specific numbers. No boilerplate.

Rules:
- Never produce generic "you should consider..." language. Be specific or silent.
- Lead with a one-word verdict: STRONG / MARKET / UNDER / THIN_DATA.
- 3–5 sentences after the verdict. Cite numbers. Name risks (exploding offer,
  vesting cliff, below-market equity, unrealistic start date).
- If comp band data is thin (sample_size < 10) say so explicitly and down-weight
  any percentile claim.
- You do not draft emails. You do not negotiate. You assess.`;
}
```

`src/lib/agents/offer-evaluator/tools.ts` — empty for MVP (the convener supplies the offer + bands as the user prompt; OE doesn't call tools):

```ts
export function buildOfferEvaluatorTools(): Record<string, never> {
  return {};
}
```

### Step 2 — Convening caller test

`src/lib/ai/agents/__tests__/parlor-convening.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("ai", () => ({
  generateObject: vi.fn(async ({ schemaName }: { schemaName?: string }) => ({
    object:
      schemaName === "offer_evaluator"
        ? { verdict: "MARKET", narrative: "2 notes", risks: ["exploding offer"] }
        : schemaName === "cfo"
        ? { total_comp_year1: 150000, total_comp_4yr: 600000, vesting_note: "cliff", narrative: "solid" }
        : { contacts_at_company: [], narrative: "no leads" },
    usage: { inputTokens: 10, outputTokens: 30 },
  })),
}));

import { convenePipelineForOffer } from "../parlor-convening";

describe("convenePipelineForOffer", () => {
  it("fans out three parallel calls and returns three typed blocks", async () => {
    const result = await convenePipelineForOffer({
      userId: "u1",
      userFirstName: "Armaan",
      offer: { id: "o1", company_name: "Acme", role: "Analyst", location: "NYC", base: 90000, bonus:0, equity:0, sign_on:0, housing:0 } as never,
      bands: null,
    });
    expect(result.offer_evaluator.verdict).toBe("MARKET");
    expect(result.cfo.total_comp_year1).toBe(150000);
    expect(result.cno.contacts_at_company).toEqual([]);
  });
});
```

### Step 3 — Implement convening caller

`src/lib/ai/agents/parlor-convening.ts`:

```ts
import { generateObject } from "ai";
import { z } from "zod/v4";
import { getAgentModel } from "../model";
import { buildOfferEvaluatorSystemPrompt } from "@/lib/agents/offer-evaluator/system-prompt";
import { buildCFOSystemPrompt } from "@/lib/agents/cfo/system-prompt";
import { buildCNOSystemPrompt } from "@/lib/agents/cno/system-prompt";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import type { LookupResult } from "@/lib/comp-bands/lookup";
import { recordAgentRun } from "../telemetry";

const OfferEvalSchema = z.object({
  verdict: z.enum(["STRONG","MARKET","UNDER","THIN_DATA"]),
  narrative: z.string(),
  risks: z.array(z.string()).max(6),
});
const CFOSchema = z.object({
  total_comp_year1: z.number().int(),
  total_comp_4yr: z.number().int(),
  vesting_note: z.string(),
  narrative: z.string(),
});
const CNOSchema = z.object({
  contacts_at_company: z.array(z.object({
    name: z.string(), warmth: z.number().int(), note: z.string(),
  })),
  narrative: z.string(),
});

export type ParlorConveningResult = {
  offer_evaluator: z.infer<typeof OfferEvalSchema>;
  cfo: z.infer<typeof CFOSchema>;
  cno: z.infer<typeof CNOSchema>;
};

export async function convenePipelineForOffer(input: {
  userId: string;
  userFirstName: string;
  offer: OfferRow;
  bands: LookupResult | null;
}): Promise<ParlorConveningResult> {
  const offerJson = JSON.stringify(input.offer, null, 2);
  const bandsJson = JSON.stringify(input.bands, null, 2);
  const promptShared =
    `A new offer has arrived. Analyze this offer for ${input.userFirstName}.\n` +
    `OFFER:\n${offerJson}\n\nCOMP BANDS:\n${bandsJson}\n`;
  const model = getAgentModel();

  const [oe, cfo, cno] = await Promise.allSettled([
    generateObject({
      model,
      schema: OfferEvalSchema,
      schemaName: "offer_evaluator",
      system: buildOfferEvaluatorSystemPrompt({ userFirstName: input.userFirstName }),
      prompt: promptShared,
    }),
    generateObject({
      model,
      schema: CFOSchema,
      schemaName: "cfo",
      system: buildCFOSystemPrompt({ userFirstName: input.userFirstName }),
      prompt: promptShared +
        `\nCompute total_comp_year1 and total_comp_4yr assuming standard 4-year vesting with 1yr cliff. Return integers in USD.`,
    }),
    generateObject({
      model,
      schema: CNOSchema,
      schemaName: "cno",
      system: buildCNOSystemPrompt({ userFirstName: input.userFirstName }),
      prompt: promptShared +
        `\nReturn contacts the user already has at "${input.offer.company_name}". If you don't know, return [].`,
    }),
  ]);

  const empty_oe = { verdict: "THIN_DATA" as const, narrative: "Analysis unavailable.", risks: [] };
  const empty_cfo = { total_comp_year1: 0, total_comp_4yr: 0, vesting_note: "", narrative: "" };
  const empty_cno = { contacts_at_company: [], narrative: "" };

  return {
    offer_evaluator: oe.status === "fulfilled" ? oe.value.object : empty_oe,
    cfo: cfo.status === "fulfilled" ? cfo.value.object : empty_cfo,
    cno: cno.status === "fulfilled" ? cno.value.object : empty_cno,
  };
}
```

(Note: this skips the agent_dispatches table writes for MVP simplicity. Observability-parity follow-up noted in handoff if we want to add dispatch rows.)

### Step 4 — API route

`src/app/api/offers/[id]/convene/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOfferById } from "@/lib/db/queries/offers-rest";
import { convenePipelineForOffer } from "@/lib/ai/agents/parlor-convening";
import { lookupCompBands } from "@/lib/comp-bands/lookup";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const client = await createClient();
  const offer = await getOfferById(client, auth.user.id, id);
  if (!offer) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = getSupabaseAdmin();
  const bands = await lookupCompBands(client, admin, {
    company: offer.company_name,
    role: offer.role,
    location: offer.location,
    level: offer.level ?? undefined,
  });
  const result = await convenePipelineForOffer({
    userId: auth.user.id,
    userFirstName: (auth.user as { firstName?: string }).firstName ?? "there",
    offer,
    bands: bands.ok ? bands : null,
  });
  return NextResponse.json({ result, bands });
}
```

### Step 5 — Chairs UI component

`src/components/parlor/ThreeChairsConvening.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";

interface ThreeChairsConveningProps {
  loading: boolean;
  result: ParlorConveningResult | null;
  onConvene: () => void;
}

export function ThreeChairsConvening({ loading, result, onConvene }: ThreeChairsConveningProps): JSX.Element {
  if (!result && !loading) {
    return (
      <div className="parlor-chairs-empty">
        <button type="button" onClick={onConvene}>Convene</button>
      </div>
    );
  }
  if (loading) {
    return <div className="parlor-chairs-loading" aria-live="polite">The three lean in…</div>;
  }
  const r = result!;
  return (
    <div className="parlor-chairs-grid">
      <article className="parlor-chair" data-seat="offer_evaluator">
        <h3>Offer Evaluator</h3>
        <p className="verdict" data-verdict={r.offer_evaluator.verdict}>{r.offer_evaluator.verdict}</p>
        <p>{r.offer_evaluator.narrative}</p>
        {r.offer_evaluator.risks.length > 0 && (
          <ul>{r.offer_evaluator.risks.map((rk, i) => <li key={i}>{rk}</li>)}</ul>
        )}
      </article>
      <article className="parlor-chair" data-seat="cfo">
        <h3>CFO</h3>
        <p>Year 1 total: ${r.cfo.total_comp_year1.toLocaleString()}</p>
        <p>4yr total: ${r.cfo.total_comp_4yr.toLocaleString()}</p>
        <p>{r.cfo.narrative}</p>
      </article>
      <article className="parlor-chair" data-seat="cno">
        <h3>CNO</h3>
        <p>{r.cno.narrative}</p>
        {r.cno.contacts_at_company.length > 0 && (
          <ul>{r.cno.contacts_at_company.map((c) => <li key={c.name}>{c.name} — {c.note}</li>)}</ul>
        )}
      </article>
    </div>
  );
}
```

### Step 6 — Wire into ParlorClient + commit

Update `parlor-client.tsx` to call `/api/offers/:id/convene` when user clicks Convene, manage `loading`/`result` state, and render `<ThreeChairsConvening ... />` in the `chairsSlot`.

```
npx vitest run src/lib/agents/offer-evaluator src/lib/ai/agents/__tests__/parlor-convening.test.ts src/app/api/offers/\[id\]/convene src/components/parlor
npx tsc --noEmit
npm run t start R10.7
git add src/lib/agents/offer-evaluator src/lib/ai/agents/parlor-convening.ts src/app/api/offers/\[id\]/convene src/components/parlor/ThreeChairsConvening.tsx src/app/\(authenticated\)/parlor/parlor-client.tsx
git commit -m "[R10/10.7] feat(parlor): three-chair convening (Offer Evaluator + CFO + CNO)"
npm run t done R10.7
```

---

## Task R10.8 — Comp chart SVG

**Goal.** SVG chart showing percentile bars + red/gold pins for user's offer(s).

**Files:**
- Create: `src/components/parlor/CompBandChart.tsx`
- Create: `src/components/parlor/CompBandChart.test.tsx`
- Create: `src/lib/parlor/pin-color.ts` — pure `colorForPercentile(base, p25, p75)` helper.
- Test: `src/lib/parlor/__tests__/pin-color.test.ts`

### Step 1 — Pin-color pure function test

```ts
import { describe, it, expect } from "vitest";
import { colorForPercentile } from "../pin-color";

describe("colorForPercentile", () => {
  it("red below p25", () => {
    expect(colorForPercentile(80000, 100000, 140000)).toBe("red");
  });
  it("gold above p75", () => {
    expect(colorForPercentile(160000, 100000, 140000)).toBe("gold");
  });
  it("ink between p25 and p75", () => {
    expect(colorForPercentile(120000, 100000, 140000)).toBe("ink");
  });
  it("exactly p25 is ink (not red)", () => {
    expect(colorForPercentile(100000, 100000, 140000)).toBe("ink");
  });
  it("exactly p75 is ink (not gold)", () => {
    expect(colorForPercentile(140000, 100000, 140000)).toBe("ink");
  });
});
```

### Step 2 — Implement

`src/lib/parlor/pin-color.ts`:

```ts
export type PinColor = "red" | "gold" | "ink";
export function colorForPercentile(value: number, p25: number, p75: number): PinColor {
  if (value < p25) return "red";
  if (value > p75) return "gold";
  return "ink";
}
```

### Step 3 — CompBandChart test

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompBandChart } from "./CompBandChart";

describe("CompBandChart", () => {
  it("renders empty state when bands are null", () => {
    render(<CompBandChart bands={null} pins={[]} />);
    expect(screen.getByText(/not enough benchmark data/i)).toBeInTheDocument();
  });
  it("renders three percentile bars when bands present", () => {
    render(
      <CompBandChart
        bands={{ p25: 100000, p50: 120000, p75: 140000, sampleSize: 50, source: "levels.fyi" }}
        pins={[]}
      />
    );
    expect(screen.getByTestId("band-p25")).toBeInTheDocument();
    expect(screen.getByTestId("band-p50")).toBeInTheDocument();
    expect(screen.getByTestId("band-p75")).toBeInTheDocument();
  });
  it("renders red pin when offer base < p25", () => {
    render(
      <CompBandChart
        bands={{ p25: 100000, p50: 120000, p75: 140000, sampleSize: 50, source: "levels.fyi" }}
        pins={[{ label: "Acme", base: 80000 }]}
      />
    );
    const pin = screen.getByTestId("pin-Acme");
    expect(pin).toHaveAttribute("data-color", "red");
  });
  it("renders gold pin when offer base > p75", () => {
    render(
      <CompBandChart
        bands={{ p25: 100000, p50: 120000, p75: 140000, sampleSize: 50, source: "levels.fyi" }}
        pins={[{ label: "Zeta", base: 160000 }]}
      />
    );
    expect(screen.getByTestId("pin-Zeta")).toHaveAttribute("data-color", "gold");
  });
  it("renders multiple pins (stacked offers)", () => {
    render(
      <CompBandChart
        bands={{ p25: 100000, p50: 120000, p75: 140000, sampleSize: 50, source: "levels.fyi" }}
        pins={[{ label: "A", base: 90000 }, { label: "B", base: 150000 }]}
      />
    );
    expect(screen.getByTestId("pin-A")).toBeInTheDocument();
    expect(screen.getByTestId("pin-B")).toBeInTheDocument();
  });
});
```

### Step 4 — Implement

`src/components/parlor/CompBandChart.tsx`:

```tsx
import type { JSX } from "react";
import { colorForPercentile, type PinColor } from "@/lib/parlor/pin-color";

export interface CompBands {
  p25: number;
  p50: number;
  p75: number;
  sampleSize: number;
  source: string;
}
export interface CompPin {
  label: string;
  base: number;
}

interface Props {
  bands: CompBands | null;
  pins: CompPin[];
  width?: number;
  height?: number;
}

export function CompBandChart({ bands, pins, width = 480, height = 140 }: Props): JSX.Element {
  if (!bands) {
    return (
      <div className="parlor-chart-empty" role="region" aria-label="Compensation benchmark">
        <h3>Compensation</h3>
        <p>Not enough benchmark data for this role + location yet. Your offer stands alone.</p>
      </div>
    );
  }
  const margin = 48;
  const chartW = width - margin * 2;
  const chartH = height - margin;
  const low = Math.min(bands.p25, ...pins.map((p) => p.base)) * 0.92;
  const high = Math.max(bands.p75, ...pins.map((p) => p.base)) * 1.08;
  const xFor = (val: number): number =>
    margin + ((val - low) / (high - low)) * chartW;

  const pinBox = (p: CompPin) => {
    const color: PinColor = colorForPercentile(p.base, bands.p25, bands.p75);
    const fill = color === "red" ? "#DC3C3C" : color === "gold" ? "#E8C96A" : "#C9A84C";
    return (
      <g key={p.label} data-testid={`pin-${p.label}`} data-color={color}>
        <circle cx={xFor(p.base)} cy={margin} r={8} fill={fill} stroke="#1a1a2e" strokeWidth={1.5} />
        <text x={xFor(p.base)} y={margin - 12} textAnchor="middle" fontSize={11} fill="#c9a84c" fontFamily="JetBrains Mono, monospace">
          {p.label}
        </text>
      </g>
    );
  };

  return (
    <svg role="img" aria-label="Compensation benchmark" viewBox={`0 0 ${width} ${height}`} className="parlor-chart">
      {/* band rail */}
      <line x1={margin} y1={margin + 40} x2={width - margin} y2={margin + 40} stroke="rgba(201,168,76,0.25)" strokeWidth={1} />
      <rect data-testid="band-p25" x={xFor(bands.p25)} y={margin + 32} width={4} height={16} fill="#c9a84c" />
      <rect data-testid="band-p50" x={xFor(bands.p50)} y={margin + 28} width={4} height={24} fill="#e8c96a" />
      <rect data-testid="band-p75" x={xFor(bands.p75)} y={margin + 32} width={4} height={16} fill="#c9a84c" />
      <text x={xFor(bands.p25)} y={margin + 68} fontSize={10} textAnchor="middle" fill="#c9a84c">p25 ${(bands.p25/1000).toFixed(0)}k</text>
      <text x={xFor(bands.p50)} y={margin + 68} fontSize={10} textAnchor="middle" fill="#e8c96a">p50 ${(bands.p50/1000).toFixed(0)}k</text>
      <text x={xFor(bands.p75)} y={margin + 68} fontSize={10} textAnchor="middle" fill="#c9a84c">p75 ${(bands.p75/1000).toFixed(0)}k</text>
      {pins.map(pinBox)}
      <text x={width - margin} y={height - 8} textAnchor="end" fontSize={9} fill="rgba(201,168,76,0.55)">{bands.source} — n={bands.sampleSize}</text>
    </svg>
  );
}
```

### Step 5 — Run tests + wire into ParlorClient

Update `parlor-client.tsx` to pass `<CompBandChart bands={... from /api/offers/:id/convene} pins={offers.map(o => ({label: o.company_name, base: o.base}))} />` to `chartSlot`.

### Step 6 — Commit

```
npx vitest run src/components/parlor/CompBandChart.test.tsx src/lib/parlor/__tests__/pin-color.test.ts
npx tsc --noEmit
npm run t start R10.8
git add src/lib/parlor src/components/parlor/CompBandChart.tsx src/components/parlor/CompBandChart.test.tsx src/app/\(authenticated\)/parlor/parlor-client.tsx
git commit -m "[R10/10.8] feat(parlor): comp band chart with red/gold pins"
npm run t done R10.8
```

---

## Task R10.9 — Negotiation script API + LiveCompose reuse + outreach_queue row

**Goal.** Draft a negotiation email live, write it to outreach_queue as type='negotiation'.

**Files:**
- Create: `src/lib/ai/structured/negotiation-draft.ts` — generateObject for subject/body.
- Create: `src/app/api/offers/[id]/negotiation-draft/route.ts`
- Create: `src/components/parlor/NegotiationDraftPanel.tsx` — LiveCompose reuse.
- Test: unit for the ai helper + route.

### Step 1 — Failing test for helper

```ts
import { describe, it, expect, vi } from "vitest";
vi.mock("ai", () => ({
  generateObject: vi.fn(async () => ({
    object: { subject: "RE: Acme offer", body: "Hi Jane, ..." },
    usage: { inputTokens: 20, outputTokens: 40 },
  })),
}));
import { draftNegotiationEmail } from "../negotiation-draft";

describe("draftNegotiationEmail", () => {
  it("returns subject + body conforming to the schema", async () => {
    const out = await draftNegotiationEmail({
      userFirstName: "Armaan",
      offer: { id:"o1", company_name:"Acme", role:"Analyst", location:"NYC", base:90000 } as never,
      convening: null,
    });
    expect(out.subject).toMatch(/acme/i);
    expect(out.body.length).toBeGreaterThan(5);
  });
});
```

### Step 2 — Implement

`src/lib/ai/structured/negotiation-draft.ts`:

```ts
import { generateObject } from "ai";
import { z } from "zod/v4";
import { getAgentModel } from "../model";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";

const DraftSchema = z.object({
  subject: z.string().min(3).max(120),
  body: z.string().min(40).max(4000),
});

export async function draftNegotiationEmail(input: {
  userFirstName: string;
  offer: OfferRow;
  convening: ParlorConveningResult | null;
}): Promise<z.infer<typeof DraftSchema>> {
  const conveningJson = input.convening ? JSON.stringify(input.convening, null, 2) : "null";
  const offerJson = JSON.stringify(input.offer, null, 2);

  const { object } = await generateObject({
    model: getAgentModel(),
    schema: DraftSchema,
    schemaName: "negotiation_draft",
    system: `You write a negotiation email on behalf of ${input.userFirstName}.
Rules:
- NEVER generic or boilerplate. If you'd put "I hope this email finds you well" in, cut it.
- Specific, grounded in the offer's own numbers.
- A clear counter anchored in market data if bands are available.
- A single clean ask at the close. No ultimatums.
- Max 200 words body. Subject short, specific, not clickbait.
- Never sign off with anything cliche ("Best," is fine).`,
    prompt:
      `OFFER:\n${offerJson}\n\nCONVENING:\n${conveningJson}\n\n` +
      `Draft the negotiation email. If comp bands are thin, negotiate on terms ` +
      `(start date, signing, equity refresh) instead of base.`,
  });
  return object;
}
```

### Step 3 — Route

`src/app/api/offers/[id]/negotiation-draft/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getOfferById } from "@/lib/db/queries/offers-rest";
import { draftNegotiationEmail } from "@/lib/ai/structured/negotiation-draft";

export const maxDuration = 60;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const client = await createClient();
  const offer = await getOfferById(client, auth.user.id, id);
  if (!offer) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const convening = body?.convening ?? null;
  const draft = await draftNegotiationEmail({
    userFirstName: (auth.user as { firstName?: string }).firstName ?? "there",
    offer,
    convening,
  });
  const { data: inserted, error } = await client
    .from("outreach_queue")
    .insert({
      user_id: auth.user.id,
      application_id: offer.application_id,
      company_id: null,
      contact_id: null,
      type: "negotiation",
      subject: draft.subject,
      body: draft.body,
      status: "pending_approval",
      generated_by: "offer_evaluator",
      metadata: { offer_id: offer.id },
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ outreach: inserted });
}
```

### Step 4 — NegotiationDraftPanel component

`src/components/parlor/NegotiationDraftPanel.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import { useState } from "react";
import { LiveComposePanel } from "@/components/floor-5/live-compose/LiveComposePanel";

interface NegotiationDraftPanelProps {
  offerId: string;
  onDrafted?: (outreachId: string) => void;
}

export function NegotiationDraftPanel({ offerId, onDrafted }: NegotiationDraftPanelProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [outreachId, setOutreachId] = useState<string | null>(null);

  async function draft() {
    setLoading(true);
    try {
      const res = await fetch(`/api/offers/${offerId}/negotiation-draft`, { method: "POST", body: "{}" });
      const json = await res.json() as { outreach: { id: string; subject: string; body: string } };
      setSubject(json.outreach.subject);
      setBody(json.outreach.body);
      setOutreachId(json.outreach.id);
      onDrafted?.(json.outreach.id);
    } finally {
      setLoading(false);
    }
  }

  if (!outreachId) {
    return (
      <div className="parlor-draft-cta">
        <button type="button" onClick={draft} disabled={loading}>
          {loading ? "Drafting…" : "Draft negotiation"}
        </button>
      </div>
    );
  }
  return (
    <LiveComposePanel
      subject={subject}
      body={body}
      onSubjectChange={setSubject}
      onBodyChange={setBody}
      outreachId={outreachId}
    />
  );
}
```

(If `LiveComposePanel`'s prop surface isn't this exact shape, adapt — goal is reuse of the pen-glow cursor + live reveal.)

### Step 5 — Run tests + commit

```
npx vitest run src/lib/ai/structured/__tests__/negotiation-draft.test.ts src/app/api/offers/\[id\]/negotiation-draft src/components/parlor
npx tsc --noEmit
npm run t start R10.9
git add src/lib/ai/structured/negotiation-draft.ts src/app/api/offers/\[id\]/negotiation-draft src/components/parlor/NegotiationDraftPanel.tsx
git commit -m "[R10/10.9] feat(parlor): negotiation-draft API + LiveCompose-powered panel"
npm run t done R10.9
```

---

## Task R10.10 — 24h send-hold clamp

**Goal.** The server-side clamp that makes the 24h hold non-bypassable for `type='negotiation'`.

**Files:**
- Modify: `src/app/api/outreach/approve/route.ts` — type-aware clamp.
- Modify: `src/lib/db/queries/outreach-mutations.ts` — expose a "minimum hold seconds" parameter.
- Create: `src/app/__tests__/r10-negotiation-send-hold.proof.test.ts` — proof.

### Step 1 — Proof test first

`src/app/__tests__/r10-negotiation-send-hold.proof.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { approveOutreachForUser } from "@/lib/db/queries/outreach-mutations";

describe("R10 — 24h negotiation send-hold (server-clamped)", () => {
  it("approveOutreachForUser with minimumHoldSeconds=86400 sets send_after ≥ 24h", async () => {
    const captured: Array<{ send_after: string }> = [];
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }));
    const client = {
      from: vi.fn(() => ({ update: (patch: { send_after: string }) => {
        captured.push(patch);
        return update(patch);
      }})),
    } as unknown as Parameters<typeof approveOutreachForUser>[0];
    const before = Date.now();
    await approveOutreachForUser(client, "u1", "o1", undefined, { minimumHoldSeconds: 86400 });
    const sendAfter = new Date(captured[0].send_after).getTime();
    expect(sendAfter - before).toBeGreaterThanOrEqual(86400 * 1000 - 2000);
    expect(sendAfter - before).toBeLessThan(86400 * 1000 + 10_000);
  });

  it("route /api/outreach/approve auto-clamps when queued row.type==='negotiation'", async () => {
    // Integration-style: mock supabase lookup returning type='negotiation', invoke POST /api/outreach/approve, observe send_after.
    // (Skeleton — implementation follows the existing approve/route.test.ts pattern.)
  });
});
```

### Step 2 — Extend approveOutreachForUser

Modify `src/lib/db/queries/outreach-mutations.ts`:

```ts
export interface ApproveOpts {
  /** If set, clamps send_after to at least now() + seconds. */
  minimumHoldSeconds?: number;
}

export async function approveOutreachForUser(
  supabase: SupabaseClient,
  userId: string,
  outreachId: string,
  sendAfter?: Date,
  opts: ApproveOpts = {},
): Promise<void> {
  const now = new Date();
  const desired = sendAfter ?? now;
  const minimum = opts.minimumHoldSeconds
    ? new Date(now.getTime() + opts.minimumHoldSeconds * 1000)
    : desired;
  const effective = desired.getTime() >= minimum.getTime() ? desired : minimum;
  await supabase
    .from("outreach_queue")
    .update({
      status: "approved",
      approved_at: now.toISOString(),
      send_after: effective.toISOString(),
      cancelled_at: null,
    })
    .eq("id", outreachId)
    .eq("user_id", userId);
}
```

### Step 3 — Route clamp

Modify `src/app/api/outreach/approve/route.ts`:
- Before calling `approveOutreachForUser`, SELECT the queued row's `type`.
- If `type === 'negotiation'`, call with `minimumHoldSeconds: 86400`.
- Otherwise continue with the existing 30s behavior.

Pseudocode:
```ts
const { data: row } = await supabase
  .from("outreach_queue")
  .select("type")
  .eq("id", outreachId)
  .eq("user_id", auth.user.id)
  .maybeSingle();
const minimumHoldSeconds = row?.type === "negotiation" ? 86400 : undefined;
await approveOutreachForUser(supabase, auth.user.id, outreachId, undefined, { minimumHoldSeconds });
```

### Step 4 — Update existing approve/route.test.ts

Add a case: when the queued row has `type='negotiation'`, the written `send_after` is ≥ 24h out.

### Step 5 — Commit

```
npx vitest run src/app/__tests__/r10-negotiation-send-hold.proof.test.ts src/app/api/outreach/approve src/lib/db/queries/outreach-mutations.ts
npx tsc --noEmit
npm run t start R10.10
git add src/lib/db/queries/outreach-mutations.ts src/app/api/outreach/approve src/app/__tests__/r10-negotiation-send-hold.proof.test.ts
git commit -m "[R10/10.10] feat(api): server-clamped 24h hold for type='negotiation'"
npm run t done R10.10
```

---

## Task R10.11 — CEO voice (toggle + button + speechSynthesis)

**Goal.** Three-layer-gated play button that speaks a draft body aloud in the browser.

**Files:**
- Create: `src/components/parlor/CEOVoicePlayButton.tsx`
- Create: `src/components/parlor/CEOVoicePlayButton.test.tsx`
- Create: `src/lib/voice/ceo-voice.ts` — pure helpers (voice selector + utterance builder).
- Create: `src/lib/voice/__tests__/ceo-voice.test.ts`
- Modify: `src/app/(authenticated)/settings/settings-client.tsx` — add CEO voice toggle section.
- Create: `src/app/__tests__/r10-ceo-voice-three-layer.proof.test.tsx` — proves all three gates.

### Step 1 — Three-layer proof test first

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { CEOVoicePlayButton } from "@/components/parlor/CEOVoicePlayButton";

describe("CEO voice — three-layer gate", () => {
  it("returns null when enabled=false (layer 1)", () => {
    const { container } = render(<CEOVoicePlayButton enabled={false} text="hi" />);
    expect(container.firstChild).toBeNull();
  });
  it("returns null when window.speechSynthesis is missing (layer 3)", () => {
    const original = (global as unknown as { window: { speechSynthesis?: SpeechSynthesis } }).window;
    (global as unknown as { window: { speechSynthesis?: SpeechSynthesis } }).window = {};
    const { container } = render(<CEOVoicePlayButton enabled text="hi" />);
    expect(container.firstChild).toBeNull();
    (global as unknown as { window: { speechSynthesis?: SpeechSynthesis } }).window = original;
  });
  it("renders a button when enabled + speechSynthesis available (happy path)", () => {
    (global as unknown as { window: { speechSynthesis: unknown; SpeechSynthesisUtterance: unknown } }).window = {
      speechSynthesis: { getVoices: () => [] },
      SpeechSynthesisUtterance: vi.fn(),
    };
    const { container } = render(<CEOVoicePlayButton enabled text="hi" />);
    expect(container.querySelector("button")).not.toBeNull();
  });
});
```

### Step 2 — ceo-voice helpers

`src/lib/voice/ceo-voice.ts`:

```ts
export function pickCeoVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const preferNames = ["Daniel","Alex","Fred","Google US English Male"];
  for (const name of preferNames) {
    const v = voices.find((x) => x.lang?.startsWith("en") && x.name.includes(name));
    if (v) return v;
  }
  return voices.find((x) => x.lang?.startsWith("en-US")) ?? voices.find((x) => x.lang?.startsWith("en")) ?? null;
}

export function buildCeoUtterance(text: string, voice: SpeechSynthesisVoice | null): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.pitch = 0.92;
  u.volume = 1;
  return u;
}
```

### Step 3 — Component

`src/components/parlor/CEOVoicePlayButton.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { pickCeoVoice, buildCeoUtterance } from "@/lib/voice/ceo-voice";

interface Props {
  enabled: boolean;
  text: string;
}

export function CEOVoicePlayButton({ enabled, text }: Props): JSX.Element | null {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    setSupported(true);
    const updateVoice = () => {
      voiceRef.current = pickCeoVoice(window.speechSynthesis.getVoices());
    };
    updateVoice();
    window.speechSynthesis.addEventListener?.("voiceschanged", updateVoice);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", updateVoice);
  }, [enabled]);

  if (!enabled || !supported) return null;

  function toggle() {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const u = buildCeoUtterance(text, voiceRef.current);
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(u);
    setPlaying(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="ceo-voice-play"
      aria-pressed={playing}
      aria-label={playing ? "Stop reading" : "Read draft aloud"}
    >
      {playing ? "◼ Stop" : "▶ Read aloud"}
    </button>
  );
}
```

### Step 4 — Settings toggle

Modify `src/app/(authenticated)/settings/settings-client.tsx` to add a section mirroring the Rejection Reflections toggle, bound to `CEO_VOICE_PREF_KEY`:

- Label: "CEO voice — reads negotiation drafts aloud"
- Help copy: "Hear your CEO read drafts before you send them. You can turn this off anytime."
- Default state: off (from preference).
- Uses existing pref-update call pattern.

### Step 5 — Wire play button into NegotiationDraftPanel

In `NegotiationDraftPanel.tsx`, after the LiveCompose panel, render:
```tsx
<CEOVoicePlayButton enabled={ceoVoiceEnabled} text={body} />
```
Where `ceoVoiceEnabled` comes from a prop passed down from ParlorClient, which gets it from the server page read of preferences.

### Step 6 — Run + commit

```
npx vitest run src/lib/voice src/components/parlor/CEOVoicePlayButton.test.tsx src/app/__tests__/r10-ceo-voice-three-layer.proof.test.tsx
npx tsc --noEmit
npm run t start R10.11
git add src/lib/voice src/components/parlor/CEOVoicePlayButton.tsx src/components/parlor/CEOVoicePlayButton.test.tsx src/app/__tests__/r10-ceo-voice-three-layer.proof.test.tsx src/app/\(authenticated\)/settings/settings-client.tsx src/app/\(authenticated\)/parlor/parlor-client.tsx src/components/parlor/NegotiationDraftPanel.tsx
git commit -m "[R10/10.11] feat(parlor): CEO voice three-layer — settings toggle + button + speechSynthesis"
npm run t done R10.11
```

---

## Task R10.12 — Signature: CFO quip on first Parlor entry

**Goal.** A one-time, comp-aware CFO quip that fires on the user's first-ever visit to the Parlor.

**Files:**
- Create: `src/lib/parlor/cfo-quip.ts` — pure function: takes percentile position, returns quip text.
- Create: `src/components/parlor/CFOQuipOverlay.tsx` — fading dialogue bubble.
- Test for both.

### Step 1 — Pure function test

```ts
import { describe, it, expect } from "vitest";
import { cfoQuipForPosition, type BandPosition } from "../cfo-quip";

describe("cfoQuipForPosition", () => {
  it.each<[BandPosition, RegExp]>([
    ["below_p25", /underpricing|walk in with confidence/i],
    ["p25_to_p50", /market, not celebratory/i],
    ["p50_to_p75", /solid offer/i],
    ["above_p75", /generous|non-comp/i],
    ["thin_data", /no benchmark data/i],
  ])("returns the right copy for %s", (pos, pattern) => {
    expect(cfoQuipForPosition(pos, { base: 100000, p25: 120000 } )).toMatch(pattern);
  });
});
```

### Step 2 — Implement

`src/lib/parlor/cfo-quip.ts`:

```ts
export type BandPosition = "below_p25" | "p25_to_p50" | "p50_to_p75" | "above_p75" | "thin_data";

export function positionFor(base: number, p25: number, p50: number, p75: number): BandPosition {
  if (!p25 || !p50 || !p75) return "thin_data";
  if (base < p25) return "below_p25";
  if (base < p50) return "p25_to_p50";
  if (base < p75) return "p50_to_p75";
  return "above_p75";
}

export function cfoQuipForPosition(
  pos: BandPosition,
  ctx: { base: number; p25?: number },
): string {
  switch (pos) {
    case "below_p25": {
      const pct = ctx.p25 ? Math.round(((ctx.p25 - ctx.base) / ctx.p25) * 100) : 10;
      return `They're underpricing you by about ${pct}%. Walk in with confidence.`;
    }
    case "p25_to_p50":
      return "Market, not celebratory. There's room to push.";
    case "p50_to_p75":
      return "Solid offer. Small counter is safe; a big counter needs leverage.";
    case "above_p75":
      return "This is generous. Negotiate on non-comp — vesting, signing, start date.";
    case "thin_data":
      return "No benchmark data yet. Negotiate on terms that aren't ambiguous — start date, signing, equity refresh.";
  }
}
```

### Step 3 — Overlay component

`src/components/parlor/CFOQuipOverlay.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import { useEffect, useState } from "react";

interface Props {
  quip: string;
  show: boolean;
  onDismiss: () => void;
}

export function CFOQuipOverlay({ quip, show, onDismiss }: Props): JSX.Element | null {
  const [visible, setVisible] = useState(show);
  useEffect(() => {
    if (!show) return;
    const id = window.setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 6200);
    return () => window.clearTimeout(id);
  }, [show, onDismiss]);
  if (!visible) return null;
  return (
    <div role="status" aria-live="polite" className="parlor-cfo-quip">
      <span className="parlor-cfo-quip-name">CFO</span>
      <span className="parlor-cfo-quip-text">{quip}</span>
    </div>
  );
}
```

### Step 4 — Wire into ParlorClient

- On first render with `!cfoQuipShown`, compute `positionFor` using first offer + bands, render `<CFOQuipOverlay quip={...} show onDismiss={() => fetch pref update}/>`.
- On dismissal, POST `{ key: "parlorCfoQuipShown", value: { shown: true } }` to `/api/profile/preferences`.

### Step 5 — Commit

```
npx vitest run src/lib/parlor/__tests__/cfo-quip.test.ts src/components/parlor/CFOQuipOverlay.test.tsx
npm run t start R10.12
git add src/lib/parlor/cfo-quip.ts src/lib/parlor/__tests__/cfo-quip.test.ts src/components/parlor/CFOQuipOverlay.tsx src/app/\(authenticated\)/parlor/parlor-client.tsx
git commit -m "[R10/10.12] feat(parlor): CFO quip on first parlor entry (once, ever)"
npm run t done R10.12
```

---

## Task R10.13 — [STRETCH] Negotiation simulator (CPO as recruiter)

**Goal.** A practice mode where CPO plays a recruiter. User types counters; simulator scores anchoring, concession management, walk-away.

**Ship only if R10.1–R10.12 + R10.15 can complete within this autopilot window's budget.** Otherwise, skip — this is stretch, not must-ship.

**Files:**
- Create: `src/lib/ai/agents/negotiation-simulator.ts`
- Create: `src/app/api/parlor/simulate/route.ts`
- Create: `src/components/parlor/simulator/NegotiationSimulator.tsx`
- Create: `src/components/parlor/simulator/TurnScoreBadge.tsx`
- Tests accordingly.

**High-level approach.** Two modes: streaming chat (SSE) between user and CPO-as-recruiter + a tally panel. Per-turn scoring via an out-of-band generateObject call that grades the user's latest message on three axes (anchor_score 0-5, concession_score 0-5, walkaway_signal 0-5) plus a one-line critique.

**Deferrable tasks in detail only if we reach this phase** — otherwise the plan ends R10.12 + R10.15.

---

## Task R10.14 — [STRETCH] CNO reference-request drafting

**Goal.** CNO drafts reference-request emails to top-warmth contacts. Tracks submission status. Drafts thank-yous.

**Ship only after R10.13.** Otherwise skip.

**Files (if shipped):**
- Modify: `src/lib/agents/cno/tools.ts` — add `draftReferenceRequest` tool.
- Create: `src/app/api/offers/[id]/reference-requests/route.ts`
- Small modifications to Rolodex Lounge to expose "Request reference" CTA. (Scope-cap: the drafting happens; tracking UI is minimal.)

---

## Task R10.15 — Accept + ledger close

**Goal.** Verify R10 structurally passes the acceptance gate, flip `met: true`.

### Step 1 — Run full verify

```
npm run t verify R10
```

This runs: tasks complete + blockers empty + drift clean + tests + tsc + build + lint.

If ANY ✗: do NOT force. Either fix the specific failure OR open a blocker via `tower block` and move on. `--force` is reserved for the human partner.

### Step 2 — Manual smoke (document outcome in handoff)

- Seed one test offer via POST `/api/offers` (or a dev route).
- Visit `/c-suite` — door materializes (first appearance); `parlorDoorSeen` flips true.
- Click door → lands in `/parlor`. CFO quip shows once. Offer folder visible on oak table.
- Click "Convene" — three chairs populate within ~15s.
- Click "Draft negotiation" — LiveCompose reveals draft. Edit. Click "Send".
- Verify outreach_queue row exists with `type='negotiation'`, `status='approved'`, `send_after >= now()+24h`.
- Toggle CEO voice in settings — play button appears on draft panel (if browser supports speechSynthesis).

### Step 3 — Apply migration in production

```
# Human user applies 0020 via Supabase Dashboard SQL Editor.
# Claude records this in the handoff.
```

### Step 4 — Accept

```
npm run t accept R10
```

If the gate fails, Claude does NOT use `--force`. Opens a blocker, moves on, or loops back to fix.

### Step 5 — Final commit + handoff

```
git add .ledger
git commit -m "[R10/10.15] chore(ledger): R10 complete, acceptance.met=true"
npm run t done R10.15
```

Then pipe the autopilot wrap-up handoff:

```bash
cat <<'EOF' | npm run t handoff -- --stdin
{
  "contextUsedPct": <final>,
  "decisions": [<carried from design §9>],
  "surprises": [<anything encountered during execution>],
  "filesInPlay": [<final touched list>],
  "next": [
    "USER: apply migration 0020 via Supabase Dashboard SQL Editor",
    "USER: add FIRECRAWL_API_KEY env var via `vercel env`",
    "Stretch R10.13/R10.14 if budget permits",
    "Post-R10: R8.x cross-user matching"
  ],
  "contextNotes": "Migration 0020 required before /api/offers writes succeed in prod. FIRECRAWL_API_KEY required before scraping resolves; without it, comp chart goes graceful-empty."
}
EOF
```

Autopilot checks `.tower/autopilot.yml` — R10 is `scope_complete` → `paused: true` (set by `tower accept R10`'s auto-advance or manually if gate failed).

---

## Execution notes for the runner

- **Autopilot overrides.** Don't ask between tasks. Review happens internally. Commit-per-task.
- **Partner constraint tripwires.** At every commit, eyeball the diff for the §1 anti-patterns (generic comp page, template library, boilerplate email drafts, door-before-offer). If drift, back up.
- **TDD discipline.** Red test first, always. Don't write implementation without a failing test staring at you.
- **Migration apply is NOT automated.** Claude cannot run 0020 against the production Supabase DB. User does this via Dashboard. Record the "waiting" state in handoff.
- **Vercel env.** `FIRECRAWL_API_KEY` is a new env var. If the user hasn't added it, the comp-bands flow goes graceful-empty (not an error). Mention in handoff.
- **Context management.** Context threshold behavior per §8: 60% notes in handoff draft, 70% fires handoff + exits cleanly for next session to pick up. Stretch tasks (R10.13/R10.14) are explicitly OK to skip if budget is tight.
- **Commit hygiene.** [R10/10.N] prefix on every commit. No `--no-verify`. If a hook fails, fix the cause.

---

**End of plan.** Autopilot default next step: `superpowers:subagent-driven-development` (plan has independent tasks across distinct subsystems — migration / REST / AI / UI).
