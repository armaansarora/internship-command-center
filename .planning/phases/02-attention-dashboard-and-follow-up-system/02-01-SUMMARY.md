---
phase: 02-attention-dashboard-and-follow-up-system
plan: 01
status: complete
started: 2026-03-06
completed: 2026-03-06
commit: 46e386f
tasks_completed: 7
tasks_total: 7
files_created:
  - internship-command-center/src/components/dashboard/action-items.tsx
  - internship-command-center/src/components/dashboard/status-counters.tsx
  - internship-command-center/src/components/dashboard/activity-feed.tsx
  - internship-command-center/src/components/follow-ups/suggested-follow-ups.tsx
  - internship-command-center/src/components/follow-ups/create-follow-up.tsx
  - internship-command-center/src/components/follow-ups/follow-up-card.tsx
  - internship-command-center/src/lib/dashboard.ts
  - internship-command-center/src/lib/follow-ups.ts
  - internship-command-center/src/lib/follow-up-actions.ts
files_modified:
  - internship-command-center/src/app/page.tsx
  - internship-command-center/src/app/follow-ups/page.tsx
  - internship-command-center/src/app/applications/[id]/page.tsx
  - internship-command-center/src/lib/tier-utils.ts
key-decisions:
  - Combined original 02-01 and 02-02 plans into single plan since dashboard and follow-ups share data layer
  - Extracted suggestFollowUpDays to tier-utils.ts to avoid client/server boundary issues
  - No charts or graphs -- ranked lists and simple counter cards per DASH-06
  - Activity feed shows last 10 status changes, action items capped at 8 visible
---

# Phase 2 Plan 1: Attention Dashboard and Follow-Up System Summary

## One-Liner

Built attention dashboard with ranked action items (interviews > stale leads > overdue > T1 no-response) and follow-up queue with auto-suggested timelines, snooze (+3d/+7d), dismiss, and custom date scheduling.

## What Was Built

### Dashboard (Landing Page)

- **Dashboard page** (`src/app/page.tsx`): Converted from a redirect to `/applications` into the primary landing page. Shows "Overview" heading with count of items needing attention, status counters, ranked action items, and activity feed in a responsive grid layout. QuickAddForm button in the header.
- **StatusCounters** (`src/components/dashboard/status-counters.tsx`): 7-column responsive grid of counter cards showing total, applied, in_progress, interview, under_review, offer, and rejected counts. Color-coded per status (emerald for active, amber for under review, fuchsia for interview, red for rejected).
- **ActionItems** (`src/components/dashboard/action-items.tsx`): Ranked list of up to 8 urgent items. Each card shows a priority icon (Target/Clock/MessageSquare/AlertTriangle), company name with tier badge, reason text, and priority label. Every item links to its application detail page.
- **ActivityFeed** (`src/components/dashboard/activity-feed.tsx`): Compact list of last 10 updated applications with relative timestamps (e.g., "3d ago", "just now") and status badges. Links to detail pages.

### Dashboard Data Layer

- **Dashboard queries** (`src/lib/dashboard.ts`): Three server-side functions:
  - `getActionItems()`: Scans all applications for interviews (priority 1), stale warm leads with 7+ days since update (priority 2), T1 no-response after 14+ days (priority 4), then queries followUps table for overdue follow-ups (priority 3). Deduplicates and sorts by priority then tier.
  - `getStatusCounts()`: Aggregates total and per-status counts from applications table.
  - `getRecentActivity()`: Last 10 applications by `updatedAt` descending.

### Follow-Up Queue

- **Follow-ups page** (`src/app/follow-ups/page.tsx`): Dedicated queue page with three sections: overdue (red header), upcoming, and suggested follow-ups. Shows pending count and overdue count in subtitle. Empty state message when no follow-ups exist.
- **FollowUpCard** (`src/components/follow-ups/follow-up-card.tsx`): Rich card per follow-up showing company with tier/status badges, role, optional note (italic), contact email, due date with relative timing ("3d overdue" / "Due today" / "In 5d"), and action bar: Done, +3d snooze, +7d snooze, Dismiss. Red border for overdue items.
- **SuggestedFollowUps** (`src/components/follow-ups/suggested-follow-ups.tsx`): Client component showing up to 5 auto-suggested follow-ups for active applications that lack a pending follow-up. Dashed border styling distinguishes suggestions from scheduled follow-ups. Accept creates the follow-up at the suggested date; dismiss hides it (client-side only).
- **CreateFollowUp** (`src/components/follow-ups/create-follow-up.tsx`): Dialog form with date input (defaulting to tier/status-based suggestion) and optional note textarea. Used from application detail pages. Shows suggestion rationale ("Suggested: 7 days based on tier and status").

### Follow-Up Data and Actions

- **Follow-up queries** (`src/lib/follow-ups.ts`): `getPendingFollowUps()` (not completed, not dismissed, joined with app data), `getOverdueFollowUps()` (pending where dueAt < now), `getSuggestedFollowUps()` (active apps without follow-ups where suggested date is within 3 days or overdue).
- **Follow-up Server Actions** (`src/lib/follow-up-actions.ts`): Five actions with Zod validation: `createFollowUp`, `dismissFollowUp`, `completeFollowUp`, `snoozeFollowUp` (1-30 day range), `updateFollowUpDate`. All revalidate `/` and `/follow-ups`.
- **Timeline suggestions** (`src/lib/tier-utils.ts`): Added `suggestFollowUpDays(tier, status)` as a pure function -- interview: 1 day, in_progress: 5 days, T1: 7 days, T2: 10 days, default: 14 days. Placed in tier-utils.ts alongside existing `suggestTier` and `inferSector` to keep client-safe.

