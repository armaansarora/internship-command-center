# Architecture Research

**Domain:** Local-first personal dashboard with AI integration (job application tracker + cover letter engine)
**Researched:** 2026-03-06
**Confidence:** HIGH (core patterns), MEDIUM (AI pipeline specifics)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React)                                │
├──────────────┬───────────────────┬───────────────────────────────────┤
│  Dashboard   │  Application List  │   Application Detail / Cover      │
│  (Attention  │  (Sortable table,  │   Letter Generator                │
│   Panel)     │   quick-add)       │   (Streaming SSE output)          │
└──────┬───────┴────────┬──────────┴────────────────┬──────────────────┘
       │                │                            │
       │         HTTP / fetch                       SSE stream
       │                │                            │
┌──────┴────────────────┴────────────────────────────┴──────────────────┐
│                     NEXT.JS SERVER (Node.js)                           │
├──────────────────────────────────────────────────────────────────────┤
│  Route Handlers                                                        │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────────┐  │
│  │ /api/apps    │  │ /api/apps/[id] │  │ /api/cover-letter/stream │  │
│  │ GET, POST,   │  │ GET, PATCH,    │  │  POST → SSE              │  │
│  │ PATCH        │  │ DELETE         │  │  (long-running)          │  │
│  └──────┬───────┘  └───────┬────────┘  └───────────┬──────────────┘  │
│         │                  │                        │                  │
├─────────┴──────────────────┴────────────────────────┴─────────────────┤
│  Service Layer                                                         │
│  ┌──────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │  ApplicationSvc  │  │  ResearchService   │  │  CoverLetterSvc  │  │
│  │  (CRUD, status,  │  │  (Tavily search,   │  │  (prompt build,  │  │
│  │   follow-up)     │  │   cache, extract)  │  │   Claude call,   │  │
│  └──────┬───────────┘  └────────┬───────────┘  │   stream)        │  │
│         │                       │               └────────┬─────────┘  │
├─────────┴───────────────────────┴────────────────────────┴────────────┤
│  Data Layer                                                            │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐  │
│  │  db.ts (better-sqlite3)  │  │  resume.ts (static, in-memory)   │  │
│  │  Drizzle ORM + Singleton │  │  Armaan's resume facts + style   │  │
│  └──────────────────────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
       │
       │  fs (local file)
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  internships.db  (SQLite file, local disk)                            │
└──────────────────────────────────────────────────────────────────────┘

External services (outbound calls from server only):
  ┌────────────────────┐     ┌──────────────────────────┐
  │   Tavily API       │     │   Anthropic Claude API   │
  │   (research)       │     │   (cover letter gen)     │
  └────────────────────┘     └──────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Dashboard (UI) | Show urgent items — interviews, stale leads, overdue follow-ups. Primary entry point. | React Server Component or Client Component with SWR polling |
| Application List (UI) | Sortable, filterable table of all 100+ applications | Client Component with local state, server fetch on mount |
| Application Detail (UI) | Rich company view, status editor, research display, cover letter trigger | Client Component, lazy-loaded |
| Cover Letter Panel (UI) | Streaming output display, copy/export actions | Client Component with SSE reader |
| Route Handlers | REST endpoints for CRUD and streaming AI pipeline | Next.js App Router `route.ts` files |
| ApplicationService | Business logic: status transitions, follow-up scheduling, attention scoring | Plain TypeScript module, called by route handlers |
| ResearchService | Tavily API calls, cache lookup, result extraction | Async module with in-DB cache |
| CoverLetterService | Build prompt from resume + research + job context, stream Claude response | Async generator, consumed by streaming route |
| db.ts | Single SQLite connection via better-sqlite3, Drizzle schema | Singleton exported module |
| resume.ts | Armaan's resume facts as typed constants (never changes) | Static TypeScript file, imported by CoverLetterService |

