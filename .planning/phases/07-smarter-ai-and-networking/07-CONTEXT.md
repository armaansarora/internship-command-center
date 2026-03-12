# Phase 7: Smarter AI & Networking - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

AI helps Armaan prepare for interviews, compare companies, and manage cover letter versions. Networking layer tracks contacts, relationship warmth, and referral chains. All features integrate into existing application detail pages and dashboard.

</domain>

<decisions>
## Implementation Decisions

### Interview Prep
- Lives as a section on the application detail page (not a standalone page)
- Full package: company overview, likely questions, talking points, and recent news
- Generated and stored in DB — can revisit prep without re-generating
- Auto-generates when application moves to "interview" status, with manual re-generate button
- Uses @anthropic-ai/sdk directly (existing pattern) + Tavily for company research

### Cover Letter Versioning
- Every generation auto-saved to new `cover_letters` DB table (no explicit save button)
- Versions browsable in both places: /cover-letters page (all versions grouped by company) AND per-application on detail page
- Side-by-side comparison: simple two-column view, no diff highlighting
- "Active" version pinning: one version per company marked as the active/send-ready one, others are archived drafts
- Existing generator flow unchanged — just adds auto-save behind the scenes

### Company Comparison
- Accessed via checkboxes in the tracker table — select 2-3 rows, "Compare" button appears
- Opens in a modal/drawer overlay (not a standalone page)
- Full breakdown columns: culture, size, recent deals/news, compensation range estimate, fit assessment
- Data from existing companyResearch cache (Tavily) + Claude for structured comparison generation
- Leverages existing research cache for speed, falls back to fresh research if not cached

### Contacts & Networking
- New `contacts` table: name, company, email, phone, role, relationship type, introduced_by (self-referential FK)
- Contacts page: table view (consistent with application tracker pattern) — sortable/filterable by name, company, warmth, last contact
- Warmth visualization: color-coded badges — Hot (green), Warm (yellow), Cold (red/gray) — like tier badges
- Warmth auto-decay: compute-on-read with exponential decay, cold after 30 days without interaction (existing decision from STATE.md)
- "Who do I know?" on detail pages: inline contact cards showing matching contacts for that company
- Referral chains: simple "introduced by" link field on each contact — click to see that contact
- Add/edit contact form on contacts page

### Enhanced Follow-Up Templates
- Context-aware email drafts: thank-you vs. cold follow-up vs. referral nudge vs. post-interview
- Extends existing DraftEmail component with template type selection

### Claude's Discretion
- Interview prep section layout and expand/collapse behavior
- Cover letter version list UI details (cards vs list items)
- Comparison modal sizing and responsive behavior
- Contact form field layout and validation
- Loading states and skeleton designs for new sections
- Warmth decay formula specifics (exponential curve parameters)

</decisions>

<specifics>
## Specific Ideas

- Interview prep should feel actionable — bullet points, not paragraphs. "Prepare in 5 minutes before the call"
- Cover letter comparison should show metadata (generated date, tone, company research used) alongside the content
- Company comparison table should be exportable/copyable for quick reference
- Contacts table should have the same feel as the applications tracker — Armaan already knows how to use it
- Warmth badges should match the color language of tier badges (familiar visual system)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/detail/company-research.tsx`: CompanyResearchView — extend for interview prep display
- `src/components/cover-letters/cover-letter-generator.tsx`: Existing generator — add auto-save hook
- `src/components/detail/contact-info.tsx`: ContactInfo component — simple display, will be replaced by richer contact cards
- `src/components/applications/app-table.tsx`: Table patterns with shadcn DataTable — reuse for contacts table
- `src/components/applications/columns.tsx`: Column definition pattern — reuse for contacts columns
- `src/lib/research.ts`: Tavily research integration — reuse for interview prep and company comparison
- `src/lib/cover-letter-actions.ts`: Server actions for cover letter generation — extend with save/version logic
- `src/components/applications/status-badge.tsx`: Badge component patterns — reuse for warmth badges
- `src/lib/dashboard.ts`: Dashboard queries with Promise.all() — add contact/networking data

### Established Patterns
- Server actions in `src/lib/actions.ts` with revalidatePath for cache invalidation
- Toast notifications via sonner on all mutations
- Drizzle ORM with @libsql/client for all DB operations
- Self-referential FK pattern needed (foreignKey() operator — noted in STATE.md decisions)
- Warmth as compute-on-read, not cron-based (existing architectural decision)

### Integration Points
- Application detail page (`src/app/applications/[id]/page.tsx`): add interview prep section + contact cards
- Cover letters page (`src/app/cover-letters/page.tsx`): add version history section
- Application tracker (`src/app/applications/page.tsx`): add checkboxes + compare button
- New route: `/contacts` page with table view
- Navigation: add Contacts to sidebar and bottom tab bar
- Dashboard: consider contacts-going-cold widget

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-smarter-ai-and-networking*
*Context gathered: 2026-03-10*
