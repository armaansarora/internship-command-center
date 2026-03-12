# Phase 7: Smarter AI & Networking - Research

**Researched:** 2026-03-10
**Domain:** AI-powered interview prep, cover letter versioning, company comparison, networking/contact management
**Confidence:** HIGH

## Summary

Phase 7 adds two major feature clusters to the Internship Command Center: (1) smarter AI features including interview prep generation, cover letter version history with side-by-side comparison, company comparison, and context-aware follow-up templates, and (2) a networking layer with contacts management, relationship warmth tracking with exponential auto-decay, and referral chain visualization.

The codebase already has all the foundational pieces in place. The `@anthropic-ai/sdk` is used directly for Claude API calls (cover letter generation, follow-up email drafting), Tavily research is cached in the `company_research` table, the `@tanstack/react-table` powers the application tracker, and shadcn/radix components provide the UI layer. This phase extends these existing patterns rather than introducing new architectural decisions.

**Primary recommendation:** Build the networking layer (DB schema + contacts table/page) first since it has no AI dependencies, then layer in the AI features (interview prep, cover letter versioning, company comparison) which all follow the established Claude API call pattern. Use the existing `foreignKey()` operator pattern from Drizzle for the self-referential `introduced_by` FK on contacts. Warmth is compute-on-read using exponential decay -- no cron jobs, no stored warmth values.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Interview prep lives as a section on the application detail page (not a standalone page)
- Full package: company overview, likely questions, talking points, and recent news
- Generated and stored in DB -- can revisit prep without re-generating
- Auto-generates when application moves to "interview" status, with manual re-generate button
- Uses @anthropic-ai/sdk directly (existing pattern) + Tavily for company research
- Cover letter: every generation auto-saved to new `cover_letters` DB table (no explicit save button)
- Versions browsable in both places: /cover-letters page (all versions grouped by company) AND per-application on detail page
- Side-by-side comparison: simple two-column view, no diff highlighting
- "Active" version pinning: one version per company marked as the active/send-ready one
- Existing generator flow unchanged -- just adds auto-save behind the scenes
- Company comparison accessed via checkboxes in the tracker table -- select 2-3 rows, "Compare" button appears
- Opens in a modal/drawer overlay (not a standalone page)
- Full breakdown columns: culture, size, recent deals/news, compensation range estimate, fit assessment
- Data from existing companyResearch cache (Tavily) + Claude for structured comparison generation
- Contacts table: name, company, email, phone, role, relationship type, introduced_by (self-referential FK)
- Contacts page: table view (consistent with application tracker pattern)
- Warmth visualization: color-coded badges -- Hot (green), Warm (yellow), Cold (red/gray)
- Warmth auto-decay: compute-on-read with exponential decay, cold after 30 days without interaction
- "Who do I know?" on detail pages: inline contact cards showing matching contacts for that company
- Referral chains: simple "introduced by" link field on each contact -- click to see that contact
- Add/edit contact form on contacts page
- Enhanced follow-up templates: context-aware email drafts (thank-you vs. cold follow-up vs. referral nudge vs. post-interview)
- Extends existing DraftEmail component with template type selection

