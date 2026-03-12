# Phase 1: Data Foundation and Application Tracker - Research

**Researched:** 2026-03-06
**Domain:** SQLite database setup (Drizzle ORM + better-sqlite3), Next.js App Router full-stack CRUD, TanStack Table + shadcn/ui data table, dark-mode UI shell
**Confidence:** HIGH

## Summary

Phase 1 delivers the entire data layer and a fully functional application tracker UI. This is a greenfield build -- there is no existing internship command center code in the repository. The work spans three domains: (1) a SQLite database with Drizzle ORM schema, seed script for 71+ applications, and company research cache table; (2) a Next.js App Router application with Server Components for reads and Server Actions for mutations providing full CRUD on applications; (3) a dark-mode UI shell using shadcn/ui + TanStack Table for the sortable/filterable application list, detail view, quick-add form, and navigation. The resume data file (lib/resume.ts) is also created in this phase as typed constants.

The stack is well-established: Next.js 16 + React 19 + Drizzle ORM + better-sqlite3 + shadcn/ui + TanStack Table + Tailwind CSS v4. All libraries are verified at current versions on npm. The primary architectural pattern is Server Components for data reads (synchronous better-sqlite3 queries execute at render time with zero latency) and Server Actions for mutations (form submissions call `'use server'` functions that write to SQLite and call `revalidatePath()` to refresh the UI). No REST API endpoints are needed for Phase 1 -- Server Actions handle all mutations.

