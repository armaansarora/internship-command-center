---
phase: 07-smarter-ai-and-networking
plan: 02
subsystem: ai, database, ui
tags: [anthropic-sdk, claude-api, drizzle, sqlite, cover-letter, interview-prep, tabs, dialog, tdd]

# Dependency graph
requires:
  - phase: 04-cloud-migration-and-auth
    provides: Turso DB with @libsql/client, auth session
  - phase: 05-ui-ux-overhaul
    provides: shadcn component library, Card/Badge patterns
  - phase: 06-gmail-and-calendar-integration
    provides: Detail page layout with email thread, Promise.all fetch pattern
provides:
  - coverLetters DB table with auto-save on every generation
  - interviewPrep DB table with cascading delete
  - Cover letter version history grouped by company with active version pinning
  - Side-by-side cover letter comparison in Dialog
  - Interview prep generation via Claude API with Tavily research
  - Interview prep section on application detail page
affects: [07-03-company-comparison, phase-08-deploy]

# Tech tracking
tech-stack:
  added: [shadcn tabs]
  patterns: [auto-save on generation, TDD with beforeEach cleanup, batch transactions for active toggling]

key-files:
  created:
    - internship-command-center/src/lib/cover-letter-versions.ts
    - internship-command-center/src/lib/interview-prep.ts
    - internship-command-center/src/lib/interview-prep-actions.ts
    - internship-command-center/src/components/cover-letters/version-history.tsx
    - internship-command-center/src/components/cover-letters/version-compare.tsx
    - internship-command-center/src/components/detail/interview-prep.tsx
    - internship-command-center/src/__tests__/cover-letter-versions.test.ts
    - internship-command-center/src/__tests__/interview-prep.test.ts
    - internship-command-center/src/__mocks__/next-cache.ts
    - internship-command-center/src/components/ui/tabs.tsx
  modified:
    - internship-command-center/src/db/schema.ts
    - internship-command-center/src/lib/cover-letter-actions.ts
    - internship-command-center/src/app/cover-letters/page.tsx
    - internship-command-center/src/app/applications/[id]/page.tsx
    - internship-command-center/vitest.config.ts

key-decisions:
  - "db.batch() for setActiveCoverLetter transaction -- deactivate all for company then activate target"
  - "Each interview prep generation creates a new row (never overwrites) per Pitfall 5"
  - "Cover letter auto-save returns the saved ID for potential downstream use"
  - "next/cache mock added to vitest for revalidatePath in server action tests"
  - "Interview prep fetch parallelized with email thread using Promise.all on detail page"

patterns-established:
  - "Auto-save pattern: transparent DB persistence behind existing generation flow"
  - "Batch transaction: db.batch([update, update]) for atomic multi-row operations"
  - "Markdown section parser: regex-based heading/list extraction for structured AI output"
  - "next/cache mock: revalidatePath no-op for server action unit tests"

requirements-completed: [AI-01, AI-02, AI-03]

# Metrics
duration: 6min
completed: 2026-03-11
---

# Phase 7 Plan 2: Cover Letter Versioning and Interview Prep Summary

**Cover letter auto-save with version history/comparison UI, plus AI interview prep generation with structured sections (company overview, questions, talking points, news) persisted to DB**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-11T03:28:20Z
- **Completed:** 2026-03-11T03:34:40Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Every cover letter generation auto-saves to coverLetters table with isActive=false
- Version history UI with expandable company groups, "Set Active" button (batch transaction), and side-by-side comparison Dialog
- Interview prep generation via Claude API with Tavily research, producing structured sections (Company Overview, Likely Questions, Talking Points, Recent News)
- Interview prep persisted to DB, loaded without re-generation on revisit, new row on each re-generate
- Cover letters page uses Tabs: Generator tab + Version History tab with version count
- Interview Prep card added to application detail page (left column, between Notes and Email History)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for cover letter versions and interview prep** - `28f9be3` (test)
2. **Task 1 (GREEN): Cover letter versioning and interview prep data layer** - `89031b0` (feat)
3. **Task 2: Cover letter version history UI, comparison view, and interview prep section** - `22745f5` (feat)