### Claude's Discretion
- Interview prep section layout and expand/collapse behavior
- Cover letter version list UI details (cards vs list items)
- Comparison modal sizing and responsive behavior
- Contact form field layout and validation
- Loading states and skeleton designs for new sections
- Warmth decay formula specifics (exponential curve parameters)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | Interview prep generation -- company overview, likely questions, talking points, recent news | Existing `@anthropic-ai/sdk` + `research.ts` Tavily pattern. New `interview_prep` DB table to persist results. Claude system prompt for structured interview prep output. |
| AI-02 | Cover letter version history -- store every generation, mark favorites | New `cover_letters` DB table with `applicationId`, `content`, `isActive` flag, `generatedAt`. Auto-save hook in `generateCoverLetterAction`. |
| AI-03 | Cover letter side-by-side comparison of two versions | Client-side two-column layout. No diff library needed (CONTEXT.md: "no diff highlighting"). Simple grid with two version cards. |
| AI-04 | Company comparison -- select 2-3 companies, structured table | TanStack Table row selection with checkboxes (`enableRowSelection`). Claude API call with cached Tavily research for structured comparison. Dialog/Sheet overlay. |
| AI-05 | Enhanced follow-up templates -- context-aware | Extend existing `DraftEmail` component and `generateFollowUpEmail` server action. Add template type parameter (thank-you, cold follow-up, referral nudge, post-interview). |
| NET-01 | Contacts table: name, company, email, phone, role, relationship type | New Drizzle schema table `contacts` with all fields. `introduced_by` uses `foreignKey()` operator for self-referential FK. |
| NET-02 | Contact cards displayed on application detail pages | Query contacts by company name match. Render inline card list on `[id]/page.tsx`. |
| NET-03 | "Who do I know at [Company]?" search | SQL query `WHERE contacts.company = ?` or LIKE match. Displayed as contact cards section on detail page. |
| NET-04 | Relationship warmth tracking with auto-decay | Compute-on-read: `warmth = Math.exp(-daysSinceContact / 13)`. Map to Hot/Warm/Cold thresholds. `lastContactedAt` stored, warmth calculated at read time. |
| NET-05 | Referral chain tracking (introduced_by FK) | Self-referential FK via `foreignKey()` operator. "Introduced by" link on contact card navigates to referrer contact. |
| NET-06 | Contacts page with list view, add/edit contact form | New `/contacts` route. Reuse `AppTable` pattern with `@tanstack/react-table`. `react-hook-form` + `zod` for contact form (both already installed). |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.78.0 | Claude API calls for interview prep, comparison, templates | Already used for cover letters and follow-up emails |
| drizzle-orm | ^0.45.1 | Database schema, queries, migrations | Already powers all DB operations |
| @libsql/client | ^0.17.0 | Turso/SQLite driver | Already configured for local + cloud |
| @tanstack/react-table | ^8.21.3 | Data tables with sorting, filtering, selection | Already powers application tracker |
| react-hook-form | ^7.71.2 | Form handling for contact add/edit | Already installed and configured |
| zod | ^4.3.6 | Schema validation for forms and server actions | Already used throughout |
| sonner | ^2.0.7 | Toast notifications | Already used for all mutations |
| lucide-react | ^0.577.0 | Icons | Already used everywhere |
| date-fns | ^4.1.0 | Date formatting and calculations | Already used for timestamps |

### New Components to Add (via shadcn CLI)
| Component | Purpose | Command |
|-----------|---------|---------|
| Checkbox | Row selection in tracker table for company comparison | `npx shadcn@latest add checkbox` |
| Tabs | Cover letter version grouping, comparison views | `npx shadcn@latest add tabs` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct @anthropic-ai/sdk | Vercel AI SDK | Already decided against (STATE.md) -- existing pattern works, no extra layer needed |
| Stored warmth values + cron | Compute-on-read | Already decided (STATE.md) -- simpler, no stale data, no background jobs |
| Diff library for cover letters | No diff | Already decided (CONTEXT.md) -- simple two-column view, no diff highlighting |

**Installation:**
```bash
npx shadcn@latest add checkbox tabs
```

## Architecture Patterns

### New Files Structure
```
src/
├── db/
│   └── schema.ts              # ADD: contacts, coverLetters, interviewPrep tables
├── lib/
│   ├── contacts.ts             # NEW: contact CRUD queries, warmth computation
│   ├── contact-actions.ts      # NEW: server actions for contact mutations
│   ├── interview-prep.ts       # NEW: interview prep generation + DB persistence
│   ├── interview-prep-actions.ts  # NEW: server actions for interview prep
│   ├── cover-letter-versions.ts   # NEW: version history queries, comparison
│   └── company-comparison.ts   # NEW: comparison generation via Claude
├── components/
│   ├── contacts/
│   │   ├── contacts-table.tsx  # NEW: reuses AppTable pattern
│   │   ├── contacts-columns.tsx # NEW: column definitions with warmth badges
│   │   ├── contact-form.tsx    # NEW: add/edit form (react-hook-form + zod)
│   │   ├── contact-card.tsx    # NEW: inline card for detail page
│   │   └── warmth-badge.tsx    # NEW: Hot/Warm/Cold color badges
│   ├── detail/
│   │   ├── interview-prep.tsx  # NEW: interview prep section
│   │   └── company-contacts.tsx # NEW: "Who do I know?" section
│   ├── cover-letters/
│   │   ├── version-history.tsx # NEW: version list with grouping
│   │   └── version-compare.tsx # NEW: side-by-side comparison
│   └── applications/
│       └── company-compare.tsx # NEW: comparison modal/dialog
└── app/
    └── contacts/
        ├── page.tsx            # NEW: contacts list page
        └── loading.tsx         # NEW: skeleton loader
```