**Primary recommendation:** Build the database schema and seed script first, then layer the UI on top using Server Components for reads and Server Actions for writes. Use TanStack Table with shadcn/ui Table component for the application list. Keep Framer Motion usage minimal (hover states and small transitions only) -- full page transitions with App Router are fragile and not worth the effort in Phase 1.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | SQLite database with WAL mode, Drizzle ORM schema covering applications, companies, cover letters, follow-ups | Drizzle ORM sqliteTable definitions with better-sqlite3 driver; WAL mode via `sqlite.pragma('journal_mode = WAL')` on connection init; singleton pattern with globalThis guard |
| DATA-02 | Application record stores: company, role, tier (1-4), sector, status, date applied, platform, contact info, notes | Drizzle schema with text (enum mode for tier/status/sector), integer (timestamp mode for dates), and text columns; indexes on status, tier, company_name, applied_at |
| DATA-03 | Database seeded with 71+ existing applications from master prompt JSON | Drizzle insert batch operation via `db.insert(applications).values([...])` in a seed.ts script run with tsx |
| DATA-04 | Company research cache table with fetched_at timestamp, refreshed if older than 7 days | Drizzle table with company_name (unique), research_json (text mode json), fetched_at (integer mode timestamp); TTL check in service layer |
| DATA-05 | Resume data stored as typed TypeScript constants in lib/resume.ts | Static TypeScript file with exported typed objects -- compile-time guarantee, no DB dependency |
| TRACK-01 | Sortable table (sort by date, tier, status, company name) | TanStack Table getSortedRowModel() with column-level toggleSorting; shadcn Table + Button for sort headers with ArrowUpDown icons |
| TRACK-02 | Filter by tier (T1-T4), status, sector, platform | TanStack Table getFilteredRowModel() with column filters; shadcn Select/Command for filter dropdowns |
| TRACK-03 | Search by company name or role title | TanStack Table global filter or column-level setFilterValue with text Input |
| TRACK-04 | Click application for detail view with research, notes, contact info, timeline | Next.js dynamic route `/applications/[id]/page.tsx` as Server Component; direct Drizzle query by ID |
| TRACK-06 | Update application status from detail view | Server Action with Zod validation; inline status Select/dropdown; revalidatePath after update |
| TRACK-07 | Add notes to any application | Server Action for notes update; textarea in detail view; revalidatePath after save |
| TRACK-08 | Quick-add form with smart defaults (date=today, tier auto-suggested) | react-hook-form + Zod schema + Server Action; Dialog/Sheet for quick-add overlay; default date via new Date() |
| TRACK-09 | Tier indicators color-coded: Gold T1, Blue T2, Violet T3, Gray T4 | shadcn Badge component with conditional Tailwind classes; `cn()` utility for class merging |
| TRACK-10 | Status badges visually distinct: Emerald active, Amber review, Fuchsia interview, Red rejected, Gray applied | shadcn Badge with status-specific background/text color classes |
| UI-01 | Dark mode with slate/zinc base as default (and only) theme | next-themes ThemeProvider with `forcedTheme="dark"` or `defaultTheme="dark"`; shadcn dark mode CSS variables |
| UI-02 | Clean sans-serif typography (Inter or Geist font) | Next.js built-in `next/font/google` with Inter or Geist; apply to root layout body |
| UI-03 | Generous whitespace, minimal visual clutter | Tailwind spacing utilities (p-6, gap-4, space-y-6); shadcn default spacing is already generous |
| UI-04 | Smooth transitions and hover states | CSS transitions (transition-colors, transition-opacity) for hover; Framer Motion only for dialog/sheet enter/exit |
| UI-05 | Left sidebar or top tab navigation with max 4-5 sections | shadcn Sidebar or custom nav component; routes: Overview, Applications, Cover Letter Lab, Follow-Ups |
| UI-06 | Responsive layout, desktop-first but usable on tablet/mobile | Tailwind responsive prefixes (md:, lg:); sidebar collapses on mobile; table horizontal scroll on small screens |
| UI-07 | Every element that looks clickable IS clickable | Audit all styled elements; use `<button>` or `<Link>` for interactive elements; cursor-pointer on all clickables |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Full-stack framework (React UI + Server Actions) | App Router provides Server Components for zero-latency SQLite reads and Server Actions for mutations without REST endpoints |
| React | 19.2.4 | UI rendering | Ships with Next.js 16; useActionState for form handling |
| TypeScript | 5.9.3 | Type safety | Drizzle ORM type inference flows from schema to queries to components |
| better-sqlite3 | 12.6.2 | SQLite driver | Synchronous API -- no async complexity; fastest Node.js SQLite driver; works in Server Components |
| Drizzle ORM | 0.45.1 | Type-safe SQL + schema + migrations | Thin layer over SQL; schema defines DB; type inference eliminates manual type declarations |
| Tailwind CSS | 4.2.1 | Utility-first styling | v4 is CSS-native, no config file; dark: variants are first-class |
| shadcn/ui | latest (CLI) | Component library (owned code) | Not a dependency -- components copied into project; Radix UI primitives; Table, Badge, Button, Dialog, Select, Command, Sheet, Card, Input, Textarea |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | 0.31.9 | Schema migrations CLI | `drizzle-kit generate` after schema changes, `drizzle-kit migrate` to apply, `drizzle-kit studio` for DB browsing |
| @tanstack/react-table | 8.21.3 | Headless sortable/filterable table | Application tracker list view; pair with shadcn Table for rendering |
| zod | 4.3.6 | Runtime schema validation | Validate all form inputs (quick-add, status update) before DB writes |
| react-hook-form | 7.71.2 | Form state management | Quick-add form, status update forms; integrates with Zod via @hookform/resolvers |
| next-themes | 0.4.6 | Dark mode management | ThemeProvider in root layout with defaultTheme="dark"; CSS variable swapping; zero flicker |
| date-fns | 4.1.0 | Date formatting | Display "applied X days ago", format dates in table columns |
| lucide-react | 0.577.0 | Icon set | ArrowUpDown for sort headers, Plus for add button, Search for search input; same icons shadcn uses |
| clsx + tailwind-merge | 2.1.1 / latest | Conditional class merging | cn() utility generated by shadcn init |
| class-variance-authority | latest | Component variant management | Used by shadcn components for variant styling |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Actions for mutations | REST API route handlers (/api/apps) | Route handlers add boilerplate; Server Actions are simpler for same-origin mutations; use route handlers only when streaming is needed (Phase 3) |
| TanStack Table | Native HTML table + manual sort | Manual sort/filter is tedious at 71+ rows; TanStack handles edge cases (null sorting, multi-column sort, pagination) |
| Framer Motion (minimal) | CSS-only transitions | CSS transitions are sufficient for Phase 1 hover states; Framer Motion adds complexity with App Router page transitions; defer heavy animation to polish pass |
| better-sqlite3 | @libsql/client (Turso) | libsql adds remote capability but is heavier; stick with better-sqlite3 for local development; swap later if deploying to cloud |