## Files Created/Modified
- `src/db/schema.ts` - Added coverLetters and interviewPrep tables with indexes
- `src/lib/cover-letter-actions.ts` - Extended with auto-save, added setActiveCoverLetterAction
- `src/lib/cover-letter-versions.ts` - Version queries: getAllGrouped, byCompany, byApp, setActive, getActive
- `src/lib/interview-prep.ts` - generateInterviewPrep (Claude + Tavily + fallback), getInterviewPrep
- `src/lib/interview-prep-actions.ts` - Server actions: generate and regenerate (new row each time)
- `src/components/cover-letters/version-history.tsx` - Expandable company groups, compare selection, active badges
- `src/components/cover-letters/version-compare.tsx` - Two-column Dialog comparison (no diff highlighting)
- `src/components/detail/interview-prep.tsx` - Generate/re-generate with expand/collapse, section parser
- `src/app/cover-letters/page.tsx` - Added Tabs (Generator / Version History)
- `src/app/applications/[id]/page.tsx` - Added Interview Prep card, parallelized fetch with Promise.all
- `src/__tests__/cover-letter-versions.test.ts` - 4 tests: table, insert/retrieve, setActive transaction, grouping
- `src/__tests__/interview-prep.test.ts` - 4 tests: table, null return, insert/retrieve, latest ordering
- `src/__mocks__/next-cache.ts` - Mock for revalidatePath/revalidateTag
- `src/components/ui/tabs.tsx` - shadcn Tabs component
- `vitest.config.ts` - Added next/cache alias and TURSO_DATABASE_URL env

## Decisions Made
- Used db.batch() for setActiveCoverLetter -- ensures atomic deactivation of all company versions before activating target
- Each interview prep generation creates a new row (never overwrites) following Pitfall 5 from RESEARCH.md
- Added GenerationState.coverletterId to return saved ID from auto-save for potential downstream use
- Interview prep fetch runs in parallel with email thread fetch using Promise.all for faster detail page loads
- Fallback interview prep content generated locally when no ANTHROPIC_API_KEY (matching cover letter fallback pattern)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added next/cache mock for vitest**
- **Found during:** Task 1 (TDD setup)
- **Issue:** cover-letter-versions.ts imports revalidatePath from next/cache, which has no mock in vitest
- **Fix:** Created src/__mocks__/next-cache.ts with no-op revalidatePath/revalidateTag, added alias to vitest.config.ts
- **Files modified:** src/__mocks__/next-cache.ts, vitest.config.ts
- **Verification:** All tests pass with the mock
- **Committed in:** 28f9be3 (Task 1 RED commit)

**2. [Rule 1 - Bug] Fixed test data isolation with beforeEach cleanup**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Tests failed due to leftover test data from previous runs (tests sharing same DB)
- **Fix:** Added beforeEach hooks to clean up test data with __TEST_ prefix before each test case
- **Files modified:** src/__tests__/cover-letter-versions.test.ts, src/__tests__/interview-prep.test.ts
- **Verification:** Tests pass consistently on repeated runs
- **Committed in:** 89031b0 (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for test reliability. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. Cover letter auto-save and interview prep work with existing ANTHROPIC_API_KEY and TAVILY_API_KEY environment variables.

## Next Phase Readiness
- Cover letter versioning and interview prep are complete, ready for Plan 07-03 (company comparison + detail integration)
- Plan 07-03 depends on both 07-01 (contacts) and 07-02 (cover letters/interview prep) -- both now complete
- All 42 tests pass, build succeeds

## Self-Check: PASSED

- All 11 key files verified present
- All 3 task commits verified in git log (28f9be3, 89031b0, 22745f5)

---
*Phase: 07-smarter-ai-and-networking*
*Completed: 2026-03-11*