### Pattern 1: Schema Extension with Self-Referential FK
**What:** New `contacts` table with `introducedBy` column referencing its own `id` via `foreignKey()` operator
**When to use:** Whenever a table row needs to reference another row in the same table
**Example:**
```typescript
// Source: Drizzle ORM docs - Indexes & Constraints
import { sqliteTable, text, integer, index, foreignKey } from 'drizzle-orm/sqlite-core';

export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  company: text('company').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: text('role'),
  relationshipType: text('relationship_type', {
    enum: ['recruiter', 'referral', 'alumni', 'cold_contact']
  }).notNull(),
  introducedBy: integer('introduced_by'),
  lastContactedAt: integer('last_contacted_at', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  foreignKey({
    columns: [table.introducedBy],
    foreignColumns: [table.id],
    name: 'fk_contacts_introduced_by',
  }),
  index('idx_contacts_company').on(table.company),
  index('idx_contacts_last_contacted').on(table.lastContactedAt),
]);
```

### Pattern 2: Compute-on-Read Warmth with Exponential Decay
**What:** Calculate relationship warmth at query time, never store it
**When to use:** When warmth must reflect real-time decay without background jobs
**Example:**
```typescript
// Warmth formula: exponential decay with half-life of ~9 days
// At 0 days: 100% (Hot), at 15 days: ~32% (Warm), at 30 days: ~10% (Cold)
export type WarmthLevel = 'hot' | 'warm' | 'cold';

export function computeWarmth(lastContactedAt: Date | null): {
  level: WarmthLevel;
  score: number;
  daysSince: number;
} {
  if (!lastContactedAt) {
    return { level: 'cold', score: 0, daysSince: Infinity };
  }

  const daysSince = Math.floor(
    (Date.now() - lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Exponential decay: e^(-t/tau) where tau = 13 (time constant)
  // This gives: 7 days = ~58%, 15 days = ~32%, 30 days = ~10%
  const score = Math.exp(-daysSince / 13) * 100;

  let level: WarmthLevel;
  if (daysSince <= 7) level = 'hot';
  else if (daysSince <= 30) level = 'warm';
  else level = 'cold';

  return { level, score: Math.round(score), daysSince };
}
```

### Pattern 3: TanStack Table Row Selection for Company Comparison
**What:** Add checkbox column to existing AppTable for selecting 2-3 rows
**When to use:** When users need to select multiple rows for batch operations
**Example:**
```typescript
// Source: TanStack Table Row Selection Guide
import { Checkbox } from '@/components/ui/checkbox';

// Add selection column at the beginning of columns array
const selectColumn: ColumnDef<Application> = {
  id: 'select',
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected()}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
      onClick={(e) => e.stopPropagation()}
    />
  ),
  enableSorting: false,
  enableHiding: false,
};

// In AppTable: add to useReactTable config
const table = useReactTable({
  // ...existing config
  enableRowSelection: true,
  onRowSelectionChange: setRowSelection,
  state: { sorting, columnFilters, globalFilter, rowSelection },
});

// Show Compare button when 2-3 rows selected
const selectedRows = table.getSelectedRowModel().rows;
const canCompare = selectedRows.length >= 2 && selectedRows.length <= 3;
```

### Pattern 4: Auto-Save Cover Letter on Generation
**What:** Intercept existing generation flow to persist every cover letter
**When to use:** When auto-save should happen transparently behind existing UI
**Example:**
```typescript
// In cover-letter-actions.ts -- extend generateCoverLetterAction
export async function generateCoverLetterAction(
  company: string,
  role: string,
  applicationId?: number,
): Promise<GenerationState> {
  try {
    const research = await getCompanyResearch(company);
    const result = await generateCoverLetter(company, role, research);

    // Auto-save to cover_letters table
    if (result.content) {
      await db.insert(coverLetters).values({
        applicationId: applicationId ?? null,
        company,
        role,
        content: result.content,
        researchSource: research?.source ?? 'none',
        isActive: false,
        generatedAt: new Date(),
      }).run();
    }

    return { step: 'done', content: result.content };
  } catch (e) {
    return { step: 'error', error: e instanceof Error ? e.message : 'Generation failed' };
  }
}
```

### Pattern 5: Claude API for Structured Interview Prep
**What:** Generate interview prep as structured data using Claude with a detailed system prompt
**When to use:** When Claude needs to produce categorized, actionable content
**Example:**
```typescript
// Generate structured interview prep
export async function generateInterviewPrep(
  company: string,
  role: string,
  research: CompanyResearchData,
): Promise<InterviewPrepData> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `You are preparing Armaan Arora for an interview. Output structured prep in this exact format:

## Company Overview
[2-3 sentences about the company, their focus, recent activity]

## Likely Questions
1. [Question] -- [1-sentence guidance on how to answer]
2. [Question] -- [1-sentence guidance]
... (5-8 questions)

## Talking Points
- [Point connecting Armaan's experience to company needs]
- [Point about relevant coursework or skills]
... (4-6 points)

## Recent News
- [News item relevant to interview conversation]
... (2-4 items)

Keep it actionable -- bullet points, not paragraphs. This is "prepare in 5 minutes before the call."
NEVER fabricate facts. Use only the provided research data.`,
    messages: [{
      role: 'user',
      content: `Prepare interview prep for ${company} (${role}).

RESUME: ${JSON.stringify(RESUME, null, 2)}

COMPANY RESEARCH:
${JSON.stringify(research, null, 2)}`
    }],
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  return { content, company, role, generatedAt: new Date() };
}
```

### Anti-Patterns to Avoid
- **Storing warmth as a column:** Warmth must be compute-on-read. Storing it creates stale data that requires cron jobs. The project explicitly decided against this (STATE.md).
- **Separate API routes for AI calls:** The project uses server actions exclusively. Do NOT create API route handlers (`app/api/...`).
- **Adding Vercel AI SDK:** The project explicitly decided to skip it (STATE.md). Continue using `@anthropic-ai/sdk` directly.
- **Complex diff library for cover letters:** CONTEXT.md says "simple two-column view, no diff highlighting." Do NOT add diff libraries.
- **Inline references() for self-referential FK:** Drizzle requires `foreignKey()` operator for self-referential relationships. Inline `.references()` causes TypeScript circular reference errors.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table with sorting/filtering | Custom table logic | `@tanstack/react-table` (already installed) | Sorting, filtering, pagination, row selection all built-in |
| Form validation | Manual field checking | `react-hook-form` + `zod` (already installed) | Error states, field validation, TypeScript types from schema |
| Checkbox UI | Raw HTML checkbox | `shadcn checkbox` component | Accessible, styled, matches design system |
| Modal/overlay | Custom portal | `shadcn dialog` or `sheet` (already installed) | Accessible, keyboard navigation, focus trap |
| Toast notifications | Custom alert system | `sonner` (already installed) | Consistent with rest of app |
| Date calculations | Manual ms math | `date-fns` (already installed) | `differenceInDays()`, `formatDistanceToNow()` |

**Key insight:** Every library needed for this phase is already installed. The only new installs are two shadcn components (checkbox, tabs). The phase is about extending patterns, not adding dependencies.

## Common Pitfalls

### Pitfall 1: Self-Referential FK Migration Order
**What goes wrong:** Drizzle migration fails because `introduced_by` references `contacts.id` but the column is defined before the table is fully created.
**Why it happens:** SQLite handles self-referential FKs fine, but Drizzle Kit can generate migrations in the wrong order if not using `foreignKey()` operator.
**How to avoid:** Always use `foreignKey()` in the table's constraint callback (third argument), never inline `.references()` for self-referential columns. Run `npx drizzle-kit generate` and verify the migration SQL before applying.
**Warning signs:** TypeScript errors about circular types, or migration SQL that references a table before CREATE.

### Pitfall 2: N+1 Queries on Contact Warmth
**What goes wrong:** Computing warmth for each contact individually in a loop causes N+1 database queries.
**Why it happens:** If warmth computation is in a separate function that queries the DB, calling it per-row creates query explosion.
**How to avoid:** Warmth is pure computation on the `lastContactedAt` field. Fetch all contacts in one query, compute warmth in JavaScript. No extra DB round-trips needed.
**Warning signs:** Slow contacts page load, multiple sequential queries in server logs.

### Pitfall 3: Race Condition on Cover Letter Auto-Save
**What goes wrong:** Two rapid generations for the same company create duplicate "active" versions.
**Why it happens:** User clicks generate, then quickly clicks again. Both save to DB.
**How to avoid:** New cover letters are always saved with `isActive: false`. Only explicit user action (clicking "Set as Active") marks one as active. When setting active, use a transaction to set all others for that company to `isActive: false` first.
**Warning signs:** Multiple cover letters marked active for the same company.

### Pitfall 4: Checkbox Click Propagating to Row Navigation
**What goes wrong:** Clicking the checkbox in the tracker table also triggers row click navigation to the detail page.
**Why it happens:** The existing `TableRow onClick` handler navigates on click. Checkbox click bubbles up to the row.
**How to avoid:** Add `onClick={(e) => e.stopPropagation()}` on the Checkbox in the cell renderer. The existing codebase already uses this pattern for Select dropdowns in columns.tsx.
**Warning signs:** Clicking checkbox navigates to detail page instead of toggling selection.

### Pitfall 5: Interview Prep Regeneration Losing Previous Version
**What goes wrong:** Clicking "Re-generate" overwrites the previously stored prep.
**Why it happens:** Using `UPDATE` instead of `INSERT` for new prep content.
**How to avoid:** Each generation creates a new row. Display the latest one by default. Keep previous versions accessible (or just keep the latest -- CONTEXT.md says "can revisit prep without re-generating" but doesn't mention version history for prep specifically).
**Warning signs:** User regenerates prep and loses useful content from previous generation.

### Pitfall 6: Company Comparison Stale Research Data
**What goes wrong:** Comparison generates using old cached research, producing outdated info.
**Why it happens:** Tavily research cache has 7-day TTL, but some entries might be much older if the company was researched weeks ago.
**How to avoid:** Before generating comparison, check cache age. If older than 7 days, refresh from Tavily first. The existing `getCompanyResearch()` function already handles this -- just call it for each company before generating the comparison.
**Warning signs:** Comparison mentions news or deals from months ago.

## Code Examples

### Cover Letters DB Schema
```typescript
export const coverLetters = sqliteTable('cover_letters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id')
    .references(() => applications.id, { onDelete: 'set null' }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
    .$defaultFn(() => new Date()),
});
```

### Interview Prep DB Schema
```typescript
export const interviewPrep = sqliteTable('interview_prep', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
    .$defaultFn(() => new Date()),
});
```

### Warmth Badge Component (matches StatusBadge/TierBadge pattern)
```typescript
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WarmthLevel } from '@/lib/contacts';

const warmthStyles: Record<WarmthLevel, string> = {
  hot: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warm: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cold: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const warmthLabels: Record<WarmthLevel, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
};

export function WarmthBadge({ level }: { level: WarmthLevel }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', warmthStyles[level])}>
      {warmthLabels[level]}
    </Badge>
  );
}
```

### Contact Server Action Pattern (matches existing actions.ts)
```typescript
'use server';

import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().min(1, 'Company is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().optional(),
  relationshipType: z.enum(['recruiter', 'referral', 'alumni', 'cold_contact']),
  introducedBy: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export async function createContact(formData: FormData) {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    company: formData.get('company'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    role: formData.get('role') || undefined,
    relationshipType: formData.get('relationshipType'),
    introducedBy: formData.get('introducedBy') || undefined,
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  await db.insert(contacts).values({
    ...parsed.data,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    role: parsed.data.role || null,
    introducedBy: parsed.data.introducedBy || null,
    notes: parsed.data.notes || null,
    lastContactedAt: new Date(),
  }).run();

  revalidatePath('/contacts');
  return { success: true };
}
```

### Enhanced DraftEmail with Template Type
```typescript
// Extend existing DraftEmail to support template types
type TemplateType = 'follow-up' | 'thank-you' | 'cold-outreach' | 'referral-nudge' | 'post-interview';

// In the server action, include template type in the prompt:
const templateContextMap: Record<TemplateType, string> = {
  'follow-up': 'This is a polite status check -- express continued interest without being pushy',
  'thank-you': 'This is a thank-you after an interview -- warm, specific, reference something from the conversation',
  'cold-outreach': 'This is a cold outreach to a new contact -- brief, respectful, explain why you are reaching out',
  'referral-nudge': 'This is a gentle nudge to someone who offered to refer you -- grateful, not pushy',
  'post-interview': 'This is a post-interview follow-up -- professional, reaffirm interest, mention next steps if discussed',
};
```

### Navigation Addition Pattern
```typescript
// In sidebar.tsx and bottom-tab-bar.tsx, add to navItems array:
import { Users } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: Briefcase },
  { href: '/contacts', label: 'Contacts', icon: Users },       // NEW
  { href: '/cover-letters', label: 'Cover Letter Lab', icon: FileText },
  { href: '/follow-ups', label: 'Follow-Ups', icon: Bell },
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cover letters generated in-memory only | Auto-save every generation to DB | This phase | Enables version history, comparison, "active" marking |
| Single follow-up email template | Context-aware templates | This phase | Better email quality based on situation type |
| Contact info as flat fields on application | Dedicated contacts table with relationships | This phase | Many-to-many via company, referral chains, warmth tracking |
| Company research viewed ad-hoc | Research drives interview prep + comparison | This phase | AI-powered prep and structured comparison from cached data |

**Deprecated/outdated:**
- The current `ContactInfo` component on the detail page (simple display of `contactName`/`contactEmail`/`contactRole` from applications table) will be supplemented (not replaced) by the richer "Who do I know?" contact cards from the new `contacts` table.

## Open Questions

1. **Interview prep auto-generation trigger**
   - What we know: CONTEXT.md says "auto-generates when application moves to interview status"
   - What's unclear: Should this happen in the `updateApplicationStatus` server action, or via a client-side effect on the detail page?
   - Recommendation: Trigger in `updateApplicationStatus` server action. If status changes to 'interview', call `generateInterviewPrep()` in the background. This ensures prep is ready by the time the user visits the detail page.

2. **Cover letter version grouping key**
   - What we know: Versions are "grouped by company" on the cover-letters page
   - What's unclear: Group by exact company name string, or by applicationId?
   - Recommendation: Group by company name string. Multiple applications at the same company (different roles) should show together. The cover letter has both company and role fields for disambiguation.

3. **Contact-to-application matching granularity**
   - What we know: "Who do I know at [Company]?" on detail pages
   - What's unclear: Exact string match on company name, or fuzzy/LIKE match?
   - Recommendation: Start with exact case-insensitive match (`LOWER(contacts.company) = LOWER(app.company)`). If needed, add LIKE match later. Company names are user-entered in both tables so they should be consistent.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NET-01 | Contacts schema validates and inserts correctly | unit | `npx vitest run src/__tests__/contacts-schema.test.ts -x` | No -- Wave 0 |
| NET-04 | Warmth computation returns correct levels | unit | `npx vitest run src/__tests__/warmth.test.ts -x` | No -- Wave 0 |
| NET-05 | Self-referential FK allows introduced_by linking | unit | `npx vitest run src/__tests__/contacts-schema.test.ts -x` | No -- Wave 0 |
| AI-02 | Cover letter auto-save creates DB record | unit | `npx vitest run src/__tests__/cover-letter-versions.test.ts -x` | No -- Wave 0 |
| AI-01 | Interview prep generation returns structured content | unit | `npx vitest run src/__tests__/interview-prep.test.ts -x` | No -- Wave 0 |
| AI-04 | Company comparison produces structured table data | manual-only | Manual -- requires live Claude API | N/A |
| AI-05 | Template type changes follow-up email tone | manual-only | Manual -- requires live Claude API | N/A |
| NET-02 | Contact cards show on detail page | manual-only | Manual -- visual/UI verification | N/A |
| NET-03 | "Who do I know" search returns correct contacts | unit | `npx vitest run src/__tests__/contacts-schema.test.ts -x` | No -- Wave 0 |
| NET-06 | Contact form validates and creates contact | manual-only | Manual -- form interaction | N/A |
| AI-03 | Cover letter comparison shows two versions side-by-side | manual-only | Manual -- visual/UI verification | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/contacts-schema.test.ts` -- covers NET-01, NET-03, NET-05
- [ ] `src/__tests__/warmth.test.ts` -- covers NET-04
- [ ] `src/__tests__/cover-letter-versions.test.ts` -- covers AI-02

## Sources

### Primary (HIGH confidence)
- Project codebase (`src/db/schema.ts`, `src/lib/research.ts`, `src/lib/cover-letter-actions.ts`, `src/lib/actions.ts`) -- existing patterns for all features
- Project STATE.md -- architectural decisions (warmth compute-on-read, no Vercel AI SDK, self-referential FK needs `foreignKey()`)
- Project CONTEXT.md (07) -- all user decisions for this phase

### Secondary (MEDIUM confidence)
- [Drizzle ORM - Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) -- `foreignKey()` operator syntax for self-referential FK
- [TanStack Table - Row Selection Guide](https://tanstack.com/table/v8/docs/guide/row-selection) -- checkbox row selection pattern
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- structured JSON output capability (available but not required for this phase)

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use; no new dependencies beyond 2 shadcn components
- Architecture: HIGH -- all patterns extend existing codebase patterns (server actions, Drizzle queries, TanStack tables, Claude API calls)
- Pitfalls: HIGH -- pitfalls identified from direct codebase analysis (click propagation, self-referential FK, race conditions)

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- no moving targets, all libs already pinned)