**Installation:**
```bash
# 1. Bootstrap Next.js with App Router + TypeScript + Tailwind
npx create-next-app@latest internship-command-center \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd internship-command-center

# 2. Database layer
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# 3. UI components foundation
npm install next-themes lucide-react clsx tailwind-merge class-variance-authority
npx shadcn@latest init  # Choose: dark theme, CSS variables, src/components/ui

# 4. Install shadcn components needed for Phase 1
npx shadcn@latest add table badge button dialog select command sheet card \
  separator input textarea label tooltip dropdown-menu sidebar

# 5. Data table + forms + validation
npm install @tanstack/react-table
npm install react-hook-form zod @hookform/resolvers

# 6. Utilities
npm install date-fns

# 7. Dev tools
npm install -D tsx  # For running seed script with TypeScript
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout: ThemeProvider, font, nav shell
│   ├── page.tsx                   # Home/placeholder (becomes Dashboard in Phase 2)
│   ├── applications/
│   │   ├── page.tsx               # Application list (Server Component)
│   │   └── [id]/
│   │       └── page.tsx           # Application detail (Server Component)
│   └── globals.css                # Tailwind base + shadcn CSS variables
├── components/
│   ├── ui/                        # shadcn/ui components (auto-generated)
│   ├── applications/
│   │   ├── app-table.tsx          # TanStack Table + shadcn Table wrapper
│   │   ├── columns.tsx            # Column definitions with sort headers
│   │   ├── status-badge.tsx       # Color-coded status indicator
│   │   ├── tier-badge.tsx         # Color-coded tier indicator
│   │   ├── quick-add-form.tsx     # Quick-add dialog/sheet form
│   │   ├── app-filters.tsx        # Filter bar (tier, status, sector, platform)
│   │   └── search-input.tsx       # Search by company/role
│   ├── detail/
│   │   ├── status-editor.tsx      # Inline status update dropdown
│   │   ├── notes-editor.tsx       # Notes textarea with save
│   │   └── contact-info.tsx       # Contact display/edit
│   └── layout/
│       ├── sidebar.tsx            # Left sidebar navigation
│       └── theme-provider.tsx     # next-themes wrapper (client component)
├── db/
│   ├── index.ts                   # Singleton better-sqlite3 + Drizzle instance
│   ├── schema.ts                  # Drizzle table definitions
│   ├── migrations/                # Generated SQL migrations
│   └── seed.ts                    # Seeds 71+ applications
├── lib/
│   ├── resume.ts                  # Armaan's resume as typed constants
│   ├── utils.ts                   # cn() helper + date formatters
│   └── actions.ts                 # Server Actions for all mutations
└── types/
    └── index.ts                   # Application, Status, Tier, Sector types
```

### Pattern 1: SQLite Singleton with WAL Mode

**What:** A single synchronous SQLite connection shared across all server requests, protected with a `globalThis` guard to survive Next.js hot reload in development.

**When to use:** Always. This is the only correct way to use better-sqlite3 in Next.js.

**Example:**
```typescript
// src/db/index.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_PATH || './data/internship.db';

declare global {
  var __db: ReturnType<typeof Database> | undefined;
}

const sqlite = globalThis.__db ?? new Database(DB_PATH);
if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = sqlite;
}

// Enable WAL mode for better read concurrency (DATA-01)
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');

export const db = drizzle(sqlite, { schema });
```

### Pattern 2: Drizzle Schema for Application Data