## Recommended Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Dashboard (attention panel)
│   ├── applications/
│   │   ├── page.tsx              # Application list view
│   │   └── [id]/
│   │       └── page.tsx          # Application detail view
│   └── api/
│       ├── apps/
│       │   ├── route.ts          # GET all, POST new
│       │   └── [id]/
│       │       └── route.ts      # GET, PATCH, DELETE one
│       ├── cover-letter/
│       │   └── stream/
│       │       └── route.ts      # POST → SSE streaming
│       └── research/
│           └── route.ts          # POST → company research
├── components/
│   ├── dashboard/
│   │   ├── AttentionPanel.tsx    # Urgent items list
│   │   ├── AttentionCard.tsx     # Single urgency card
│   │   └── FollowUpQueue.tsx     # Follow-up reminders
│   ├── applications/
│   │   ├── AppTable.tsx          # Sortable table
│   │   ├── AppRow.tsx            # Table row
│   │   ├── QuickAdd.tsx          # Fast new app form
│   │   └── StatusBadge.tsx       # Visual status indicator
│   ├── detail/
│   │   ├── CompanyPanel.tsx      # Research display
│   │   └── StatusEditor.tsx      # Edit status inline
│   └── cover-letter/
│       ├── GeneratorForm.tsx     # Trigger + inputs
│       └── StreamingOutput.tsx   # SSE reader + display
├── services/
│   ├── applications.ts           # CRUD, attention scoring, follow-up logic
│   ├── research.ts               # Tavily calls + cache
│   └── cover-letter.ts           # Prompt builder + Claude streaming
├── db/
│   ├── index.ts                  # Singleton better-sqlite3 instance
│   ├── schema.ts                 # Drizzle schema definitions
│   ├── migrations/               # SQL migration files
│   └── seed.ts                   # Seeds 71+ pre-existing applications
├── lib/
│   ├── resume.ts                 # Armaan's resume facts (typed constants)
│   ├── prompts.ts                # Cover letter system prompt template
│   └── utils.ts                  # Date helpers, formatters
└── types/
    └── index.ts                  # Application, Company, FollowUp types
```

### Structure Rationale

- **app/api/**: All external API calls (Tavily, Claude) live server-side only. API keys never touch the client. Route handlers are the only public surface.
- **services/**: Business logic extracted from route handlers so it's testable and reusable. Route handlers stay thin (parse input → call service → serialize output).
- **db/**: Isolated data layer. Nothing outside `db/` touches SQLite directly — services call `db` exports. This keeps migration clean.
- **lib/resume.ts**: Resume facts as typed constants, not a database record. This data never changes and importing it statically is safer than a DB query (no fabrication risk).
- **components/**: Co-located with their domain, not feature-agnostic. `AttentionPanel` knows what it shows. This is a personal tool, not a design system.

## Architectural Patterns

### Pattern 1: Server-Side AI Pipeline with SSE Streaming

**What:** Cover letter generation happens entirely server-side. Route handler calls ResearchService (Tavily), then CoverLetterService (Claude), and streams the response token-by-token as Server-Sent Events back to the browser.

**When to use:** Any AI generation that takes 5-30 seconds. Streaming prevents the UI from appearing frozen and lets the user see progress.

**Trade-offs:** SSE is simpler than WebSockets for one-directional streaming. The main risk is Next.js App Router edge runtime not supporting better-sqlite3 (native Node module) — keep the cover letter route as Node runtime, not edge.

**Example:**
```typescript
// app/api/cover-letter/stream/route.ts
export const runtime = 'nodejs'; // NOT 'edge' — better-sqlite3 is native

