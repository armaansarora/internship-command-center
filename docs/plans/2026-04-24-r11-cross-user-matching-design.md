# R11 — Cross-user warm-intro matching (design)

_Date: 2026-04-24_
_Phase: R11 (promoted from R8.x after R8 acceptance)_
_Mode: autopilot (self-approved within partner pre-locked constraints)_

## Intent

Replace the R8-era 403 `gated-red-team-pending` hard-stop on `/api/networking/match-candidates` with real cross-user matching — behind the full Red Team checklist. Matching surfaces target companies where a warm-intro path exists via another consented user's Rolodex, **without ever leaking raw contact data across users**. Counterparties are anonymized via a salted hash; users see "someone at Acme could intro you" not "Bob's contact Sarah."

## Anchors (pre-existing, reuse)

1. `src/lib/networking/consent-guard.ts` — `assertConsented(userId)` returns `null | NextResponse(403)`. **Extend**, don't rebuild.
2. `src/app/api/cron/briefing/route.ts` — canonical cron shape: `verifyCronRequest` bearer auth, paginated users (`PAGE_SIZE=500`), bounded concurrency (`WORKERS=6`), per-user try/catch, structured logging. **Copy the shape**.
3. `src/app/api/cron/warm-intro-scan/route.ts` — `getSupabaseAdmin()` for service-role reads across user rows in cron. **Copy the isolation pattern** (writes stay per-user).
4. `networkingMatchIndex` table (migration 0018) — stores `(user_id, target_company_name)` for every consented user's active application. **Keep as populator INPUT**, not match output.
5. `networkingConsentVersion` column (default 0, bumped to 1 by opt-in). **Extend** — add `CURRENT_CONSENT_VERSION` constant, gate on mismatch.
6. `src/components/settings/NetworkingConsent.tsx` — existing opt-in surface. **Add sibling `NetworkingAudit.tsx`** for "How your data is used."
7. `docs/r8/consent-copy.md` — consent copy source-of-truth. **Addendum** for R11 matching surface; bump version.

## Non-negotiables (partner pre-locked)

- No cross-user data leaks. Raw `contacts` rows never cross user boundaries. Counterparty = anon key only.
- Rate limit 20/hour/user, server-side, typed 429 with `retry_after_seconds`.
- Fail-closed — every gate returns 403/429, never 500 fall-through to results.
- `CURRENT_CONSENT_VERSION` bump → all v1 users become `consent-version-stale` until re-consent.
- Heuristic scoring only. Deterministic, seedable, cache-friendly.

## Architecture

### Data flow

```
User adds application to "Acme"
  → (R8 behavior, unchanged) on consent + active apps → networking_match_index row
                                                        (user_id, target_company_name="Acme")

Cron /api/cron/match-index (daily) OR delta trigger (contact/app change)
  → for each consented user U at current consent_version:
      candidates ← computeMatchCandidates(U)
      DELETE FROM match_candidate_index WHERE user_id = U
      INSERT top-N rows (user_id, counterparty_anon_key, edge_strength, company_context, inserted_at, invalidates_at)

User calls GET /api/networking/match-candidates
  → consent gate → version gate → rate-limit check (20/hour)
  → SELECT top-N FROM match_candidate_index WHERE user_id=U AND invalidates_at > now()
  → INSERT rows into match_events (audit log, one per candidate returned)
  → 200 {candidates: [...], rate_limit_remaining}
```

### Scoring

```
score = warmth_factor × company_overlap × recency_factor

warmth_factor:  1.0 (warm,    last_contact_at < 7d)
                0.5 (cooling, last_contact_at < 14d)
                0.2 (cold,    older or null)

company_overlap:  1.0 if counterparty.company_name matches one of querying user's
                      networking_match_index.target_company_name rows
                  0   otherwise (not a candidate)

recency_factor:  1.0  matching application in user's networking_match_index < 7d old
                 0.7  < 30d
                 0.4  older
```

Deterministic: same `(user_id, contacts, applications, counterparty pool)` → same ranked output. Pure-function in `src/lib/networking/match-algorithm.ts`.

### Counterparty anonymization

```ts
export function counterpartyAnonKey(contactId: string): string {
  const secret = process.env.MATCH_ANON_SECRET!;
  return hmac_sha256(secret, `${contactId}`);
}
```

Deterministic + non-reversible without `MATCH_ANON_SECRET`. Same contact → same anon key across multiple users' match results. No contact row data is ever exposed — just the anon key plus the company name (which is already non-private: the company is public info already on the counterparty user's `networking_match_index` row).

## Schema additions (migration 0022, additive)