**What:** Complete schema definition covering applications, company_research, follow_ups tables with proper types, indexes, and defaults.

**When to use:** Phase 1 schema setup. All tables needed for v1 should be defined upfront even if some are populated later.

**Example:**
```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  tier: text('tier', { enum: ['T1', 'T2', 'T3', 'T4'] }).notNull(),
  sector: text('sector').notNull().default('Other'),
  status: text('status', {
    enum: ['applied', 'in_progress', 'interview', 'under_review', 'rejected', 'offer']
  }).notNull().default('applied'),
  appliedAt: integer('applied_at', { mode: 'timestamp' }).notNull(),
  platform: text('platform').default(''),
  contactName: text('contact_name').default(''),
  contactEmail: text('contact_email').default(''),
  contactRole: text('contact_role').default(''),
  notes: text('notes').default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
    .$defaultFn(() => new Date()),
}, (table) => [
  index('idx_applications_status').on(table.status),
  index('idx_applications_tier').on(table.tier),
  index('idx_applications_company').on(table.company),
  index('idx_applications_applied_at').on(table.appliedAt),
]);

export const companyResearch = sqliteTable('company_research', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyName: text('company_name').notNull().unique(),
  researchJson: text('research_json', { mode: 'json' }),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  index('idx_research_company').on(table.companyName),
]);

export const followUps = sqliteTable('follow_ups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  note: text('note').default(''),
  dismissed: integer('dismissed', { mode: 'boolean' }).notNull().default(false),
});
```

### Pattern 3: Server Components for Reads

**What:** Application list and detail pages are Server Components that query SQLite directly at render time. No API endpoints, no loading states, no client-side fetching needed for initial data.

**When to use:** Every page that displays data from SQLite.

**Example:**
```typescript
// src/app/applications/page.tsx (Server Component)
import { db } from '@/db';
import { applications } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { AppTable } from '@/components/applications/app-table';

export default async function ApplicationsPage() {
  const allApps = db.select().from(applications).orderBy(desc(applications.appliedAt)).all();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-6">Applications</h1>
      <AppTable data={allApps} />
    </div>
  );
}
```

### Pattern 4: Server Actions for Mutations

**What:** Form submissions call `'use server'` functions that validate with Zod, write to SQLite, and call `revalidatePath()` to refresh the page data.

**When to use:** Every mutation -- status updates, adding notes, creating new applications.

**Example:**
```typescript
// src/lib/actions.ts
'use server';

import { db } from '@/db';
import { applications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateStatusSchema = z.object({
  id: z.number(),
  status: z.enum(['applied', 'in_progress', 'interview', 'under_review', 'rejected', 'offer']),
});

export async function updateApplicationStatus(formData: FormData) {
  const parsed = updateStatusSchema.safeParse({
    id: Number(formData.get('id')),
    status: formData.get('status'),
  });

  if (!parsed.success) {
    return { error: 'Invalid input' };
  }

  db.update(applications)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(applications.id, parsed.data.id))
    .run();

  revalidatePath('/applications');
  revalidatePath(`/applications/${parsed.data.id}`);
}
```

### Pattern 5: TanStack Table with shadcn/ui

**What:** Headless TanStack Table providing sorting, filtering, and pagination logic; shadcn Table component providing the styled rendering layer.

**When to use:** The application list view (TRACK-01, TRACK-02, TRACK-03).

**Example:**
```typescript
// src/components/applications/columns.tsx
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { TierBadge } from './tier-badge';
import type { Application } from '@/types';

export const columns: ColumnDef<Application>[] = [
  {
    accessorKey: 'company',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Company <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
  {
    accessorKey: 'tier',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Tier <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <TierBadge tier={row.getValue('tier')} />,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Status <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'appliedAt',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Applied <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDate(row.getValue('appliedAt')),
  },
];
```

### Anti-Patterns to Avoid

