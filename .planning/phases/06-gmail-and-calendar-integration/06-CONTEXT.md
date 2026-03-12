# Phase 6: Gmail & Calendar Integration - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate Gmail and Google Calendar APIs so Armaan can see email responses from companies directly in the app, send follow-up emails without copy-paste, and manage interview calendar events — all without leaving the command center. Dashboard gets widgets for unread emails and upcoming events.

</domain>

<decisions>
## Implementation Decisions

### Google API Client
- Create `src/lib/google.ts` with `getGoogleClient()` factory returning `{ gmail, calendar }`
- Uses `session.accessToken` from Auth.js v5 JWT callback (already working from Phase 4)
- Package: `googleapis` (not yet installed, needs `npm install googleapis`)

### Email Matching Strategy
- Match emails to applications by searching Gmail for company name/domain
- Query pattern: `from:@{companyDomain} OR subject:{companyName}`
- Domain extraction: heuristic from company name (e.g., "Goldman Sachs" -> "goldmansachs.com")
- No email storage in DB — fetch live from Gmail API on each view (avoids sync complexity, keeps data in Gmail)

### Email Reading
- Dashboard widget: search for recent unread emails matching ANY tracked company name
- Application detail page: show full email thread history for that specific company
- Graceful fallback: dashboard still works if Gmail API fails or user hasn't authorized

### Email Sending
- Connect existing `DraftEmail` component (AI-generated follow-up emails) to real Gmail send
- RFC 2822 message format, base64url encoded
- Sent emails appear in user's Gmail Sent folder
- Toast confirmation on success/error

### Calendar Events
- One-way create only: app creates events in Google Calendar, no two-way sync
- Interview events: "Interview: {company} — {role}" with 30-min popup + 1-hour email reminder
- Follow-up reminders: all-day events on due date
- Dashboard widget: upcoming events for next 7 days
- "Add to Calendar" buttons on interview-status applications and follow-up cards

### Architecture
- Server actions for all Gmail/Calendar mutations (not API routes)
- All Gmail/Calendar calls wrapped in try/catch for graceful degradation
- No new database tables needed

### Claude's Discretion
- Email thread UI layout and expand/collapse behavior
- Calendar widget styling and event display format
- Date/time picker component choice for interview scheduling
- Loading skeleton designs for email/calendar sections

</decisions>

<specifics>
## Specific Ideas

- Email widget on dashboard should show company name, subject, and relative date ("2 hours ago")
- Calendar widget should show event summary, date/time, and link to Google Calendar
- "Add Interview to Calendar" form should default to America/New_York timezone and 1-hour duration
- Follow-up card calendar button should be a small icon, not a full button

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/auth.ts`: Already has Gmail + Calendar OAuth scopes configured, token refresh working
- `src/components/follow-ups/draft-email.tsx`: AI email draft component — add "Send via Gmail" button
- `src/lib/dashboard.ts`: Dashboard queries with Promise.all() pattern — add email/calendar data
- `src/app/page.tsx`: Dashboard layout with widget cards — add email/calendar widgets
- `src/app/applications/[id]/page.tsx`: Detail page — add email thread section

### Established Patterns
- Server actions in `src/lib/actions.ts` use revalidatePath for cache invalidation
- Toast notifications via sonner on all mutations
- Card-based dashboard layout with shadcn Card components
- Suspense boundaries for async data loading

### Integration Points
- Dashboard page: new widgets in right column alongside "Recent Activity"
- Application detail page: new "Email History" card section
- Follow-up cards: calendar reminder icon button
- DraftEmail component: "Send via Gmail" button

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-gmail-and-calendar-integration*
*Context gathered: 2026-03-11*