export async function POST(req: Request) {
  const { applicationId } = await req.json();

  // 1. Load application + fetch research
  const app = ApplicationService.getById(applicationId);
  const research = await ResearchService.fetchCompanyResearch(app.company);

  // 2. Build prompt
  const prompt = buildCoverLetterPrompt({ app, research, resume: RESUME_FACTS });

  // 3. Stream Claude response as SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const claudeStream = await anthropic.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      for await (const chunk of claudeStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const data = JSON.stringify({ type: 'text', text: chunk.delta.text });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      }
      controller.enqueue(encoder.encode(`data: {"type":"done"}\n\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

### Pattern 2: SQLite Singleton with better-sqlite3

**What:** A single synchronous SQLite connection shared across all server requests in the process. Protected with a `globalThis` guard to survive hot reload in development.

**When to use:** Always, for local-first apps using better-sqlite3. Multiple connections to the same SQLite file serialize anyway — one connection keeps it simple.

**Trade-offs:** Synchronous API is fine for a single-user tool. The main risk is WAL mode not being enabled (defaults to journal mode, slower for concurrent reads). Enable WAL on startup.

**Example:**
```typescript
// db/index.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DB_PATH = process.env.DB_PATH || './internships.db';

declare global {
  var __db: ReturnType<typeof Database> | undefined;
}

const sqlite = globalThis.__db ?? new Database(DB_PATH);
if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = sqlite;
}

// Enable WAL mode for better read concurrency
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
```

### Pattern 3: Attention Scoring Service

**What:** A pure function that computes "urgency" for each application based on status, tier, and dates. The dashboard queries this to show what needs attention now.

**When to use:** Any dashboard with a priority concept. Keeps the UI dumb — it just renders what the service says is urgent.

**Trade-offs:** Score logic must be dead simple and transparent. Opaque scoring erodes trust. Keep it rule-based, not ML.

**Example:**
```typescript
// services/applications.ts
export function computeAttentionScore(app: Application, now: Date): AttentionItem | null {
  const daysSinceApplied = daysDiff(app.appliedAt, now);

  // Interview pending = always top priority
  if (app.status === 'interview' && !app.interviewDate) {
    return { app, reason: 'Interview pending — schedule now', urgency: 'critical' };
  }

  // Warm lead going cold (tier 1 or 2, no contact in 7 days)
  if (['T1', 'T2'].includes(app.tier) && app.status === 'in_progress' && daysSinceApplied > 7) {
    return { app, reason: `Warm lead — ${daysSinceApplied}d without contact`, urgency: 'high' };
  }

  // Follow-up overdue
  if (app.followUpDue && new Date(app.followUpDue) < now) {
    return { app, reason: 'Follow-up overdue', urgency: 'medium' };
  }

  return null;
}
```

### Pattern 4: Research Cache in SQLite

**What:** Company research from Tavily is stored in a `company_research` table keyed by company name + timestamp. Before calling Tavily, check the cache. If fresh (< 24h), return cached data.

**When to use:** Any external API with rate limits or cost-per-call. Tavily's free tier is 1,000 searches/month — caching prevents burning credits on repeated lookups for the same company.

**Trade-offs:** Cache staleness is acceptable for company research (a company's background doesn't change daily). Add a manual "refresh" button for cover letter generation if needed.

## Data Flow

### Request Flow: Dashboard Load

```
User opens app
    ↓
GET /  (Next.js Server Component OR client fetch to /api/apps)
    ↓
ApplicationService.getAll() → DB query for all apps
ApplicationService.computeAttention(apps) → filter + score
    ↓
JSON response → React renders AttentionPanel + AppTable
    ↓
Dashboard visible in < 200ms (SQLite is in-process, no network)
```

### Request Flow: Cover Letter Generation

```
User clicks "Generate Cover Letter" on application detail page
    ↓
POST /api/cover-letter/stream { applicationId }
    ↓
[Server] ApplicationService.getById() → app record from SQLite
[Server] ResearchService.fetchCompanyResearch(company)
    ├─ Check SQLite cache (company_research table)
    ├─ Cache HIT → return cached data (< 1ms)
    └─ Cache MISS → Tavily API call (~800ms) → save to cache → return
    ↓
[Server] buildCoverLetterPrompt({ app, research, resume: RESUME_FACTS })
    ↓
[Server] anthropic.messages.stream({ ... }) → Claude API call
    ↓
[Server → Client] SSE stream, token by token (~5-15 seconds)
    ↓
[Client] StreamingOutput component updates as tokens arrive
    ↓
[Client] "Done" event → enable copy/export buttons
```

### Request Flow: Add New Application

```
User fills QuickAdd form
    ↓
POST /api/apps { company, role, tier, status }
    ↓
ApplicationService.create() → INSERT into SQLite
    ↓
200 response → client invalidates app list → refetch
    ↓
New app appears in table
```

### State Management

```
Server (SQLite) — source of truth for all application data
    ↓
Route handlers — serialize data to JSON
    ↓
React components — render from props/fetched data
    ↓
User actions → API calls → DB mutations → re-fetch (optimistic UI optional)
```

No global client state store (Redux, Zustand) needed. Each page fetches its own data. React Query or SWR can be added for caching/refetching on the client side but is not required initially.

### Key Data Flows

1. **Attention computation:** Runs on server at request time (not stored). Applications come from DB, attention scores are computed in-memory per request. Fresh every load.
2. **Company research:** Flows Tavily → `company_research` DB table → ResearchService → route handler → client. Cache is the DB, not in-memory.
3. **Cover letter generation:** Flows DB + Tavily cache + RESUME_FACTS static file → Claude API → SSE stream → browser. Nothing stored back to DB by default (user copies manually).
4. **Status updates:** Flow UI → PATCH /api/apps/[id] → DB update → client re-renders with new data.

## Scaling Considerations

This is a single-user, local-first tool. Scaling is not a real concern in v1. But the architecture is migration-friendly:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Local, 1 user | better-sqlite3 directly, no server needed beyond Next.js dev server |
| Deployed (personal VPS/Railway) | SQLite on persistent volume, keep everything else same |
| Multi-user (future) | Swap SQLite for Turso (libSQL, same API) or Postgres; add session auth |

### Scaling Priorities

1. **First bottleneck:** Claude API latency (~5-15s per cover letter). Fix: streaming already solves perceived latency. No architectural change needed.
2. **Second bottleneck (if deployed):** Tavily rate limits (1000/month free tier). Fix: cache aggressively in DB, add manual refresh control.

## Anti-Patterns

### Anti-Pattern 1: Calling Tavily and Claude from the Client

**What people do:** Make API calls to Tavily or Claude directly from React components using fetch.

**Why it's wrong:** Exposes API keys to the browser. Tavily and Claude keys would be visible to anyone who opens DevTools. No caching is possible. Rate limiting is harder.

**Do this instead:** All external API calls go through Next.js route handlers (`/api/*`). Keys stay in environment variables, server-side only. The browser only talks to your own server.

### Anti-Pattern 2: Multiple SQLite Connections in Development

**What people do:** Create `new Database(DB_PATH)` at the top of every service or route handler file.

**Why it's wrong:** Next.js hot-reload creates new module instances on file save. This spawns multiple connections, causing "database is locked" errors and data inconsistency.

**Do this instead:** Single singleton via `globalThis.__db` (see Pattern 2 above). Import `db` from `db/index.ts` everywhere.

### Anti-Pattern 3: Storing Resume Facts in the Database

**What people do:** Put Armaan's education, experience, and GPA in a DB table so it's "editable."

**Why it's wrong:** The cover letter engine must NEVER fabricate or hallucinate facts. Having resume data in a DB increases the risk of it being edited, lost, or fetched incorrectly. It also introduces an async DB read in the hot path of every cover letter generation.

**Do this instead:** `lib/resume.ts` — typed TypeScript constants. Resume facts are compile-time constants that Claude's prompt always receives verbatim. If resume needs updating, it's a code edit with a git commit.

### Anti-Pattern 4: Generating Cover Letters Without Research First

**What people do:** Call Claude directly with just the company name and role, expecting it to "know" the company.

**Why it's wrong:** Claude's training data is 6-18 months stale. For specific internship roles, recent company data (fund focus, recent deals, specific team language) matters. Generic cover letters are what the previous failed attempt produced.

**Do this instead:** Always run ResearchService first. If Tavily fails or returns nothing useful, fall back to the cached pre-researched data for major firms (JPM, Blackstone, Goldman). Never let Claude invent company facts.

### Anti-Pattern 5: Dashboard as a Chart/Analytics Dump

**What people do:** Add conversion rate charts, status pie charts, application velocity graphs.

**Why it's wrong:** Armaan explicitly hates heavy analytics. They add visual noise without informing decisions. A dashboard that shows "34% rejection rate" offers no actionable path forward.

**Do this instead:** Dashboard shows only actionable items. What do I do today? Interviews pending, follow-ups overdue, warm leads going cold. Everything else is accessed through the application list.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic Claude API | Server-side only, `@anthropic-ai/sdk`, streaming via SSE | Use `claude-opus-4-6` for quality; cache is the cover letter itself (user copies) |
| Tavily API | Server-side only, `@tavily/core`, async/await | 1000 req/month free; aggressive SQLite caching mandatory |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ Route Handlers | HTTP (fetch/SSE) | JSON for CRUD, SSE for streaming |
| Route Handlers ↔ Services | Direct TypeScript function calls | No message queue needed for single-user |
| Services ↔ Database | Drizzle ORM queries via `db` singleton | All synchronous (better-sqlite3 is sync) |
| CoverLetterService ↔ Resume | Static import from `lib/resume.ts` | Compile-time constant, no runtime DB read |
| ResearchService ↔ Cache | Read/write to `company_research` SQLite table | SQLite is the cache store |

## Build Order (Dependencies)

```
Phase 1: Data foundation
  └─ db/schema.ts + db/index.ts (SQLite connection, WAL mode)
  └─ db/seed.ts (71 pre-existing applications)
  └─ types/index.ts (Application, Status, Tier types)

Phase 2: Core CRUD
  └─ services/applications.ts (getAll, getById, create, update)
  └─ app/api/apps/ route handlers
  └─ Basic application list UI (AppTable.tsx)

Phase 3: Dashboard (attention logic)
  └─ computeAttentionScore() in applications.ts
  └─ AttentionPanel.tsx + AttentionCard.tsx
  └─ Dashboard page pulling attention items

Phase 4: Research pipeline
  └─ services/research.ts (Tavily call + cache read/write)
  └─ app/api/research/ route handler
  └─ CompanyPanel.tsx showing research in detail view

Phase 5: Cover letter engine
  └─ lib/resume.ts (Armaan's facts as typed constants)
  └─ lib/prompts.ts (system prompt template)
  └─ services/cover-letter.ts (prompt builder + Claude stream)
  └─ app/api/cover-letter/stream/ route handler
  └─ StreamingOutput.tsx + GeneratorForm.tsx

Phase 6: Follow-up system
  └─ Follow-up scheduling logic in applications.ts
  └─ FollowUpQueue.tsx on dashboard
```

Each phase has no upstream dependencies on later phases. Phase 5 (cover letter) depends on Phase 4 (research) and Phase 2 (CRUD for application data). Everything else is independent.

## Sources

- [Claude API Streaming Docs](https://platform.claude.com/docs/en/build-with-claude/streaming) — official SSE event structure and TypeScript SDK usage (HIGH confidence)
- [Claude Streaming with Next.js Edge Runtime](https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7) — production streaming architecture pattern (MEDIUM confidence)
- [Tavily API Documentation](https://docs.tavily.com/documentation/about) — API capabilities, rate limits, JS package (HIGH confidence)
- [Next.js SQLite Singleton Pattern](https://github.com/ncrmro/nextjs-sqlite) — App Router + Server Components + Kysely (MEDIUM confidence)
- [Next.js Singleton Issue Discussion](https://github.com/vercel/next.js/issues/65350) — hot reload singleton challenges in App Router (MEDIUM confidence)
- [Local-First Architecture 2026](https://dev.to/the_nortern_dev/the-architecture-shift-why-im-betting-on-local-first-in-2026-1nh6) — local-first pattern rationale (MEDIUM confidence)
- [Dashboard Information Architecture Principles](https://medium.com/gooddata-developers/six-principles-of-dashboards-information-architecture-5487d84c20c4) — attention-first dashboard design (MEDIUM confidence)

---
*Architecture research for: local-first personal dashboard with AI integration (internship tracker + cover letter engine)*
*Researched: 2026-03-06*