- **Multiple SQLite connections:** Never call `new Database()` outside db/index.ts. Use the singleton. Hot reload creates duplicate connections causing "database is locked" errors.
- **Client-side data fetching for SQLite reads:** Do NOT use useEffect/fetch/TanStack Query to load application data. Server Components query SQLite directly -- zero latency, no loading spinner needed.
- **REST API routes for CRUD:** Server Actions handle all Phase 1 mutations. Route handlers are only needed for streaming (Phase 3 cover letter generation).
- **Edge runtime:** Never set `export const runtime = 'edge'` on any route/page that uses better-sqlite3. It is a native Node.js module and requires `runtime = 'nodejs'`.
- **Storing resume data in the database:** Resume facts go in lib/resume.ts as typed constants. This is a compile-time guarantee against hallucination (DATA-05).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable/filterable data table | Custom sort/filter logic on arrays | @tanstack/react-table | Handles null values in sort, multi-column sort, column visibility, pagination edge cases |
| Form validation | Manual if/else checks on formData | Zod schemas + react-hook-form | Type-safe, composable, reusable between client/server |
| Dark mode | Manual CSS class toggling | next-themes + shadcn CSS variables | Handles SSR hydration mismatch, localStorage persistence, system preference detection |
| Database migrations | Raw SQL files executed manually | drizzle-kit generate + migrate | Tracks schema changes, generates SQL diff, handles column additions safely |
| Date formatting | Manual date string manipulation | date-fns format/formatDistanceToNow | Handles locales, relative time ("3 days ago"), edge cases (invalid dates, timezones) |
| Component styling variants | Ternary className strings | class-variance-authority (cva) + cn() | Type-safe variant definitions, merge-safe with Tailwind |
| Navigation sidebar | Custom div with links | shadcn Sidebar component | Accessible, keyboard-navigable, collapsible, mobile-responsive built-in |

**Key insight:** Phase 1 is a data-heavy CRUD app with a table view. Every piece of this is a solved problem. The value is in the data model and UX decisions, not in novel UI engineering.

## Common Pitfalls

### Pitfall 1: WAL Mode Not Enabled
**What goes wrong:** SQLite defaults to journal mode. Concurrent reads during a write (e.g., user navigates while a status update is saving) cause `SQLITE_BUSY` errors.
**Why it happens:** Developers forget the PRAGMA because SQLite "just works" without it -- until it doesn't under concurrent access.
**How to avoid:** Add `sqlite.pragma('journal_mode = WAL')` in db/index.ts immediately after creating the Database instance. Verify with `sqlite.pragma('journal_mode')` which should return `[{ journal_mode: 'wal' }]`.
**Warning signs:** Intermittent "database is locked" errors during development.

### Pitfall 2: Hot Reload Creates Multiple DB Connections
**What goes wrong:** Every file save in development triggers a hot reload. Without the `globalThis.__db` guard, each reload creates a new SQLite connection. Multiple connections compete for the write lock.
**Why it happens:** Next.js dev server re-imports modules on hot reload. Module-level `new Database()` runs again.
**How to avoid:** Use the globalThis singleton pattern shown in Pattern 1. Check `globalThis.__db` before creating a new instance.
**Warning signs:** WAL file growing unexpectedly; "database is locked" errors appearing during development but not in production.

### Pitfall 3: Using Edge Runtime with better-sqlite3
**What goes wrong:** Setting `export const runtime = 'edge'` on a page or route that imports the db module crashes with "Cannot find module 'better-sqlite3'".
**Why it happens:** better-sqlite3 is a native C++ addon compiled for Node.js. The Edge runtime does not support native modules.
**How to avoid:** Never set edge runtime on anything that touches the database. Leave the default (nodejs) runtime on all pages and actions.
**Warning signs:** Build errors mentioning "Module not found: Can't resolve 'better-sqlite3'" in edge bundles.