```sql
-- R11.1 consent-version bump is column-existent already (from 0018). No schema change.
-- CURRENT_CONSENT_VERSION constant in src/lib/networking/consent-version.ts bumps from 1 → 2.

-- R11.2 match_candidate_index: ranked candidates per user, with TTL.
CREATE TABLE IF NOT EXISTS match_candidate_index (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  counterparty_anon_key   TEXT NOT NULL,
  company_context         TEXT NOT NULL,   -- "Acme" — the target company
  edge_strength           NUMERIC(4,3) NOT NULL,
  inserted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidates_at          TIMESTAMPTZ NOT NULL
);
ALTER TABLE match_candidate_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY match_candidate_index_user_isolation ON match_candidate_index
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_match_candidate_user_invalidates ON match_candidate_index(user_id, invalidates_at);

-- R11.9 match_events: audit log of what matches fired to whom.
CREATE TABLE IF NOT EXISTS match_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  counterparty_anon_key   TEXT NOT NULL,
  company_context         TEXT NOT NULL,
  edge_strength           NUMERIC(4,3) NOT NULL,
  fired_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  match_reason            TEXT NOT NULL    -- human-readable: "warm contact at Acme Corp"
);
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY match_events_user_isolation ON match_events
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_match_events_user_fired ON match_events(user_id, fired_at DESC);

-- R11.7 match_rate_limits: bucketed counter for 20/hour per user.
CREATE TABLE IF NOT EXISTS match_rate_limits (
  user_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  hour_bucket  TIMESTAMPTZ NOT NULL,  -- date_trunc('hour', now())
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, hour_bucket)
);
ALTER TABLE match_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY match_rate_limits_user_isolation ON match_rate_limits
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_match_rate_limits_bucket ON match_rate_limits(hour_bucket);

-- R11.4 delta re-scan: tracking last refresh per user for 5-min debounce.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS match_index_last_rescan_at TIMESTAMPTZ DEFAULT NULL;
```

All tables mirror established Tower RLS/userIsolation patterns. `ON DELETE CASCADE` to `user_profiles` for right-to-be-forgotten.

## Consent-version gate

`src/lib/networking/consent-version.ts`:

```ts
export const CURRENT_CONSENT_VERSION = 2;
```

R8 opt-in stamped v1. R11 changes the consent copy (adds matching, rate limit, audit log language), bumps to v2. All existing users → `consent-version-stale` until re-consent. Opt-in route re-stamps to v2.

`assertConsented(userId)` becomes:

