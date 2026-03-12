---
phase: 07-smarter-ai-and-networking
plan: 03
subsystem: ui, ai, networking
tags: [tanstack-table, row-selection, checkbox, company-comparison, anthropic-sdk, contact-cards, warmth-badges, email-templates]

# Dependency graph
requires:
  - phase: 07-smarter-ai-and-networking
    provides: Contacts table, warmth computation, getContactsByCompany, WarmthBadge, cover letter versioning, interview prep
  - phase: 05-ui-ux-overhaul
    provides: AppTable pattern with TanStack Table, shadcn dialog component, Select component
  - phase: 06-gmail-and-calendar-integration
    provides: DraftEmail component, generateFollowUpEmail server action, email thread on detail page
provides:
  - Checkbox row selection in application tracker table
  - Company comparison modal with structured table (culture, size, deals, compensation, fit)
  - generateCompanyComparison server action using Claude API + Tavily research
  - CompanyContacts component showing "Who Do I Know?" contact cards with warmth badges
  - Enhanced follow-up email templates with 5 types (follow-up, thank-you, cold-outreach, referral-nudge, post-interview)
  - Template type selector on DraftEmail with auto-select based on status
affects: [phase-08-deploy]

# Tech tracking
tech-stack:
  added: [shadcn checkbox]
  patterns: [row selection for batch operations, company comparison via Claude structured output, template-driven email generation]

key-files:
  created:
    - internship-command-center/src/components/applications/company-compare.tsx
    - internship-command-center/src/lib/company-comparison.ts
    - internship-command-center/src/components/detail/company-contacts.tsx
    - internship-command-center/src/components/ui/checkbox.tsx
  modified:
    - internship-command-center/src/components/applications/columns.tsx
    - internship-command-center/src/components/applications/app-table.tsx
    - internship-command-center/src/app/applications/[id]/page.tsx
    - internship-command-center/src/components/follow-ups/draft-email.tsx
    - internship-command-center/src/lib/follow-up-email-actions.ts

key-decisions:
  - "Company comparison uses Claude structured JSON output with JSON.parse fallback extraction"
  - "Contact cards use warmth-colored left borders (emerald/amber/zinc) for visual hierarchy"
  - "Template type auto-selects thank-you when application status is interview"
  - "Comparison data is tab-separated for clean paste into spreadsheets"
  - "Contacts fetched in parallel with email thread and interview prep via Promise.all"

patterns-established:
  - "Row selection pattern: checkbox column + selection state + batch action button"
  - "Template-driven email: templateType parameter controls Claude prompt tone guidance"
  - "Structured AI comparison: Claude generates JSON array, parsed with regex fallback"

requirements-completed: [AI-04, AI-05, NET-02]

# Metrics
duration: 5min
completed: 2026-03-11
---

# Phase 7 Plan 3: Company Comparison, Contact Cards, and Follow-Up Templates Summary

**Checkbox-based company comparison via Claude API structured output, "Who Do I Know?" contact cards with warmth badges on detail pages, and 5-type context-aware follow-up email templates**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T03:38:24Z
- **Completed:** 2026-03-11T03:43:16Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Tracker table has checkbox column for selecting rows, with Compare button appearing when 2-3 rows selected
- Company comparison modal shows structured table (culture, size, deals, compensation, fit) from Claude API + Tavily research with copy-to-clipboard
- Application detail page "Who Do I Know?" section shows contacts at that company with warmth badges, relationship types, and referral links
- DraftEmail template selector offers 5 template types, auto-selects "Thank You" for interview status applications
- All 42 tests pass, build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Checkbox selection in tracker table and company comparison modal** - `650065f` (feat)
2. **Task 2: Contact cards on detail page and enhanced follow-up templates** - `faae99f` (feat)

## Files Created/Modified
- `src/components/ui/checkbox.tsx` - shadcn checkbox component (installed via CLI)
- `src/components/applications/columns.tsx` - Added select checkbox column at beginning of columns array
- `src/components/applications/app-table.tsx` - Added rowSelection state, Compare button, CompanyCompare dialog, updated click guard for checkboxes
- `src/components/applications/company-compare.tsx` - Dialog with structured comparison table, loading state, copy-to-clipboard
- `src/lib/company-comparison.ts` - Server action generating structured company comparison via Claude API + Tavily research
- `src/components/detail/company-contacts.tsx` - Contact cards with warmth-colored left borders, badges, email/phone links
- `src/app/applications/[id]/page.tsx` - Added "Who Do I Know?" card, fetches contacts in parallel with Promise.all
- `src/components/follow-ups/draft-email.tsx` - Added template type selector with 5 options, auto-selects thank-you for interview status
- `src/lib/follow-up-email-actions.ts` - Added templateType parameter with context map for tone guidance

## Decisions Made
- Company comparison uses Claude structured JSON output with regex extraction fallback for robustness
- Contact cards use compact border-l-2 layout with warmth-colored borders (emerald=hot, amber=warm, zinc=cold)
- Template type auto-selects "Thank You" when application status is 'interview' via useEffect
- Comparison clipboard format is tab-separated (pastes cleanly into spreadsheets/docs)
- Contacts fetched in parallel with email thread and interview prep via Promise.all for fast detail page load

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Company comparison and template-based emails work with existing ANTHROPIC_API_KEY and TAVILY_API_KEY environment variables.

## Next Phase Readiness
- Phase 7 complete (all 3 plans executed)
- All AI features operational: interview prep, cover letter versioning, company comparison, context-aware follow-up templates
- All networking features operational: contacts table, warmth tracking, "Who Do I Know?" cards, referral chains
- Ready for Phase 8 (Deploy)

## Self-Check: PASSED

All 9 key files verified present. Both task commits (650065f, faae99f) verified in git log. 42/42 tests passing. Build succeeds.

---
*Phase: 07-smarter-ai-and-networking*
*Completed: 2026-03-11*