### Pitfall 4: Sorting Breaks on NULL Values
**What goes wrong:** TanStack Table sort puts NULL values inconsistently -- sometimes at top, sometimes at bottom, sometimes crashes. Applications with no notes, no contact, or no follow-up date create NULLs that break sort expectations.
**Why it happens:** Default sort comparators don't handle NULL. SQLite returns NULL for empty columns. Drizzle passes them through as null/undefined.
**How to avoid:** Define custom sort functions for columns that can be null. Use `.default('')` or `.default(0)` in the Drizzle schema where appropriate. For date columns, define sortingFn that handles null/undefined.
**Warning signs:** Sort order changes unpredictably when clicking a column header; console errors about comparing null.

### Pitfall 5: Premature Seed Before Schema Is Complete
**What goes wrong:** You write a seed script, run it, then add a new column to the schema. The migration adds the column but existing seeded data has NULLs for the new field. Or worse, the seed script references columns that don't exist yet and crashes.
**Why it happens:** Eagerness to see data in the UI before the schema is finalized.
**How to avoid:** Define the COMPLETE schema first (all tables, all columns, all indexes). Run `drizzle-kit generate` and `drizzle-kit migrate`. THEN write and run the seed script. The schema must be stable before seeding.
**Warning signs:** Seed script has `// TODO: add field` comments; multiple migrations that just add columns.

### Pitfall 6: Forgetting revalidatePath After Server Action Mutations
**What goes wrong:** User updates a status or adds an application. The Server Action writes to the DB successfully, but the page still shows old data because Next.js cached the Server Component render.
**Why it happens:** Next.js aggressively caches Server Component renders. Without `revalidatePath()`, the cached HTML is served on the next navigation.
**How to avoid:** Every Server Action that writes to the DB must call `revalidatePath()` for all affected routes. Status update on app #5 should revalidate both `/applications` and `/applications/5`.
**Warning signs:** Data updates only appear after a full page refresh (Cmd+R), not after form submission.

## Code Examples

### Color-Coded Tier Badge (TRACK-09)
```typescript
// src/components/applications/tier-badge.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const tierStyles = {
  T1: 'bg-amber-500/20 text-amber-400 border-amber-500/30',    // Gold
  T2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',       // Blue
  T3: 'bg-violet-500/20 text-violet-400 border-violet-500/30', // Violet
  T4: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',       // Gray
} as const;

export function TierBadge({ tier }: { tier: keyof typeof tierStyles }) {
  return (
    <Badge variant="outline" className={cn('font-medium', tierStyles[tier])}>
      {tier}
    </Badge>
  );
}
```

### Color-Coded Status Badge (TRACK-10)
```typescript
// src/components/applications/status-badge.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  applied: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  in_progress: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  interview: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  under_review: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  offer: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
} as const;

const statusLabels = {
  applied: 'Applied',
  in_progress: 'In Progress',
  interview: 'Interview',
  under_review: 'Under Review',
  rejected: 'Rejected',
  offer: 'Offer',
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusStyles }) {
  return (
    <Badge variant="outline" className={cn('font-medium', statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}
```

### Dark Mode Root Layout (UI-01, UI-02)
```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/theme-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Internship Command Center',
  description: 'Track applications, generate cover letters, manage follow-ups',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
            {/* Sidebar goes here */}
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Theme Provider Client Component
```typescript
// src/components/layout/theme-provider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### Drizzle Config
```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || './data/internship.db',
  },
});
```