```ts
// returns NextResponse (403 consent-required | 403 consent-version-stale) or null
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

`ConsentShape` gains `networking_consent_version: number | null`. All existing callers (`/api/networking/match-candidates`, tests) get the version check for free.

## Cron: `/api/cron/match-index`

Mirrors `briefing`: `verifyCronRequest`, paginated users, `WORKERS=6`, per-user try/catch, structured log. Per user:

1. If `networking_consent_version < CURRENT_CONSENT_VERSION`, skip.
2. Fetch user's `networking_match_index` rows (target companies).
3. If none, DELETE user's `match_candidate_index` rows and skip.
4. Fetch counterparty pool: other consented users' `contacts` rows where `company_name IN (user's target companies)`. Uses `getSupabaseAdmin()` — service-role — iterating anonymized results only. The ADMIN read is the ONLY cross-user read; it's done in the cron worker, not in the user-facing route.
5. Score each counterparty contact via `computeMatchCandidates`.
6. Anonymize via `counterpartyAnonKey(contact_id)`.
7. `DELETE FROM match_candidate_index WHERE user_id = U`.
8. `INSERT` top-N rows with `invalidates_at = now() + 24h`.

Budget cap: max 500 contacts scanned per user per run (sort counterparty contacts by warmth desc, truncate).

## Delta re-scan (R11.4)

Not an event bus. Direct function call guarded by timestamp:

```ts
// src/lib/networking/match-delta.ts
export async function enqueueMatchRescan(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const {data} = await supabase.from("user_profiles")
    .select("match_index_last_rescan_at").eq("id", userId).maybeSingle();
  const last = data?.match_index_last_rescan_at;
  if (last && Date.now() - new Date(last).getTime() < 5 * 60_000) return; // 5-min debounce
  await rebuildMatchIndexForUser(userId);  // shared helper, same as cron per-user body
  await supabase.from("user_profiles")
    .update({match_index_last_rescan_at: new Date().toISOString()}).eq("id", userId);
}
```

Called from:
- Contacts REST insert/update: `src/lib/db/queries/contacts-rest.ts` after successful `.insert()` / `.update()`.
- Applications REST insert/status-change: `src/lib/db/queries/applications-rest.ts` after successful `.insert()` / `.update()`.

Fire-and-forget: wrapped in `try/catch`, never blocks the calling request. Log failures.

## Rate limit (R11.7)

Atomic upsert on `match_rate_limits`:

```ts
// src/lib/networking/rate-limit.ts
export async function checkAndBumpRateLimit(
  userId: string,
): Promise<{ok: true; remaining: number} | {ok: false; retryAfterSeconds: number}> {
  const bucket = new Date(); bucket.setMinutes(0, 0, 0);  // truncate to hour
  const supabase = await createClient();
  const {data, error} = await supabase.rpc("bump_match_rate_limit", {
    p_user_id: userId, p_bucket: bucket.toISOString(), p_limit: 20,
  });
  // RPC does the upsert + count check atomically and returns {allowed, count}.
  if (error) {
    // Fail-closed: any error → treat as rate-limited so no unauth requests slip through.
    return {ok: false, retryAfterSeconds: 3600};
  }
  if (!data.allowed) {
    const secondsLeft = 3600 - Math.floor((Date.now() - bucket.getTime()) / 1000);
    return {ok: false, retryAfterSeconds: secondsLeft};
  }
  return {ok: true, remaining: 20 - data.count};
}
```

`bump_match_rate_limit` RPC (in migration 0022):
```sql
CREATE OR REPLACE FUNCTION bump_match_rate_limit(p_user_id UUID, p_bucket TIMESTAMPTZ, p_limit INT)
RETURNS TABLE(allowed BOOLEAN, count INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cur INT;
BEGIN
  INSERT INTO match_rate_limits (user_id, hour_bucket, count)
    VALUES (p_user_id, p_bucket, 1)
    ON CONFLICT (user_id, hour_bucket) DO UPDATE SET count = match_rate_limits.count + 1
    RETURNING match_rate_limits.count INTO cur;
  RETURN QUERY SELECT (cur <= p_limit), cur;
END$$;
```

## Unblock route: `/api/networking/match-candidates`

```ts
export async function GET() {
  const sb = await createClient();
  const {data: {user}, error: userErr} = await sb.auth.getUser();
  if (userErr || !user) return res401("unauthenticated");

  const guard = await assertConsented(user.id);  // consent + version
  if (guard) return guard;

  const rl = await checkAndBumpRateLimit(user.id);
  if (!rl.ok) return NextResponse.json(
    {ok: false, reason: "rate-limited", retry_after_seconds: rl.retryAfterSeconds},
    {status: 429},
  );

  const {data: rows} = await sb.from("match_candidate_index")
    .select("counterparty_anon_key, company_context, edge_strength")
    .eq("user_id", user.id).gt("invalidates_at", new Date().toISOString())
    .order("edge_strength", {ascending: false}).limit(10);

  // Audit log — one event per surfaced candidate.
  if (rows?.length) {
    await sb.from("match_events").insert(rows.map((r) => ({
      user_id: user.id,
      counterparty_anon_key: r.counterparty_anon_key,
      company_context: r.company_context,
      edge_strength: r.edge_strength,
      match_reason: `warm contact at ${r.company_context}`,
    })));
  }

  return NextResponse.json({
    ok: true,
    candidates: rows ?? [],
    rate_limit_remaining: rl.remaining,
  });
}
```

## Audit log UI (R11.9)

New component `src/components/settings/NetworkingAudit.tsx` — rendered in Settings → Networking section below `NetworkingConsent`:

```tsx
<section aria-labelledby="section-networking-audit">
  <h3 id="section-networking-audit">How your data is used</h3>
  <p>Your last 20 match events. Each entry is a time when Tower surfaced a
     connection to you. No contact data is shared across users.</p>
  <ul>
    {events.map(e => (
      <li key={e.id}>
        You were matched with a contact at {e.company_context} on {fmtDate(e.fired_at)}.
        <span className="sr-only">Edge strength {e.edge_strength}.</span>
      </li>
    ))}
  </ul>
</section>
```

Data comes from a server-component fetch in `settings/page.tsx`: `SELECT * FROM match_events WHERE user_id=auth.uid() ORDER BY fired_at DESC LIMIT 20`. Empty state: "No matches yet — once another Tower user targets a company where you have a warm contact, events will appear here."

## Consent copy update (bump to v2)

Append to `docs/r8/consent-copy.md` and `NetworkingConsent.tsx` COPY object:

```
Match queries are rate-limited to 20 per hour to prevent scraping. Every
match surfaced to you is logged in Settings → Networking → "How your data
is used". You can revoke at any time; revocation clears your match index
within 60 seconds.
```

P9 grep invariant in `r8-consent-copy.proof.test.ts` gains a new canary sentence (the rate-limit/audit-log one) and the version check now demands v2.

## Test surface (R11.10)

Each invariant binds to a proof test:

| Invariant | Test file | Binding |
|-----------|-----------|---------|
| Cross-user RLS isolation | `src/app/__tests__/r11-cross-user-rls.proof.test.ts` | Two synthetic user IDs. User B's SELECT on `match_candidate_index` MUST NOT return user A's rows. Uses direct Supabase `select()` with `auth.uid()=B`, asserts `.length === 0`. |
| Consent gate fail-closed | `src/lib/networking/__tests__/consent-guard.test.ts` | Mock `readConsent` → null → assertConsented returns 403 consent-required, not 500. |
| Version gate | `src/lib/networking/__tests__/consent-guard.test.ts` | Mock row with `networking_consent_version=1` when CURRENT=2 → returns 403 consent-version-stale. |
| Rate limit 429 | `src/app/api/networking/match-candidates/__tests__/route.test.ts` | 20 consecutive calls allowed, 21st returns 429 with `retry_after_seconds` in body. |
| Audit log insert | `src/app/api/networking/match-candidates/__tests__/route.test.ts` | After successful GET with candidates, `match_events` has N rows for (user, current minute). |
| Delta re-scan debounce | `src/lib/networking/__tests__/match-delta.test.ts` | Call `enqueueMatchRescan(u)` twice within 5min → `rebuildMatchIndexForUser` called once. |
| Cron idempotency | `src/app/api/cron/match-index/__tests__/route.test.ts` | Run cron twice with same data → second run produces same top-N (DELETE + INSERT pattern makes this trivially true). |
| Algorithm determinism | `src/lib/networking/__tests__/match-algorithm.test.ts` | Fixture: 3 contacts, 2 target apps → expected ranked output. Run twice → identical result. |
| No raw contact leak | `src/app/__tests__/r11-no-contact-leak.proof.test.ts` | Grep proof: `match_candidate_index` writes/reads never reference `contacts.name`, `contacts.email`, `contacts.private_note`, `contacts.phone`. Only `counterparty_anon_key` and `company_context`. |

## Out of scope (explicit non-goals)

1. Cross-user messaging — users just see candidates exist; no intro messaging yet.
2. Reverse-matching — when user B would see user A as a counterparty. Needs separate consent opt-in.
3. ML scoring — heuristic only, seed-testable.
4. UI changes beyond Settings → Networking audit.
5. Modifying the existing `networking_match_index` table (populator input stays as-is).

## Files to add / change (anticipated)

**New:**
- `src/db/migrations/0022_r11_cross_user_matching.sql`
- `src/lib/networking/consent-version.ts`
- `src/lib/networking/match-algorithm.ts`
- `src/lib/networking/match-anon.ts`
- `src/lib/networking/match-delta.ts`
- `src/lib/networking/rate-limit.ts`
- `src/lib/networking/rebuild-match-index.ts` (shared by cron + delta)
- `src/app/api/cron/match-index/route.ts`
- `src/components/settings/NetworkingAudit.tsx`
- 9 proof/test files (R11.10 inventory above)

**Changed:**
- `src/db/schema.ts` — add `matchCandidateIndex`, `matchEvents`, `matchRateLimits` tables + `matchIndexLastRescanAt` col.
- `src/lib/networking/consent-guard.ts` — version gate.
- `src/app/api/networking/opt-in/route.ts` — stamp to CURRENT_CONSENT_VERSION (not hardcoded 1).
- `src/app/api/networking/match-candidates/route.ts` — replace 403 hardstop with real read + rate-limit + audit log.
- `src/components/settings/NetworkingConsent.tsx` — copy update.
- `docs/r8/consent-copy.md` — addendum.
- `src/app/__tests__/r8-consent-copy.proof.test.ts` — canary + version bump.
- `src/lib/db/queries/contacts-rest.ts` — fire `enqueueMatchRescan` after mutations.
- `src/lib/db/queries/applications-rest.ts` — fire `enqueueMatchRescan` after mutations.
- `src/app/(authenticated)/settings/page.tsx` — server-fetch `match_events`, pass to NetworkingAudit.
- `src/app/(authenticated)/settings/settings-client.tsx` — render NetworkingAudit in Networking section.

**Env:**
- `MATCH_ANON_SECRET` — 32+ byte random secret, required in all envs. Fail-closed: cron + route throw if missing.

## Acceptance verification (R11.12 close)

Follows CLAUDE.md §8: `npm run t accept R11` — tasks/blockers/drift/tests/tsc/build/lint all green. No hand-edit of ledger YAML.
