---
phase: 06-gmail-and-calendar-integration
status: complete
---

# Phase 6 Research: Gmail & Calendar Integration

## What Already Exists

### Auth Infrastructure (Phase 4)
- `src/auth.ts` — Auth.js v5 with Google OAuth, JWT strategy, token refresh
- OAuth scopes already include: `gmail.readonly`, `gmail.send`, `calendar.events`, `calendar.readonly`
- `session.accessToken` exposed server-side via JWT callback
- Token auto-refresh in JWT callback (transparent to user)

### Research Already Done
- `.planning/research/auth-gmail-calendar.md` — Comprehensive guide covering:
  - Gmail API: messages.list, messages.get, messages.send, reply threading
  - Calendar API: events.list, events.insert, events.patch, events.delete
  - Google API client factory pattern (`getGoogleClient()` → `{ gmail, calendar }`)
  - Rate limits (generous, not a concern for single-user)
  - Base64url encoding for email send
  - RFC 2822 message format

### Existing Components That Will Be Extended
- `src/app/page.tsx` — Dashboard (add email + calendar widgets)
- `src/app/applications/[id]/page.tsx` — Detail page (add email thread section)
- `src/components/follow-ups/draft-email.tsx` — AI email drafts (connect to Gmail send)
- `src/lib/dashboard.ts` — Dashboard queries (add email/calendar data fetching)

### Package Needed
- `googleapis` — Official Google API client (not yet installed)

## Architecture Decisions

### 1. Google API Client Location
Create `src/lib/google.ts` with `getGoogleClient()` factory that returns `{ gmail, calendar }` using the session access token. All Gmail/Calendar actions call this first.

### 2. Email Matching Strategy
Match emails to applications by searching Gmail for company name/domain:
- Query: `from:@{companyDomain} OR subject:{companyName}`
- Domain extraction: heuristic from company name (e.g., "Goldman Sachs" → "goldmansachs.com")
- Store matched emails in memory (no DB table) — fetch on demand per application detail view
- Dashboard widget: search for recent unread emails matching ANY tracked company

### 3. No Email Storage in DB
Emails are fetched live from Gmail API on each view. Reasons:
- Avoids sync complexity and stale data
- Gmail API is fast enough for single-user (<100ms per query)
- No schema changes needed
- Privacy: email content stays in Gmail, not duplicated

### 4. Calendar Events: One-Way Create
App creates events in Google Calendar (interviews, follow-up reminders). No two-way sync or webhook listeners. User's real Google Calendar is the source of truth.

### 5. Send Follow-Up via Gmail
The existing `DraftEmail` component generates AI email text. Phase 6 adds a "Send via Gmail" button that actually sends it through Gmail API. Email appears in user's Sent folder.

## Plan Structure

### Plan 1: Google API Foundation + Email Reading (EMAIL-01, EMAIL-02, EMAIL-03)
- Install `googleapis`
- Create `src/lib/google.ts` (getGoogleClient factory)
- Create `src/lib/gmail.ts` (listEmails, getMessage, parseMessage, matchEmailsToApp)
- Dashboard widget: unread application-related emails
- Requirements: EMAIL-01, EMAIL-02, EMAIL-03

### Plan 2: Email Thread View + Send (EMAIL-04, EMAIL-05, EMAIL-06)
- Email thread section on application detail page
- Send follow-up email via Gmail API (connect DraftEmail to real send)
- Activity feed logging for sent emails
- Requirements: EMAIL-04, EMAIL-05, EMAIL-06

### Plan 3: Calendar Integration (CAL-01, CAL-02, CAL-03, CAL-04)
- Create `src/lib/calendar.ts` (listEvents, createEvent)
- "Add to Calendar" button on interview items and follow-ups
- Auto-create calendar events when status changes to "interview"
- Dashboard widget: upcoming events (next 7 days)
- Requirements: CAL-01, CAL-02, CAL-03, CAL-04