### Quick-Add Form with Server Action (TRACK-08)
```typescript
// src/components/applications/quick-add-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createApplication } from '@/lib/actions';

const quickAddSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  role: z.string().min(1, 'Role is required'),
  tier: z.enum(['T1', 'T2', 'T3', 'T4']),
  platform: z.string().optional(),
});

type QuickAddValues = z.infer<typeof quickAddSchema>;

export function QuickAddForm({ onSuccess }: { onSuccess?: () => void }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<QuickAddValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: { tier: 'T3' },
  });

  async function onSubmit(data: QuickAddValues) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, val]) => {
      if (val) formData.append(key, val);
    });
    await createApplication(formData);
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input placeholder="Company name" {...register('company')} />
      <Input placeholder="Role title" {...register('role')} />
      <Select onValueChange={(v) => setValue('tier', v as any)} defaultValue="T3">
        <SelectTrigger><SelectValue placeholder="Tier" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="T1">T1 - RE Finance</SelectItem>
          <SelectItem value="T2">T2 - Real Estate</SelectItem>
          <SelectItem value="T3">T3 - Finance</SelectItem>
          <SelectItem value="T4">T4 - Other</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="Platform (optional)" {...register('platform')} />
      <Button type="submit" className="w-full">Add Application</Button>
    </form>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| REST API routes for every mutation | Server Actions ('use server') | Next.js 14 (stable), 2024 | No need for /api/apps POST, PATCH, DELETE endpoints in Phase 1 |
| getServerSideProps for data fetching | Server Components with direct DB queries | Next.js 13+ App Router, 2023 | Application list data is available at render time, zero client-side loading |
| tailwind.config.js for theme config | Tailwind CSS v4 CSS-native configuration | Tailwind v4, 2025 | No config file needed; theme defined in globals.css via @theme |
| Prisma for ORM | Drizzle ORM (lighter, type-safe, no binary) | 2024-2025 community shift | No engine binary, faster cold starts, better SQLite support |
| useFormState (deprecated) | useActionState (React 19) | React 19, 2024 | New hook name for Server Action form state management |

**Deprecated/outdated:**
- `pages/` router: Do not use. App Router only.
- `getServerSideProps` / `getStaticProps`: Replaced by Server Components.
- `useFormState` from `react-dom`: Renamed to `useActionState` from `react` in React 19.
- Tailwind `tailwind.config.ts`: Not needed in Tailwind v4. Use CSS-based config.

## Open Questions

1. **Seed data format and location**
   - What we know: 71+ existing applications exist in a "master prompt JSON" referenced in the requirements
   - What's unclear: The exact format and location of this source data (company names, roles, tiers, statuses, dates, contacts, notes)
   - Recommendation: The planner should include a task for defining/locating the seed data source and creating the seed script. The data may need to be manually structured from the original spec document mentioned in PROJECT.md.

2. **Tier auto-suggestion logic for quick-add (TRACK-08)**
   - What we know: "tier auto-suggested from role keywords" is required
   - What's unclear: Exact keyword-to-tier mapping rules
   - Recommendation: Use simple keyword matching: if role contains "real estate" + "finance" keywords => T1; "real estate" => T2; "finance"/"banking"/"trading" => T3; everything else => T4. Allow override.

3. **Navigation structure for Phase 1**
   - What we know: UI-05 requires "max 4-5 sections: Overview, Applications, Cover Letter Lab, Follow-Ups"
   - What's unclear: Which sections have content in Phase 1 vs being placeholder
   - Recommendation: Build sidebar with all 4-5 nav items but only Applications is functional in Phase 1. Overview redirects to Applications. Cover Letter Lab and Follow-Ups show "Coming soon" placeholder.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (lightweight, Vite-native, TypeScript-first) |
| Config file | none -- Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | SQLite DB created with WAL mode enabled | unit | `npx vitest run src/db/__tests__/connection.test.ts -t "WAL"` | Wave 0 |
| DATA-02 | Application record has all required fields | unit | `npx vitest run src/db/__tests__/schema.test.ts` | Wave 0 |
| DATA-03 | 71+ applications seeded successfully | integration | `npx vitest run src/db/__tests__/seed.test.ts` | Wave 0 |
| DATA-04 | Company research cache table exists with TTL fields | unit | `npx vitest run src/db/__tests__/schema.test.ts -t "research"` | Wave 0 |
| DATA-05 | Resume data exports typed constants | unit | `npx vitest run src/lib/__tests__/resume.test.ts` | Wave 0 |
| TRACK-01 | Table sorts by date, tier, status, company | smoke | Manual verification in browser | N/A |
| TRACK-02 | Filters work for tier, status, sector, platform | smoke | Manual verification in browser | N/A |
| TRACK-03 | Search filters by company name or role | smoke | Manual verification in browser | N/A |
| TRACK-06 | Status update writes to DB and revalidates | integration | `npx vitest run src/lib/__tests__/actions.test.ts -t "status"` | Wave 0 |
| TRACK-08 | Quick-add creates application with defaults | integration | `npx vitest run src/lib/__tests__/actions.test.ts -t "create"` | Wave 0 |
| TRACK-09 | Tier badges render with correct colors | unit | `npx vitest run src/components/__tests__/tier-badge.test.ts` | Wave 0 |
| TRACK-10 | Status badges render with correct colors | unit | `npx vitest run src/components/__tests__/status-badge.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest` + `@vitejs/plugin-react` -- install as dev dependencies
- [ ] `vitest.config.ts` -- configure with path aliases matching tsconfig
- [ ] `src/db/__tests__/connection.test.ts` -- covers DATA-01 (WAL mode verification)
- [ ] `src/db/__tests__/schema.test.ts` -- covers DATA-02, DATA-04 (schema structure)
- [ ] `src/db/__tests__/seed.test.ts` -- covers DATA-03 (seed count verification)
- [ ] `src/lib/__tests__/resume.test.ts` -- covers DATA-05 (typed constants export)
- [ ] `src/lib/__tests__/actions.test.ts` -- covers TRACK-06, TRACK-08 (Server Action mutations)

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/get-started/sqlite-new) -- schema definition, better-sqlite3 setup, CRUD operations
- [Drizzle ORM column types (SQLite)](https://orm.drizzle.team/docs/column-types/sqlite) -- integer modes (timestamp, boolean), text enum mode, JSON mode
- [Drizzle ORM indexes & constraints](https://orm.drizzle.team/docs/indexes-constraints) -- index creation, foreign keys, unique constraints
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) -- TanStack Table integration, sorting, filtering, pagination patterns
- [shadcn/ui Dark Mode (Next.js)](https://ui.shadcn.com/docs/dark-mode/next) -- next-themes setup, ThemeProvider, suppressHydrationWarning
- [Next.js App Router docs](https://nextjs.org/docs/app) -- Server Components, Server Actions, revalidatePath, route structure
- [Next.js Server Actions guide](https://nextjs.org/docs/app/getting-started/updating-data) -- form handling, FormData, revalidation
- npm registry (2026-03-06) -- all version numbers verified live

### Secondary (MEDIUM confidence)
- [Setting Up Next.js 15 with shadcn & Tailwind CSS v4 + Dark Mode](https://dev.to/darshan_bajgain/setting-up-2025-nextjs-15-with-shadcn-tailwind-css-v4-no-config-needed-dark-mode-5kl) -- Tailwind v4 CSS-native config, shadcn init process
- [Next.js 15 & 16: The Complete App Router Guide](https://www.codercops.com/blog/nextjs-15-16-app-router-guide) -- Server Actions, Server Components, Cache Components
- [react-hook-form with useActionState and Next.js 15](https://markus.oberlehner.net/blog/using-react-hook-form-with-react-19-use-action-state-and-next-js-15-app-router) -- integration pattern between RHF and Server Actions
- [Framer Motion page transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router) -- difficulties with AnimatePresence in App Router; recommends CSS transitions for simple cases

### Tertiary (LOW confidence)
- [better-sqlite3 + Next.js Server Actions compatibility](https://github.com/ncrmro/nextjs-sqlite) -- example project using SQLite with App Router; synchronous API works in Server Actions (needs validation in this project's specific setup)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified on npm, well-documented patterns
- Architecture: HIGH -- Server Components + Server Actions + Drizzle + better-sqlite3 is a proven pattern for local-first Next.js apps
- Pitfalls: HIGH -- SQLite singleton, WAL mode, revalidatePath are well-documented failure modes
- UI patterns: HIGH -- shadcn/ui + TanStack Table data table pattern has official documentation with exact code examples
- Framer Motion with App Router: MEDIUM -- page transitions are fragile; recommend CSS transitions for Phase 1

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable ecosystem, 30-day validity)
