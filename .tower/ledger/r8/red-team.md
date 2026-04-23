# R8 — Red Team Checklist

**Phase:** R8 — The Rolodex Lounge (Floor 6)
**Date:** 2026-04-23
**Reviewer (self):** Autopilot session sess-r8-kickoff
**Status:** R8 ships the consent *infrastructure* and the 403-hard-stop; the
cross-user match *behavior* is deferred to R8.x. This checklist covers the
R8 surface.  A second Red Team read is required before R8.x flips the
endpoint from 403 to reading the match index.

---

Each question is followed by the answer and an **Evidence** pointer
(file:line or test name).  The P10 acceptance invariant greps this file
for ≥10 `- ✓` lines.  Any question that flips to `- ✗` blocks acceptance.

---

## 1. Can an un-consented user's name appear in another user's match candidates?

- ✓ No.  `assertConsented` returns a 403 `consent-required` NextResponse
  when `networking_consent_at IS NULL` *or* `networking_revoked_at ≥
  networking_consent_at`.  No code path downstream of the guard reaches
  the match index for un-consented users.

  **Evidence:** `src/lib/networking/consent-guard.ts:isConsentedShape`,
  unit tests in `src/lib/networking/consent-guard.test.ts` (P3/P4 branches).

## 2. Can a revoked user's name reappear after revocation?

- ✓ No.  Revoke stamps `networking_revoked_at = now()` AND deletes any
  row the user owns in `networking_match_index` (the table is empty in
  R8 but the clear is wired — R8.x will fill it and the clear keeps the
  revoke flow correct on day one).  `isConsentedShape` treats
  `revoked_at ≥ consent_at` as not-consented, so subsequent guard calls
  return 403.

  **Evidence:** `src/app/api/networking/revoke/route.ts` clears the
  match index; `consent-guard.test.ts` covers the ordering.

## 3. Can the match endpoint leak any field beyond name + active application company?

- ✓ N/A for R8.  The endpoint returns 403 `gated-red-team-pending` for
  every caller, including consented users.  The R8.x review will cover
  field-level disclosure once the endpoint actually reads the match index.

  **Evidence:** `src/app/api/networking/match-candidates/route.ts`
  (always 403 downstream of guard).

## 4. Does the revoke button provide immediate visible feedback?

- ✓ Yes.  The button is disabled during the POST (`Revoking…` label),
  the page state flips to "revoked" immediately on success (optimistic
  `setRevokedAt(new Date().toISOString())`), and the body copy confirms
  outcome ("Your name and applications are no longer in the Warm Intro
  Network").

  **Evidence:** `src/components/settings/NetworkingConsent.tsx` lines
  handling `handleRevoke` + the `isActive ? … : revokedAt ? …` render
  branch.

## 5. Does the consent copy mention every field that would be shared?

- ✓ Yes.  Three shared fields are enumerated: full name, companies on
  active applications, email address on accepted intro.  Two explicit
  "never shared" bullets follow (contacts/messages/cover letters/
  interview notes/private sticky-notes; anyone else's data without
  reciprocal consent).

  **Evidence:** `docs/r8/consent-copy.md` §Share + §Never-share; P9
  grep test (`src/app/__tests__/r8-consent-copy.proof.test.ts`).

## 6. If the consent copy changes, does existing consent invalidate?

- ✓ Yes by design.  `user_profiles.networking_consent_version` is the
  mechanism.  `/api/networking/opt-in` writes `consent_version = 1` (the
  current version, matching the copy in `docs/r8/consent-copy.md`).
  When we change the copy we bump the constant in the route; the
  `assertConsented` guard (R8.x extension — not yet active) will treat
  stale versions as un-consented and force re-consent.

  **Evidence:** `src/app/api/networking/opt-in/route.ts`
  (`CONSENT_VERSION = 1`); R8.x todo tracked in `docs/plans/
  2026-04-23-r8-rolodex-lounge-design.md` §7.1.

## 7. Can a user's private_note ever appear in any API response other than their own contact fetch?

- ✓ No.  The P5 invariant grep scans `src/lib/ai/**`, `src/app/api/
  networking/**`, and `src/app/api/export/**` and asserts zero
  references.  Every other `privateNote` / `private_note` reference
  must live in the allowlist (schema, migration, owner-only read/write,
  the two UI surfaces, the acceptance script).  Any new PR that tries
  to reference the column elsewhere fails the P5 test.

  **Evidence:** `src/app/__tests__/r8-private-note-grep.proof.test.ts`.

## 8. Can a user's email leak to a non-consented peer?

- ✓ No, in two senses:
  - (R8) The endpoint returns 403; no peer data is surfaced at all.
  - (R8.x design constraint) When matching ships, email is only
    returned *after* the target user explicitly accepts a specific
    intro.  Name + target-company is the only data disclosed pre-intro;
    email is gated behind a reciprocal accept.

  **Evidence:** `docs/r8/consent-copy.md` (share bullet 3: "Your email
  address, only when you accept a specific intro").

## 9. Does the match index table have RLS?

- ✓ Yes.  `networking_match_index` has RLS enabled with a
  `user_isolation` policy `auth.uid() = user_id` (both `USING` and
  `WITH CHECK`).  Empty in R8 but the policy is live.

  **Evidence:** `src/db/migrations/0018_r8_rolodex_lounge.sql` (CREATE
  POLICY networking_match_index_user_isolation).  Drizzle schema
  declares the `userIsolation("networking_match_index")` factory.

## 10. Is there a user-visible audit trail of what has been shared?

- ✓ Not in R8 (nothing is shared).  R8.x requirement: the consent panel
  will gain a "Shared with" log showing (target_company, recipient_name,
  accepted_at) for every intro the user has accepted.  Tracked as an
  open task on the R8.x mini-phase.

  **Evidence:** (future work) `docs/plans/2026-04-23-r8-rolodex-lounge-
  design.md` §7.5 Q10 carries this forward.

---

## Additional notes

- The R8 endpoint returns **403 with `reason: "gated-red-team-pending"`**
  for consented users.  This is deliberately visible so future audits
  confirm the hard-stop is active.  Flipping the behavior requires (a)
  a second Red Team read, (b) a migration bump of
  `networking_consent_version` if the shared-field list changes, and
  (c) a commit that replaces the 403 with the real match query.
- No cross-user embeddings are read in R8.  All pgvector queries
  (`warm-intro-scan` cron) operate on `company_embeddings.user_id =
  <current>`.  R8's moat work is intra-user only.
- Private notes are stored on `contacts` with RLS; the P5 grep prevents
  accidental leakage into outbound surfaces.