### Detail Page Integration

- **Application detail page** (`src/app/applications/[id]/page.tsx`): Added a "Follow-Up" card containing the CreateFollowUp dialog component, so users can schedule follow-ups directly from any application.

## Key Decisions

1. **Combined two plans into one**: Original roadmap estimated 02-01 (dashboard) and 02-02 (follow-ups) as separate plans. Delivered as a single plan because the dashboard action items directly query the follow-ups table, and the ranking logic needs both data layers. Splitting would have created artificial boundaries.
2. **suggestFollowUpDays in tier-utils.ts**: The CreateFollowUp client component needs timeline suggestions, but `follow-ups.ts` imports from `@/db` (Node.js-only). Extracted the pure suggestion function to `tier-utils.ts` which has no server dependencies.
3. **No charts or graphs**: Per DASH-06 requirements, used simple numeric counter cards and ranked text lists. No pie charts, bar graphs, or analytics terminology.
4. **Activity feed shows last 10 changes**: Used `updatedAt` ordering rather than a separate activity log table. Sufficient for v1 since status changes and note additions both touch `updatedAt`.
5. **Action items capped at 8**: Dashboard shows top 8 items to keep it scannable. Full list is accessible via the follow-ups page.

## Deviations from Plan

- **Original roadmap estimated 2 plans; delivered as 1**: Dashboard and follow-up queue share the same data layer (action items query the followUps table). The original two-plan split would have forced either duplicating query logic or creating an artificial boundary. Single plan was cleaner.
- **Added tier-utils.ts extraction**: Not in the original plan. Required to solve the Next.js client/server boundary -- client components cannot import modules that transitively import Node.js built-ins (`better-sqlite3` via `@/db`).
- **Added activity-feed.tsx and follow-up-card.tsx**: Not listed in the original roadmap details but necessary to deliver DASH-04 (activity feed) and FLLW-03/FLLW-06 (follow-up queue with snooze/dismiss).
- **Added updateFollowUpDate Server Action**: Not in original scope, but needed for FLLW-07 (custom follow-up dates) -- the snooze action only offsets from today, while this allows setting an arbitrary date.

## Test Results

17 tests passing after Phase 2 (up from Phase 1 baseline). No regressions.

## Files Modified

| File | Change |
|------|--------|
| `src/app/page.tsx` | Converted from redirect to full dashboard page |
| `src/app/follow-ups/page.tsx` | Built follow-up queue with overdue/upcoming/suggested sections |
| `src/app/applications/[id]/page.tsx` | Added Follow-Up card with CreateFollowUp dialog |
| `src/components/dashboard/action-items.tsx` | New: ranked action item list with priority icons |
| `src/components/dashboard/status-counters.tsx` | New: status counter grid cards |
| `src/components/dashboard/activity-feed.tsx` | New: recent activity list with relative timestamps |
| `src/components/follow-ups/follow-up-card.tsx` | New: follow-up card with done/snooze/dismiss actions |
| `src/components/follow-ups/suggested-follow-ups.tsx` | New: auto-suggested follow-ups with accept/dismiss |
| `src/components/follow-ups/create-follow-up.tsx` | New: dialog form with date picker and note |
| `src/lib/dashboard.ts` | New: getActionItems, getStatusCounts, getRecentActivity |
| `src/lib/follow-ups.ts` | New: getPendingFollowUps, getOverdueFollowUps, getSuggestedFollowUps |
| `src/lib/follow-up-actions.ts` | New: 5 Server Actions (create, dismiss, complete, snooze, updateDate) |
| `src/lib/tier-utils.ts` | Added suggestFollowUpDays pure function |

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| DASH-01 | Complete | `page.tsx` is now the dashboard, not a redirect |
| DASH-02 | Complete | `getActionItems()` ranks: interview(1) > stale lead(2) > overdue follow-up(3) > T1 no-response(4) |
| DASH-03 | Complete | `StatusCounters` shows total + 6 status counts as simple cards |
| DASH-04 | Complete | `ActivityFeed` shows last 10 changes with relative timestamps |
| DASH-05 | Complete | `QuickAddForm` button in dashboard header |
| DASH-06 | Complete | No charts, graphs, or analytics jargon -- just numbers and ranked lists |
| FLLW-01 | Complete | `suggestFollowUpDays()`: interview=1d, in_progress=5d, T1=7d, T2=10d, default=14d |
| FLLW-02 | Complete | Overdue follow-ups appear as priority-3 action items on dashboard |
| FLLW-03 | Complete | Dedicated `/follow-ups` page with overdue and upcoming sections |
| FLLW-06 | Complete | Dismiss and snooze (+3d, +7d) actions on FollowUpCard |
| FLLW-07 | Complete | CreateFollowUp dialog with date picker; updateFollowUpDate Server Action |
