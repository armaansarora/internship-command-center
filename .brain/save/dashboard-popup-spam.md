# 💾 SAVE — dashboard-popup-spam

## GOAL
Dashboard opens calm — no popup parade. Spam sources fixed; genuine arrivals still
surface. (Harness christening task #1 — metrics in the-military review ledger.)

## STATE
- ✅ done: BOTH spam sources fixed, gates green, cross-family review round 2 = **CLEAN**
  - Tube backlog flood → sweep paginates until drained (≤200/sweep), newest 3 get full
    arrivals, rest fold into ONE digest card (`useTubeDeliveries.ts`)
  - "Since you were gone" → opens once per tab-session per day via sessionStorage
    (`penthouse-client.tsx`), starts closed on server render (hydration-safe)
  - Overlay body renders digest newlines (`whiteSpace: pre-line`)
- 🔨 in-flight: nothing — **diff sits UNCOMMITTED on `main`, ready for Armaan's commit**
- 💥 broken/blocked: —

## DECISIONS
- Backlog = digest, never parade; every row still atomically claimed (delivered_at) so
  nothing re-fires — because "surface once" is the contract, 20 modals is not. (06-12)
- Morning-report gate is per-TAB-session per day (sessionStorage, key
  `tower-morning-report-shown` = dateIso) — per-browser would need localStorage; chose
  the house EntranceSequence idiom. (06-12)
- NotificationSystem's dormant response-shape bug (`data.notifications` vs API `{data}`)
  left UNTOUCHED — out of scope; see TRAPS. (06-12)

## TRAPS
- ⚠️ **NotificationSystem.tsx:69 is a dormant spammer**: it reads `data.notifications`
  (always undefined) so it currently shows NOTHING. If anyone "fixes" that line, it
  will double-pop the same rows the tube already delivers (`is_read` vs `delivered_at`
  are separate dedupe keys). Unify before enabling.
- Digest ordering ("newest 3") is enforced by `.order("created_at", desc)` in prod but
  NOT covered by the mock (insertion-order artifact) — pin with an integration test if
  it ever matters.
- Zero-win full page bails early (sibling tab owns the backlog) — eventual surfacing
  guarantee, not same-sweep. Commented in the hook.

## NEXT
1. Armaan: eyeball the dashboard once (rendered truth — both color schemes per gotcha),
   then commit. Suggested message: "fix(dashboard): popup spam — tube backlog digests,
   morning report session-gated"
2. Optional later: manual reopen affordance for the morning report (none exists today);
   unify NotificationSystem with tube delivery semantics or delete it.

## HANDOFF
- branch `main` · dirty: 5 files (3 src + 2 tests) + .brain/
- prove-it: `npx vitest run src/hooks/useTubeDeliveries.test.ts "src/app/(authenticated)/penthouse/penthouse-client.test.tsx"` (14 pass) ·
  `npx tsc --noEmit` · `npx eslint <touched>` · full suite 4313 passed (2026-06-12)
- key files: `src/hooks/useTubeDeliveries.ts` · `src/app/(authenticated)/penthouse/penthouse-client.tsx:56-75` · `src/components/world/PneumaticTubeArrivalOverlay.tsx:288`

## FLAGS
GOAL ✅ · STATE ✅ · DECISIONS ✅ · TRAPS ✅ · NEXT ✅
<!-- last updated: 2026-06-12T01:16 by Claude (Fable) — review CLEAN, awaiting commit -->
