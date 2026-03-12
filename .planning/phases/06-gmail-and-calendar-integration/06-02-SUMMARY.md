---
phase: 06-gmail-and-calendar-integration
plan: 02
subsystem: api
tags: [gmail, email-thread, send-email, server-actions, toast]

# Dependency graph
requires:
  - phase: 06-gmail-and-calendar-integration
    plan: 01
    provides: "getGoogleClient() factory, searchCompanyEmails(), ParsedEmail type, gmail-actions.ts server action file"
provides:
  - "getEmailBody() helper for extracting email body from Gmail messages"
  - "getFullEmailThread() for chronological company email thread with bodies"
  - "sendEmail() for sending emails via Gmail API"
  - "sendFollowUpEmail() server action for follow-up email sending"
  - "EmailThread component for expandable email thread view"
  - "DraftEmail Send via Gmail button with toast feedback"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [rfc-2822-email-construction, recursive-multipart-body-extraction, expand-collapse-thread-ui]

key-files:
  created:
    - "internship-command-center/src/components/detail/email-thread.tsx"
  modified:
    - "internship-command-center/src/lib/gmail.ts"
    - "internship-command-center/src/lib/gmail-actions.ts"
    - "internship-command-center/src/components/follow-ups/draft-email.tsx"
    - "internship-command-center/src/app/applications/[id]/page.tsx"

key-decisions:
  - "Email body extraction uses recursive multipart traversal preferring text/plain over text/html"
  - "Email thread sorted chronologically (oldest first) for conversation flow"
  - "Send button disabled with title tooltip when no contactEmail exists"
  - "Toast feedback on send with explicit toast ID to prevent flooding"

patterns-established:
  - "RFC 2822 email construction: raw headers + base64url encoding for Gmail send API"
  - "Recursive MIME part traversal: handle nested multipart messages gracefully"
  - "Expand/collapse thread UI: useState Set tracking expanded message IDs"

requirements-completed: [EMAIL-04, EMAIL-05, EMAIL-06]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 6 Plan 2: Email Thread View + Send via Gmail Summary

**Email thread view on detail pages with expandable messages and Send via Gmail button for follow-up emails with toast feedback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T02:34:27Z
- **Completed:** 2026-03-11T02:37:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended Gmail library with full email body extraction, thread retrieval, and email sending via Gmail API
- Built EmailThread component with per-message expand/collapse and unread indicators
- Added Send via Gmail button to DraftEmail with loading state and toast notifications
- Integrated email history card into application detail page with graceful error handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Add email body parsing and send function to Gmail library** - `20e9a25` (feat)
2. **Task 2: Build email thread component and add Send button to DraftEmail** - `dcfc143` (feat)

## Files Created/Modified
- `src/lib/gmail.ts` - Added getEmailBody(), getFullEmailThread(), sendEmail(), FullEmail type
- `src/lib/gmail-actions.ts` - Added sendFollowUpEmail() server action with path revalidation
- `src/components/detail/email-thread.tsx` - New EmailThread component with expand/collapse per message
- `src/components/follow-ups/draft-email.tsx` - Added Send via Gmail button with toast feedback
- `src/app/applications/[id]/page.tsx` - Added Email History card and contactEmail prop to DraftEmail

## Decisions Made
- Email body extraction uses recursive multipart traversal, preferring text/plain over text/html fallback
- Email thread sorted chronologically (oldest first) to read like a conversation
- Send button disabled with title tooltip when no contactEmail exists (no modal/prompt needed)
- Toast IDs prevent duplicate notifications on rapid clicks

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - Gmail OAuth scopes were already configured in Phase 4. No additional setup needed.

## Next Phase Readiness
- Email thread view and send functionality complete
- Gmail integration fully operational for read + write operations
- Phase 6 Plan 3 (calendar) is independent and can proceed in parallel

## Self-Check: PASSED

All created/modified files verified on disk. Both task commits (20e9a25, dcfc143) verified in git log.

---
*Phase: 06-gmail-and-calendar-integration*
*Completed: 2026-03-11*
