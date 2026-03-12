---
status: testing
phase: 01-data-foundation-and-application-tracker
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md
started: 2026-03-06T18:00:00Z
updated: 2026-03-06T18:00:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running server. Start the application from scratch with `npm run dev`.
  Server boots without errors, database initializes with seed data,
  and loading http://localhost:3001 shows the application.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Start the app fresh. Server boots without errors, database/seed completes, and http://localhost:3001 loads successfully.
result: [pending]

### 2. Application Tracker Table
expected: Navigate to /applications. See all 71+ seeded applications in a table with columns for company name, role, tier, status, date, and platform. Each row has color-coded tier badges (T1/T2/T3) and status indicators.
result: [pending]

### 3. Sort by Column
expected: Click column headers on the tracker table (e.g., company name, date, tier, status) and rows reorder correctly. Clicking the same header toggles ascending/descending.
result: [pending]

### 4. Filter by Tier and Status
expected: Use filter controls to filter applications by tier (T1, T2, T3) and/or status (applied, in_progress, interview, etc.). Table updates to show only matching rows. Filters can be combined.
result: [pending]

### 5. Search by Company Name
expected: Type a company name (e.g., "JPMorgan" or "Goldman") in the search box. Table filters to show only matching applications in real-time.
result: [pending]

### 6. Application Detail View
expected: Click any application row to navigate to its detail page (/applications/[id]). See full application data: company, role, tier, status, platform, sector, date applied, notes, and contact info in a two-column layout.
result: [pending]

### 7. Update Application Status
expected: On a detail page, use the status dropdown to change an application's status (e.g., from "applied" to "in_progress"). The change saves immediately and persists on page refresh.
result: [pending]

### 8. Edit Notes
expected: On a detail page, type or edit text in the notes textarea and click Save. The updated notes persist on page refresh.
result: [pending]

### 9. Quick Add Application
expected: Click the "Add Application" button (available from tracker or dashboard). A dialog opens with fields for company, role, tier, status, sector, platform, and contact info. Tier auto-suggests based on company name. Submit creates the application and it appears in the tracker.
result: [pending]

### 10. Dark Mode UI and Navigation
expected: The entire interface uses a dark color scheme with clean typography and generous whitespace. Sidebar navigation works to switch between Dashboard, Applications, Follow-Ups, and Cover Letters pages. Layout is responsive.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
