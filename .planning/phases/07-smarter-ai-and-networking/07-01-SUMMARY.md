---
phase: 07-smarter-ai-and-networking
plan: 01
subsystem: database, ui, networking
tags: [drizzle, contacts, warmth, exponential-decay, tanstack-table, react-hook-form, sheet]

# Dependency graph
requires:
  - phase: 04-cloud-migration-and-auth
    provides: Turso DB, auth, server actions pattern
  - phase: 05-ui-ux-overhaul
    provides: AppTable pattern, sidebar/bottom-tab-bar navigation, EmptyState component
provides:
  - contacts DB table with self-referential introduced_by FK
  - contacts CRUD server actions (create, update, delete, updateLastContacted)
  - computeWarmth function with exponential decay (tau=13)
  - getContacts, getContactsByCompany, getContactById queries
  - ContactWithWarmth type
  - WarmthBadge component (Hot/Warm/Cold)
  - /contacts page with sortable table, search, pagination
  - Add Contact form with Sheet slide-out and validation
  - Navigation links in sidebar and bottom tab bar
affects: [07-02, 07-03, phase-08]

# Tech tracking
tech-stack:
  added: []
  patterns: [compute-on-read warmth with exponential decay, self-referential FK via foreignKey() operator, Sheet-based forms]

key-files:
  created:
    - internship-command-center/src/lib/contacts.ts
    - internship-command-center/src/lib/contact-actions.ts
    - internship-command-center/src/components/contacts/warmth-badge.tsx
    - internship-command-center/src/components/contacts/contacts-columns.tsx
    - internship-command-center/src/components/contacts/contacts-table.tsx
    - internship-command-center/src/components/contacts/contact-form.tsx
    - internship-command-center/src/app/contacts/page.tsx
    - internship-command-center/src/app/contacts/loading.tsx
    - internship-command-center/src/__tests__/contacts-schema.test.ts
    - internship-command-center/src/__tests__/warmth.test.ts
  modified:
    - internship-command-center/src/db/schema.ts
    - internship-command-center/src/components/layout/sidebar.tsx
    - internship-command-center/src/components/layout/bottom-tab-bar.tsx
    - internship-command-center/vitest.config.ts

key-decisions:
  - "Contacts table uses foreignKey() operator for self-referential introduced_by FK (not inline .references())"
  - "Warmth is compute-on-read with exponential decay (tau=13): hot<=7d, warm<=30d, cold>30d"
  - "Added TURSO_DATABASE_URL to vitest.config env for test DB access"
  - "Contact form uses Sheet slide-out pattern with react-hook-form + zod validation"

patterns-established:
  - "Compute-on-read warmth: never store warmth, calculate from lastContactedAt at query time"
  - "Sheet-based add/edit forms for data entry (ContactForm pattern)"
  - "ContactWithWarmth type pattern: extend DB row with computed warmth info"

requirements-completed: [NET-01, NET-03, NET-04, NET-05, NET-06]

# Metrics
duration: 6min
completed: 2026-03-10
---

# Phase 7 Plan 1: Contacts & Networking Foundation Summary

**Contacts table with self-referential FK, warmth compute-on-read (exponential decay tau=13), sortable contacts page with Sheet-based add form, and navigation integration**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-11T03:28:28Z
- **Completed:** 2026-03-11T03:35:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Contacts DB table with all fields including self-referential introduced_by FK and indexes on company/lastContactedAt
- computeWarmth function with exponential decay (tau=13) correctly returns Hot/Warm/Cold levels
- Full CRUD server actions for contacts (create, update, delete, updateLastContacted)
- /contacts page with sortable/filterable table, search, pagination, warmth badges, and empty state
- Add Contact form in Sheet slide-out with react-hook-form + zod validation and toast feedback
- Navigation updated in both sidebar (Contacts after Applications) and bottom tab bar

## Task Commits

Each task was committed atomically:

1. **Task 1: Contacts schema, data layer, server actions, and navigation** - `788285e` (test: failing tests), `3f7332b` (feat: implementation)
2. **Task 2: Contacts page with table, form, and empty state** - `57750d2` (feat)

## Files Created/Modified
- `src/db/schema.ts` - Added contacts table with self-referential FK, indexes, Contact/NewContact types
- `src/lib/contacts.ts` - computeWarmth, getContacts, getContactsByCompany, getContactById
- `src/lib/contact-actions.ts` - Server actions: createContact, updateContact, deleteContact, updateLastContacted
- `src/components/contacts/warmth-badge.tsx` - Color-coded badge (Hot=emerald, Warm=amber, Cold=zinc)
- `src/components/contacts/contacts-columns.tsx` - Column definitions with sortable headers and WarmthBadge
- `src/components/contacts/contacts-table.tsx` - TanStack Table with search, sort, pagination
- `src/components/contacts/contact-form.tsx` - Sheet slide-out form with react-hook-form + zod
- `src/app/contacts/page.tsx` - Server component fetching contacts, rendering table or empty state
- `src/app/contacts/loading.tsx` - Skeleton matching page layout
- `src/__tests__/contacts-schema.test.ts` - Schema validation and export tests
- `src/__tests__/warmth.test.ts` - Warmth computation tests (7 cases covering all levels)
- `src/components/layout/sidebar.tsx` - Added Contacts nav item with Users icon
- `src/components/layout/bottom-tab-bar.tsx` - Added Contacts nav item with Users icon
- `vitest.config.ts` - Added TURSO_DATABASE_URL env for test DB access

## Decisions Made
- Used foreignKey() operator for self-referential FK (as per RESEARCH.md, avoids TypeScript circular reference errors)
- Warmth formula: exponential decay e^(-t/13) with thresholds at 7 days (hot) and 30 days (cold)
- Added TURSO_DATABASE_URL to vitest.config.ts env block so all tests can access the DB without manual env setup
- Contact form uses Sheet component (already installed) for slide-out panel
- Row click in contacts table does NOT navigate (no detail page for contacts)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added TURSO_DATABASE_URL to vitest.config env**
- **Found during:** Task 1
- **Issue:** Tests importing contacts.ts triggered DB client creation which failed without TURSO_DATABASE_URL env var
- **Fix:** Added `env: { TURSO_DATABASE_URL: 'file:./data/internship.db' }` to vitest.config.ts test config
- **Files modified:** vitest.config.ts
- **Verification:** All 42 tests pass without manual env var prefix
- **Committed in:** 3f7332b

**2. [Rule 3 - Blocking] Linter auto-added coverLetters and interviewPrep tables to schema**
- **Found during:** Task 1
- **Issue:** An external tool/linter repeatedly added coverLetters and interviewPrep table definitions to schema.ts during edits
- **Fix:** Left in place since definitions are correct (from RESEARCH.md) and will be needed by plan 07-02
- **Files modified:** src/db/schema.ts
- **Verification:** Build succeeds, all tests pass
- **Committed in:** 3f7332b

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for task completion. No scope creep beyond what was already in the research.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Contacts foundation complete, ready for plan 07-03 (company comparison + detail page integration)
- "Who do I know at [Company]?" queries work via getContactsByCompany()
- ContactWithWarmth type available for use in detail page contact cards
- WarmthBadge component reusable across pages

## Self-Check: PASSED

All 12 files verified present. All 3 commits (788285e, 3f7332b, 57750d2) verified in git log. 42/42 tests passing. Build succeeds.

---
*Phase: 07-smarter-ai-and-networking*
*Completed: 2026-03-10*
