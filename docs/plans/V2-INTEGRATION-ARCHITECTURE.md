# V2 Integration Architecture & Prioritization
## How to Eat the Elephant: One Bite at a Time
### March 11, 2026

---

## The Problem

We have 40+ tools, APIs, libraries, and services researched. Taking them all in at once is impossible and unnecessary. The key is understanding **which ones are load-bearing walls and which are furniture.**

---

## The Three Categories

### Category 1: THE SKELETON (Must Have — The App Doesn't Work Without These)
These are structural. They define how the app works at a fundamental level. Install first, never remove.

### Category 2: THE ORGANS (Should Have — Makes the App Alive)
These give the app its intelligence and capability. Added in phases as each department comes online.

### Category 3: THE POLISH (Nice to Have — Makes the App Breathtaking)
These make it feel premium. Added last, incrementally, when the core is solid.

---

## Category 1: THE SKELETON

These get installed in Phase 0 and never change.

### Design System Foundation
```
shadcn/ui          → Component primitives (every UI element)
Tailwind CSS v4    → Styling (every class)
Motion             → Animations (every transition)
next/font          → Typography (Playfair + Inter + JetBrains Mono)
Lucide             → Icons
tailwind-merge     → Class conflict resolution
clsx + CVA         → Conditional & variant styling
tw-animate-css → Animation utilities
```

### Data Layer
```
Turso (libSQL)     → Database (already in place)
Drizzle ORM        → Type-safe SQL queries (npm install drizzle-orm drizzle-kit)
Turso Vectors      → Semantic search (built into same DB)
Auth.js            → Authentication (already in place)
```

### Agent Infrastructure
```
Vercel AI SDK v4.x → Agent runtime (generateText, streamText, generateObject, tool loops)
Inngest            → Background job orchestration (event-driven, durable steps)
```

### Deployment
```
Vercel             → Hosting (already in place)
Next.js 16         → Framework (already in place)
```

**Why these are skeleton:** Remove any one and the app either can't render, can't think, or can't run. They are the frame of the building.

### Architecture Diagram: How the Skeleton Connects

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL (Host)                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               NEXT.JS 16 (Framework)                  │   │
│  │                                                       │   │
│  │  ┌─────────────┐     ┌──────────────────────────┐   │   │
│  │  │   FRONTEND   │     │        API ROUTES         │   │   │
│  │  │              │     │                           │   │   │
│  │  │ shadcn/ui    │     │  Vercel AI SDK v4.x       │   │   │
│  │  │ Tailwind v4  │ ←→  │  (Agent runtime)          │   │   │
│  │  │ Motion       │ SSE │                           │   │   │
│  │  │ next/font    │     │  Auth.js                  │   │   │
│  │  └─────────────┘     │  (Session management)     │   │   │
│  │                       └──────────┬───────────────┘   │   │
│  └──────────────────────────────────┼───────────────────┘   │
│                                      │                       │
│  ┌──────────────────────────────────┼───────────────────┐   │
│  │              INNGEST (Background Jobs)                │   │
│  │                                                       │   │
│  │  Event Bus → Agent Functions → Durable Steps         │   │
│  │  (CEO dispatches → C-suite executes → Workers run)   │   │
│  └──────────────────────────────────┼───────────────────┘   │
│                                      │                       │
└──────────────────────────────────────┼───────────────────────┘
                                       │
                              ┌────────┴────────┐
                              │   TURSO (DB)     │
                              │                  │
                              │  Relational data │
                              │  Vector search   │
                              │  Agent memory    │
                              └─────────────────┘
```

---

## Category 2: THE ORGANS

These are added **per-department** as each C-suite agent comes online. You don't install them all at once — you install them when their department needs them.

### Department → Required Integrations Map

```
DEPARTMENT          INTEGRATIONS NEEDED              WHEN TO ADD
─────────────────────────────────────────────────────────────────

CEO Agent           Vercel AI SDK (already in skeleton)  Phase 1
                    Inngest (already in skeleton)

CIO (Research)      Firecrawl ($16/mo)                   Phase 2
                    SEC EDGAR API (free)
                    FRED API (free)
                    Tavily (for search)

COO (Email/Cal)     Gmail API (free, already started)    Phase 2
                    Google Calendar API (free, started)
                    Resend (free 3K/mo)

CRO (Pipeline)      JSearch API (free tier)              Phase 2
                    Lever API (free)
                    Greenhouse API (free)
                    Adzuna API (free, secondary source)

CMO (Outreach)      Google Docs API (free)               Phase 3
                    @react-pdf/renderer (free)
                    Novel/Tiptap (free) - rich text

CPO (Interview)     No NEW integrations                  Phase 3
                    (uses CIO research data + AI SDK)

CNO (Network)       Apollo.io (free tier)                Phase 3
                    Hunter.io (free 25/mo)
                    People Data Labs (free 100/mo)

CFO (Analytics)     Nivo charts (free)                   Phase 4
                    (uses existing Turso data)
```

### Integration Order (Why This Sequence)

**Phase 2 goes first because CIO + COO + CRO are the "input" departments.** They bring data INTO the system:
- CIO brings company intelligence
- COO brings email/calendar data
- CRO brings job opportunities

**Phase 3 goes second because CMO + CPO + CNO are the "output" departments.** They use data FROM other departments:
- CMO needs CIO research to write cover letters
- CPO needs CIO research to build prep packets
- CNO needs CRO pipeline data to prioritize networking

**Phase 4 goes last because CFO analyzes everything.** It needs all departments running to have data worth analyzing.

### How Departments Share Data

All inter-department communication goes through Turso. No direct agent-to-agent calls.

```
┌───────────────────────────────────────────────────────┐
│                    TURSO DATABASE                      │
│                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ applications │  │  companies   │  │   contacts   │ │
│  │              │  │              │  │              │ │
│  │ CRO writes   │  │ CIO writes   │  │ CNO writes   │ │
│  │ COO updates  │  │ Everyone     │  │ COO enriches │ │
│  │ CMO reads    │  │ reads        │  │ CMO reads    │ │
│  └─────────────┘  └──────────────┘  └──────────────┘ │
│                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   emails    │  │  documents   │  │ agent_logs   │ │
│  │              │  │              │  │              │ │
│  │ COO writes   │  │ CMO writes   │  │ All write    │ │
│  │ CEO reads    │  │ CPO writes   │  │ CEO reads    │ │
│  │ CMO reads    │  │ You read     │  │ You read     │ │
│  └─────────────┘  └──────────────┘  └──────────────┘ │
│                                                        │
│  ┌─────────────┐  ┌──────────────┐                    │
│  │   vectors   │  │  analytics   │                    │
│  │              │  │              │                    │
│  │ CIO writes   │  │ CFO writes   │                    │
│  │ All query    │  │ You read     │                    │
│  └─────────────┘  └──────────────┘                    │
└───────────────────────────────────────────────────────┘
```

### Inngest Event Flow (How Agents Trigger Each Other)

```
User clicks "Ring the Bell"
  → inngest.send("bell/ring")
    → CEO function receives event
      → inngest.send("ceo/dispatch-all")

"ceo/dispatch-all" triggers IN PARALLEL:
  → "cio/refresh-research"     (CIO refreshes company data)
  → "coo/scan-inbox"           (COO scans Gmail)
  → "cro/scan-job-boards"      (CRO searches for new roles)
  → "cno/recalculate-warmth"   (CNO updates contact warmth)

Each department function runs as durable steps:
  step.run("fetch-emails", async () => { ... })
  step.run("classify-emails", async () => { ... })
  step.run("update-database", async () => { ... })
  step.run("notify-ceo", async () => { ... })

When all departments report back:
  → "ceo/compile-briefing" event fires
  → CEO synthesizes results into Morning Memo
  → UI updates via SSE
```

---

## Category 3: THE POLISH

These make the app breathtaking but the app WORKS without them. Add after Phases 1-4 are solid.

### Animation Polish (Phase 5A)
```
GSAP + @gsap/react     → Gold seal stamp, typewriter effects, SVG draw
Magic UI components     → Animated number tickers, shimmer effects, particles
Aceternity UI           → Aurora background, spotlight effect, 3D card hover
Lottie React            → Empty state illustrations, success animations
Embla Carousel          → Mobile swipeable cards
```

### Premium Icons & Typography (Phase 5B)
```
@phosphor-icons/react   → Duotone sidebar icons (adds depth)
Playfair Display 2.0    → Variable font with optical sizing
```

### Sound Design (Phase 5C)
```
Howler.js or Tone.js    → Paper rustle, stamp sound, notification chime
(toggleable — off by default)
```

### 3D Visualizations (Phase 5D — Optional)
```
Three.js + R3F + Drei   → 3D agent network graph on Floor B1
(Heavy — lazy-load, only on Agent Operations page)
```

### Dev Tools & Quality (Phase 5E)
```
Storybook               → Component documentation & isolation
Chromatic                → Visual regression testing
Style Dictionary        → Design token build system
PostHog                 → Analytics + session replay
Sentry                  → Already installed (@sentry/nextjs) — add agent-specific error tags in Phase 1
```

---

## The Integration Checklist

For EVERY integration, before it enters the codebase, answer:

```
┌─────────────────────────────────────────────────────────┐
│  INTEGRATION CHECKLIST                                   │
│                                                          │
│  □ Which department owns this?                           │
│  □ What data does it produce?                            │
│  □ What data does it consume?                            │
│  □ Where does its data live in Turso?                    │
│  □ What Inngest event triggers it?                       │
│  □ What Inngest event does it emit when done?            │
│  □ Does it need an API key? Where is it stored? (.env)   │
│  □ What's the free tier limit? When do we hit it?        │
│  □ What happens when it fails? (retry? fallback? skip?)  │
│  □ Does it need a UI surface? Which floor?               │
│  □ Is it lazy-loadable or always needed?                 │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure for Integrations

Every external service gets a wrapper in a consistent location:

```
src/
├── lib/
│   ├── integrations/           # External service wrappers
│   │   ├── firecrawl.ts        # Firecrawl client
│   │   ├── jsearch.ts          # JSearch API client
│   │   ├── lever.ts            # Lever Postings API
│   │   ├── greenhouse.ts       # Greenhouse Job Board API
│   │   ├── sec-edgar.ts        # SEC EDGAR API
│   │   ├── fred.ts             # FRED economic data
│   │   ├── apollo.ts           # Apollo.io enrichment
│   │   ├── hunter.ts           # Hunter.io email finder
│   │   ├── resend.ts           # Resend email sending
│   │   ├── tavily.ts           # Tavily search
│   │   ├── adzuna.ts           # Adzuna job search (secondary)
│   │   ├── novu.ts             # Novu notification routing
│   │   └── pdl.ts              # People Data Labs enrichment
│   │
│   ├── agents/                 # Agent definitions
│   │   ├── ceo/
│   │   │   ├── agent.ts        # CEO agent definition (AI SDK)
│   │   │   ├── tools.ts        # CEO's available tools
│   │   │   └── prompts.ts      # CEO system prompt
│   │   ├── cio/
│   │   │   ├── agent.ts
│   │   │   ├── tools.ts
│   │   │   ├── prompts.ts
│   │   │   └── workers/
│   │   │       ├── web-scraper.ts
│   │   │       ├── news-analyst.ts
│   │   │       ├── culture-analyst.ts
│   │   │       └── deal-tracker.ts
│   │   ├── coo/
│   │   ├── cro/
│   │   ├── cmo/
│   │   ├── cpo/
│   │   ├── cno/
│   │   └── cfo/
│   │
│   ├── inngest/                # Background job definitions
│   │   ├── client.ts           # Inngest client
│   │   ├── functions/
│   │   │   ├── bell-ring.ts    # "Ring the Bell" orchestration
│   │   │   ├── cio-research.ts
│   │   │   ├── coo-scan.ts
│   │   │   ├── cro-discover.ts
│   │   │   ├── cmo-draft.ts
│   │   │   ├── cpo-prep.ts
│   │   │   ├── cno-enrich.ts
│   │   │   └── cfo-analyze.ts
│   │   └── events.ts           # Event type definitions
│   │
│   ├── db/                     # Database layer
│   │   ├── schema.ts           # Turso/Drizzle schema
│   │   ├── queries/            # Typed query functions
│   │   └── vectors.ts          # Vector search utilities
│   │
│   └── design/                 # Design system
│       ├── tokens.ts           # Color, typography, spacing tokens
│       ├── animations.ts       # Shared animation configs
│       └── theme.css           # Tailwind v4 @theme block
│
├── components/
│   ├── ui/                     # shadcn components (auto-managed)
│   ├── boardroom/              # Custom Boardroom components
│   │   ├── gold-seal.tsx       # The AA stamp animation
│   │   ├── morning-memo.tsx    # CEO briefing card
│   │   ├── glass-card.tsx      # Glassmorphic card base
│   │   ├── elevator-nav.tsx    # Sidebar navigation
│   │   ├── intercom.tsx        # Command palette wrapper
│   │   ├── status-dot.tsx      # Agent status indicator
│   │   └── tier-badge.tsx      # T1/T2/T3/T4 gradient badges
│   └── charts/                 # Nivo chart wrappers
│
├── app/
│   ├── (auth)/                 # Auth routes
│   ├── (dashboard)/            # Dashboard layout group
│   │   ├── layout.tsx          # Sidebar + topbar + ambient bg
│   │   ├── page.tsx            # Floor 90 — Dashboard
│   │   ├── pipeline/           # Floor 85
│   │   ├── research/           # Floor 80
│   │   ├── communications/     # Floor 75
│   │   ├── preparation/        # Floor 70
│   │   ├── network/            # Floor 65
│   │   ├── cover-letters/      # Floor 60
│   │   ├── analytics/          # Floor 55
│   │   └── agents/             # Floor B1
│   └── api/
│       ├── inngest/            # Inngest webhook endpoint
│       ├── agents/             # Agent API routes
│       └── integrations/       # Integration webhook handlers
```

---

## Environment Variables Organization

```env
# === SKELETON (always needed) ===
TURSO_DATABASE_URL=               # Turso
TURSO_AUTH_TOKEN=                 # Turso
AUTH_SECRET=                      # Auth.js
AUTH_GOOGLE_ID=                   # Google OAuth
AUTH_GOOGLE_SECRET=               # Google OAuth
ANTHROPIC_API_KEY=                # Claude (agents)
OPENAI_API_KEY=                   # OpenAI text-embedding-3-small (embeddings ONLY)
INNGEST_EVENT_KEY=                # Inngest
INNGEST_SIGNING_KEY=              # Inngest

# === PHASE 2: INPUT DEPARTMENTS ===
# CIO
FIRECRAWL_API_KEY=                # Firecrawl ($16/mo after free tier)
TAVILY_API_KEY=                   # Tavily search
FRED_API_KEY=                     # FRED economic data (free)
# SEC EDGAR needs no key (just User-Agent header)

# COO (Gmail/Calendar already via Google OAuth)
RESEND_API_KEY=                   # Resend email sending

# CRO
JSEARCH_API_KEY=                  # RapidAPI JSearch
ADZUNA_APP_ID=                    # Adzuna job search
ADZUNA_API_KEY=                   # Adzuna job search
# Lever and Greenhouse need no keys (public APIs)

# === PHASE 3: OUTPUT DEPARTMENTS ===
# CMO (uses Google Docs API via existing OAuth)

# CNO
APOLLO_API_KEY=                   # Apollo.io enrichment
HUNTER_API_KEY=                   # Hunter.io email finder
PDL_API_KEY=                      # People Data Labs

# === PHASE 1: NOTIFICATIONS (agents need these from Phase 2 onward) ===
NOVU_API_KEY=                     # Novu notification routing (or self-hosted secret)
NEXT_PUBLIC_NOVU_APP_ID=          # Novu in-app notification center (client-side)
SLACK_WEBHOOK_URL=                # Slack push notifications
DISCORD_WEBHOOK_URL=              # Discord push notifications (alternative to Slack)

# === PHASE 5: POLISH ===
NEXT_PUBLIC_POSTHOG_KEY=          # PostHog analytics
SENTRY_DSN=                       # Sentry error tracking
```

---

## Decision: What We DON'T Use (and Why)

| Rejected | Reason |
|----------|--------|
| LinkedIn API | Too restricted for individual developers. No messaging/connection API. |
| Proxycurl | Shut down (sued by LinkedIn Jan 2026) |
| Crunchbase API | Too expensive ($1000s/year). Apollo.io covers similar data for free. |
| Clearbit/Breeze | Acquired by HubSpot, locked into their ecosystem. Expensive. |
| Glassdoor API | Closed to new developers. |
| Handshake API | Institution-only, not available to individual students. |
| Temporal | Enterprise-grade orchestration — overkill. Inngest is simpler. |
| LangChain | Python-first, TypeScript API lags. Vercel AI SDK is native. |
| CrewAI | Python-only. |
| Pusher / Ably | SSE is free and Vercel-native. No third-party realtime service needed. |
| Puppeteer | Firecrawl handles scraping better for AI use cases. |
| SendGrid | Resend has better DX and React Email integration. |
| Knock | $250/mo minimum for paid. Novu is free (MIT). |
| LogRocket | Overkill for single-user. PostHog covers it. |

---

## The Golden Rule

**Every integration must justify itself by answering: "Which department needs this to do its job?"**

If an integration doesn't map to a specific department's workflow, it doesn't get added. If two integrations do the same thing, keep the one that's:
1. Cheaper (free > paid)
2. Simpler (fewer dependencies)
3. More native (TypeScript > Python wrapper)
4. Better documented

---

## Summary: What Gets Installed When

### Phase 0 (Foundation): 14 packages
```
shadcn/ui, Tailwind v4, Motion, next/font, Lucide,
tailwind-merge, clsx, CVA, tw-animate-css,
Vercel AI SDK, Inngest, Drizzle ORM + drizzle-kit,
Mastra (@mastra/core), cmdk (via shadcn)
```

### Phase 1 (Agent Infra): 0 new packages
```
(Uses AI SDK + Inngest from Phase 0)
```

### Phase 2 (Input Departments): 5 new integrations
```
Firecrawl, JSearch, Resend, SEC EDGAR (no package), FRED (no package)
```

### Phase 3 (Output Departments): 4 new integrations
```
@react-pdf/renderer, Novel, Apollo.io client, Hunter.io client
```

### Phase 4 (Analytics): 1 new package
```
Nivo (charts)
```

### Phase 2 (Input Departments): Also add UI packages for their floors
```
TanStack Table    → Pipeline table view (Floor 85, built in Phase 2-4)
Sonner            → Toast notifications (used globally from Phase 2 onward)
```

### Phase 3 (Output Departments): Also add
```
Novel/Tiptap      → Rich text editing (cover letters, outreach drafts)
```

### Phase 4 (Dashboard & Pipeline): Also add
```
dnd-kit           → Kanban board view (Floor 85 board mode)
Embla Carousel    → Mobile dashboard swipeable cards
Vaul              → Mobile drawers (replaces modals on mobile)
Nivo              → Charts (Floor 55 analytics)
```

### Phase 5 (Polish): Variable
```
GSAP, Magic UI components, Aceternity UI components,
Phosphor Icons, Storybook, Chromatic, PostHog
(Added incrementally as each page gets its final polish)
(Sentry already installed — add agent-specific error tags in Phase 1)
```

**You never install more than 5 new things at once.** Each phase is digestible.

---

## Turso Database Schema Design

Every table serves a specific department. The schema is designed so departments READ from each other's tables but only WRITE to their own.

### Core Tables

```sql
-- ============================================
-- SKELETON: Core tables (exist from V1, evolve)
-- ============================================

-- Applications table (CRO owns, COO updates, CMO/CPO/CFO read)
CREATE TABLE applications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT REFERENCES companies(id),
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'discovered',
    -- discovered → applied → screening → interview_scheduled
    -- → interviewing → under_review → offer → accepted/rejected/withdrawn
  tier INTEGER NOT NULL DEFAULT 3, -- 1=Gold, 2=Silver, 3=Bronze, 4=Iron
  source TEXT, -- 'jsearch', 'lever', 'greenhouse', 'manual', 'cro_scout'
  source_url TEXT,
  applied_at TEXT, -- ISO timestamp
  last_activity_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Companies table (CIO owns, everyone reads)
CREATE TABLE companies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  domain TEXT, -- company website domain
  industry TEXT,
  sector TEXT,
  size TEXT, -- 'startup', 'mid', 'large', 'enterprise'
  headquarters TEXT,
  description TEXT,
  culture_summary TEXT, -- AI-generated
  recent_news TEXT, -- AI-generated summary
  financials_summary TEXT, -- AI-generated from SEC/FRED
  research_freshness TEXT, -- ISO timestamp of last CIO research
  tier INTEGER DEFAULT 3,
  logo_url TEXT,
  careers_url TEXT,
  linkedin_url TEXT,
  glassdoor_url TEXT,
  sec_cik TEXT, -- SEC EDGAR CIK number (if public)
  key_people TEXT, -- JSON array: [{name, title, linkedin_url}] (Floor 80 "Key People" section)
  internship_intel TEXT, -- AI-generated: program details, timeline, past intern roles (Floor 80)
  your_connections TEXT, -- JSON array of contact_ids who work here (Floor 80 "Your Connections")
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contacts table (CNO owns, COO enriches, CMO reads)
CREATE TABLE contacts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT REFERENCES companies(id),
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  linkedin_url TEXT,
  relationship TEXT, -- 'alumni', 'recruiter', 'referral', 'cold', 'warm_intro'
  warmth INTEGER DEFAULT 50, -- 0-100, decays over time
  last_contact_at TEXT,
  notes TEXT,
  source TEXT, -- 'apollo', 'hunter', 'pdl', 'manual'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Emails table (COO owns, CEO/CMO read)
CREATE TABLE emails (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  gmail_id TEXT UNIQUE NOT NULL, -- Gmail message ID
  thread_id TEXT, -- Gmail thread ID
  application_id TEXT REFERENCES applications(id),
  contact_id TEXT REFERENCES contacts(id),
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  snippet TEXT, -- Short preview
  body_text TEXT, -- Full plain text
  classification TEXT, -- AI classification
    -- 'interview_invite', 'rejection', 'info_request',
    -- 'follow_up_needed', 'offer', 'newsletter', 'other'
  urgency TEXT DEFAULT 'low', -- 'high', 'medium', 'low'
  suggested_action TEXT, -- AI suggestion
  is_read BOOLEAN DEFAULT FALSE,
  is_processed BOOLEAN DEFAULT FALSE,
  received_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Documents table (CMO owns, CPO contributes, user reads)
CREATE TABLE documents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id TEXT REFERENCES applications(id),
  company_id TEXT REFERENCES companies(id),
  type TEXT NOT NULL, -- 'cover_letter', 'resume_tailored', 'prep_packet', 'debrief'
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown or HTML content
  version INTEGER DEFAULT 1,
  parent_id TEXT REFERENCES documents(id), -- Previous version
  generated_by TEXT, -- Agent that created it: 'cmo', 'cpo'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- OPERATIONAL: Interview, Calendar, Outreach, Notifications
-- ============================================

-- Interviews table (CPO/COO own — one row per interview event)
CREATE TABLE interviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id TEXT NOT NULL REFERENCES applications(id),
  company_id TEXT REFERENCES companies(id),
  round TEXT, -- 'phone_screen', 'technical', 'behavioral', 'final', 'superday'
  format TEXT, -- 'phone', 'video', 'onsite'
  scheduled_at TEXT, -- ISO timestamp
  duration_minutes INTEGER DEFAULT 60,
  location TEXT, -- Physical address or video link
  interviewer_name TEXT,
  interviewer_title TEXT,
  interviewer_linkedin TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'rescheduled'
  prep_packet_id TEXT REFERENCES documents(id),
  debrief_id TEXT REFERENCES documents(id),
  calendar_event_id TEXT, -- Google Calendar event ID
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Calendar events table (COO owns — synced from Google Calendar)
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  google_event_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_at TEXT NOT NULL, -- ISO timestamp
  end_at TEXT NOT NULL,
  location TEXT,
  interview_id TEXT REFERENCES interviews(id), -- NULL if not interview-related
  source TEXT DEFAULT 'google', -- 'google', 'agent_created'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Outreach queue (CMO owns — drafts awaiting user approval)
CREATE TABLE outreach_queue (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id TEXT REFERENCES applications(id),
  contact_id TEXT REFERENCES contacts(id),
  company_id TEXT REFERENCES companies(id),
  type TEXT NOT NULL, -- 'cold_email', 'follow_up', 'thank_you', 'networking', 'cover_letter_send'
  subject TEXT,
  body TEXT NOT NULL, -- Draft content (markdown)
  status TEXT NOT NULL DEFAULT 'pending_approval',
    -- 'pending_approval', 'approved', 'sent', 'rejected', 'expired'
  generated_by TEXT, -- 'cmo', 'cno', 'coo'
  approved_at TEXT,
  sent_at TEXT,
  resend_message_id TEXT, -- Resend tracking ID after sending
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notifications table (CEO/Novu — tracks all notification state)
CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  type TEXT NOT NULL, -- 'interview_invite', 'rejection', 'follow_up_needed', 'agent_complete', etc.
  priority TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  title TEXT NOT NULL,
  body TEXT,
  source_agent TEXT, -- Which agent generated this
  source_entity_id TEXT, -- Application, email, or contact ID
  source_entity_type TEXT, -- 'application', 'email', 'contact', 'agent_log'
  channels TEXT, -- JSON array: ["in_app", "push", "email"]
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  actions TEXT, -- JSON array: [{"label": "Accept", "action": "accept_interview"}]
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User preferences (agent personalization — single row, keyed by user)
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY DEFAULT 'default', -- Single user app, one row
  focus_industries TEXT, -- JSON array: ["real_estate_finance", "private_equity"]
  focus_companies TEXT, -- JSON array: specific company names/IDs
  tier_criteria TEXT, -- JSON: what makes a T1 vs T4
  outreach_tone TEXT DEFAULT 'professional', -- 'professional', 'casual', 'formal'
  auto_apply_enabled BOOLEAN DEFAULT FALSE,
  auto_send_enabled BOOLEAN DEFAULT FALSE,
  notification_preferences TEXT, -- JSON: per-channel settings
  daily_briefing_time TEXT DEFAULT '08:00', -- HH:MM local time
  timezone TEXT DEFAULT 'America/New_York',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- AGENT INFRASTRUCTURE: Agent operation tables
-- ============================================

-- Agent activity log (all agents write, CEO/user read)
CREATE TABLE agent_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agent TEXT NOT NULL, -- 'ceo', 'cio', 'coo', 'cro', 'cmo', 'cpo', 'cno', 'cfo'
  worker TEXT, -- 'web-scraper', 'email-scanner', etc. (null for C-suite direct)
  action TEXT NOT NULL, -- Human-readable: "Researched Blackstone", "Classified 12 emails"
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  input_summary TEXT, -- What triggered this
  output_summary TEXT, -- What it produced
  error TEXT, -- Error message if failed
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0, -- Cost in cents
  duration_ms INTEGER, -- How long it took
  inngest_run_id TEXT, -- Link to Inngest run
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Agent memory (semantic memory for personalization)
CREATE TABLE agent_memory (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agent TEXT NOT NULL,
  category TEXT NOT NULL, -- 'preference', 'pattern', 'fact', 'feedback'
  content TEXT NOT NULL,
  embedding F32_BLOB(1536), -- Vector embedding for semantic search
  importance REAL DEFAULT 0.5, -- 0-1, how important this memory is
  access_count INTEGER DEFAULT 0,
  last_accessed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create vector index for semantic memory search
CREATE INDEX idx_agent_memory_vec ON agent_memory(
  libsql_vector_idx(embedding, 'metric=cosine', 'compress_neighbors=float8', 'max_neighbors=20')
);

-- ============================================
-- ANALYTICS: CFO tables
-- ============================================

-- Daily snapshots for trend tracking
CREATE TABLE daily_snapshots (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
  total_applications INTEGER DEFAULT 0,
  active_pipeline INTEGER DEFAULT 0,
  interviews_scheduled INTEGER DEFAULT 0,
  offers INTEGER DEFAULT 0,
  rejections INTEGER DEFAULT 0,
  emails_processed INTEGER DEFAULT 0,
  agents_runs INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- VECTOR SEARCH: Semantic matching tables
-- ============================================

-- Company embeddings for similarity search
CREATE TABLE company_embeddings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT UNIQUE REFERENCES companies(id),
  content TEXT NOT NULL, -- The text that was embedded
  embedding F32_BLOB(1536),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_company_vec ON company_embeddings(
  libsql_vector_idx(embedding, 'metric=cosine', 'compress_neighbors=float8', 'max_neighbors=20')
);

-- Job description embeddings for semantic job matching
CREATE TABLE job_embeddings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id TEXT UNIQUE REFERENCES applications(id),
  content TEXT NOT NULL,
  embedding F32_BLOB(1536),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_job_vec ON job_embeddings(
  libsql_vector_idx(embedding, 'metric=cosine', 'compress_neighbors=float8', 'max_neighbors=20')
);

-- ============================================
-- INDEXES (Critical for query performance)
-- ============================================

-- applications: most queried table
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_company_id ON applications(company_id);
CREATE INDEX idx_applications_tier ON applications(tier);
CREATE INDEX idx_applications_created_at ON applications(created_at);

-- companies
CREATE INDEX idx_companies_tier ON companies(tier);

-- contacts
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_warmth_score ON contacts(warmth_score);

-- documents
CREATE INDEX idx_documents_application_id ON documents(application_id);
CREATE INDEX idx_documents_type ON documents(type);

-- interviews
CREATE INDEX idx_interviews_application_id ON interviews(application_id);
CREATE INDEX idx_interviews_date ON interviews(date);

-- calendar_events
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_google_event_id ON calendar_events(google_event_id);

-- outreach_queue
CREATE INDEX idx_outreach_queue_status ON outreach_queue(status);
CREATE INDEX idx_outreach_queue_scheduled_for ON outreach_queue(scheduled_for);

-- notifications
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- agent_memory
CREATE INDEX idx_agent_memory_agent_id ON agent_memory(agent_id);
CREATE INDEX idx_agent_memory_type ON agent_memory(type);

-- research_snapshots
CREATE INDEX idx_research_snapshots_company_id ON research_snapshots(company_id);

-- email_classifications
CREATE INDEX idx_email_classifications_gmail_id ON email_classifications(gmail_id);
CREATE INDEX idx_email_classifications_intent ON email_classifications(intent);
CREATE INDEX idx_email_classifications_application_id ON email_classifications(application_id);

-- contact_interactions
CREATE INDEX idx_contact_interactions_contact_id ON contact_interactions(contact_id);

-- pipeline_stages
CREATE INDEX idx_pipeline_stages_order ON pipeline_stages("order");
```

### Ownership Matrix

```
TABLE              WRITES                 READS
─────────────────────────────────────────────────────────────────
applications       CRO creates            CMO, CPO, CFO, CEO, You
                   COO updates status
companies          CIO creates/updates    Everyone
contacts           CNO creates/updates    CMO, COO, CEO, You
emails             COO creates            CEO, CMO, You
documents          CMO, CPO create        You, CEO
interviews         COO creates (from      CPO (prep), CEO, You
                   email), CPO links prep
calendar_events    COO syncs/creates      CPO, CEO, You
outreach_queue     CMO/CNO create drafts  You (approve/reject), COO (send)
notifications      CEO/all agents create  You (read/dismiss)
user_preferences   You (settings UI)      All agents (personalization)
agent_logs         All agents             CEO, You
agent_memory       All agents             Same agent (semantic query)
daily_snapshots    CFO creates            You, CEO
company_embeddings CIO creates            CRO (similarity), CMO
job_embeddings     CRO creates            CRO (matching)
```

---

## API Route Design

Every agent action is exposed through a consistent API route pattern.

### Route Structure

```
app/api/
├── inngest/route.ts              # Inngest webhook (single endpoint, serves all functions)
├── agents/
│   ├── bell/route.ts             # POST: Ring the Bell (triggers CEO → all departments)
│   ├── briefing/route.ts         # GET: Get latest morning memo (SSE stream)
│   ├── status/route.ts           # GET: All agent statuses (SSE stream)
│   ├── [department]/
│   │   ├── route.ts              # POST: Trigger department action
│   │   └── stream/route.ts       # GET: SSE stream for department progress
│   └── intercom/route.ts         # POST: Natural language command → CEO processes
├── integrations/
│   ├── gmail/
│   │   ├── callback/route.ts     # OAuth callback
│   │   └── webhook/route.ts      # Gmail push notifications (Pub/Sub)
│   ├── calendar/
│   │   └── callback/route.ts     # OAuth callback
│   └── resend/
│       └── webhook/route.ts      # Email delivery webhooks (opens, clicks)
└── data/
    ├── applications/route.ts     # CRUD for applications
    ├── companies/route.ts        # CRUD for companies
    ├── contacts/route.ts         # CRUD for contacts
    ├── documents/route.ts        # CRUD for documents
    ├── emails/route.ts           # Read emails (COO-populated, used by Floor 75 + Dashboard widget)
    ├── interviews/route.ts       # CRUD for interviews (Floor 70 + Dashboard)
    ├── notifications/route.ts    # Read/dismiss notifications (Floor 90 + bell)
    └── outreach/route.ts         # Read/approve/reject outreach drafts (Floor 75 queue)
```

### SSE Implementation Pattern

Every agent streams progress to the UI using Server-Sent Events:

```typescript
// app/api/agents/[department]/stream/route.ts

import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to agent events (via Inngest step callbacks or polling)
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Example events:
      send('status', { agent: 'cio', status: 'running', message: 'Researching Blackstone...' });
      send('progress', { agent: 'cio', step: 2, totalSteps: 5, detail: 'Fetching SEC filings' });
      send('complete', { agent: 'cio', result: { companiesUpdated: 3 } });
      send('error', { agent: 'cio', error: 'Firecrawl rate limit hit, retrying in 30s' });

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        send('heartbeat', { timestamp: Date.now() });
      }, 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Client-Side SSE Hook

```typescript
// lib/hooks/use-agent-stream.ts

import { useEffect, useState, useCallback } from 'react';

type AgentEvent = {
  agent: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  message?: string;
  step?: number;
  totalSteps?: number;
};

export function useAgentStream(department?: string) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = department
      ? `/api/agents/${department}/stream`
      : '/api/agents/status';

    const eventSource = new EventSource(url);

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.addEventListener('status', (e) => {
      setEvents(prev => [...prev.slice(-50), JSON.parse(e.data)]);
    });

    eventSource.addEventListener('progress', (e) => {
      setEvents(prev => [...prev.slice(-50), JSON.parse(e.data)]);
    });

    eventSource.addEventListener('complete', (e) => {
      setEvents(prev => [...prev.slice(-50), JSON.parse(e.data)]);
    });

    return () => eventSource.close();
  }, [department]);

  return { events, connected };
}
```

---

## OAuth Scope Management

Google OAuth requires different scopes for different features. We use incremental authorization — request only what's needed, when it's needed.

### Scope Strategy

```
PHASE 0 (Sign-in):
  openid
  email
  profile
  → Just authentication. No API access.

PHASE 2 (COO comes online):
  https://www.googleapis.com/auth/gmail.readonly
  https://www.googleapis.com/auth/gmail.modify
    → Required for marking emails as read, applying labels, and archiving after classification
  https://www.googleapis.com/auth/calendar.readonly
  https://www.googleapis.com/auth/calendar.events
  → Email reading/classification + Calendar viewing/creating

PHASE 3 (CMO comes online):
  https://www.googleapis.com/auth/documents
  → Google Docs for cover letter template manipulation

FUTURE (Auto-send):
  https://www.googleapis.com/auth/gmail.send
  → Only when user explicitly enables auto-outreach
```

### Implementation: Incremental OAuth in Auth.js

```typescript
// auth.ts — Add scopes incrementally

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const BASE_SCOPES = 'openid email profile';

// Store granted scopes per user in Turso
// When a department needs new scopes, redirect user to re-auth with additional scopes

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: BASE_SCOPES,
          access_type: 'offline', // Get refresh token
          prompt: 'consent',     // Always show consent (for refresh token)
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.scope = account.scope;
      }
      return token;
    },
  },
});
```

### Scope Upgrade Flow

```
User clicks "Connect Gmail" on Floor 75 (Communications)
  → Frontend redirects to /api/auth/signin?scope=gmail.readonly,gmail.modify,calendar
  → Google consent screen shows ONLY new permissions
  → Token stored with expanded scopes
  → COO department becomes operational
  → Floor 75 unlocks
```

---

## Error Handling & Retry Patterns

### The Three Types of Failures

```
TYPE 1: TRANSIENT (retry automatically)
  - API rate limits (429)
  - Network timeouts
  - Temporary service outages
  → Strategy: Exponential backoff via Inngest's built-in retry

TYPE 2: RECOVERABLE (try alternative, notify)
  - API key expired
  - OAuth token expired (auto-refresh)
  - Free tier exhausted
  → Strategy: Fallback + CEO notification + user alert

TYPE 3: PERMANENT (stop, escalate)
  - Invalid data from API
  - Schema mismatch
  - Business logic error
  → Strategy: Log to agent_logs, notify CEO, surface to user
```

### API Rate Limits Reference

| Service | Rate Limit | Strategy |
|---------|-----------|----------|
| SEC EDGAR | 10 requests/second | Token bucket with 10/s refill |
| Google Calendar API | 500 requests/100s per user | Exponential backoff |
| Google Docs API | 300 requests/min per user | Queue with 5/s rate |
| Claude API (Anthropic) | Varies by tier | Respect 429 headers |
| OpenAI (embeddings) | 3,000 RPM / 1M TPM | Batch embeddings, respect headers |
| Lever API | No published limit | Conservative 1/s default |
| Greenhouse API | 50 requests/10s | Token bucket |

### Inngest Retry Configuration

```typescript
// lib/inngest/functions/cio-research.ts

import { inngest } from '../client';

export const cioResearch = inngest.createFunction(
  {
    id: 'cio-research-company',
    retries: 3, // Retry up to 3 times on failure
    onFailure: async ({ error, event }) => {
      // After all retries exhausted, log and notify
      await db.insert(agentLogs).values({
        agent: 'cio',
        action: `Research failed: ${event.data.companyName}`,
        status: 'failed',
        error: error.message,
      });
      // Emit event so CEO knows
      await inngest.send({
        name: 'ceo/agent-failure',
        data: { department: 'cio', error: error.message, originalEvent: event },
      });
    },
  },
  { event: 'cio/research-company' },
  async ({ event, step }) => {
    // Step 1: Scrape website (transient failures auto-retry)
    const websiteData = await step.run('scrape-website', async () => {
      try {
        return await firecrawl.scrapeUrl(event.data.url);
      } catch (e) {
        if (e.status === 429) throw e; // Let Inngest retry
        return null; // Recoverable: skip this source
      }
    });

    // Step 2: Fetch SEC data (if public company)
    const secData = await step.run('fetch-sec', async () => {
      if (!event.data.secCik) return null;
      return await fetchSECFilings(event.data.secCik);
    });

    // Step 3: Search news (fallback to no news if Tavily fails)
    const news = await step.run('search-news', async () => {
      try {
        return await tavily.search(event.data.companyName);
      } catch {
        return { results: [] }; // Graceful degradation
      }
    });

    // Step 4: AI synthesis (permanent failure if this fails)
    const profile = await step.run('synthesize', async () => {
      return await generateCompanyProfile(websiteData, secData, news);
    });

    // Step 5: Store results
    await step.run('store', async () => {
      await db.update(companies).set(profile).where(eq(companies.id, event.data.companyId));
    });

    return { success: true, companyId: event.data.companyId };
  }
);
```

### Rate Limit Tracking

```typescript
// lib/integrations/rate-limiter.ts

type RateLimitConfig = {
  service: string;
  maxRequests: number;
  windowMs: number;
  currentCount: number;
  windowStart: number;
};

// Stored in-memory (resets on cold start, which is fine for rate limiting)
const limits = new Map<string, RateLimitConfig>();

const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  'firecrawl': { maxRequests: 500, windowMs: 30 * 24 * 60 * 60 * 1000 }, // 500/month
  'hunter': { maxRequests: 25, windowMs: 30 * 24 * 60 * 60 * 1000 }, // 25/month
  'pdl': { maxRequests: 100, windowMs: 30 * 24 * 60 * 60 * 1000 }, // 100/month
  'jsearch': { maxRequests: 200, windowMs: 30 * 24 * 60 * 60 * 1000 }, // 200/month free
  'apollo': { maxRequests: 10000, windowMs: 30 * 24 * 60 * 60 * 1000 }, // 10K/month
  'gmail': { maxRequests: 250, windowMs: 60 * 1000 }, // 250/min
  'tavily': { maxRequests: 1000, windowMs: 30 * 24 * 60 * 60 * 1000 }, // 1000/month free
  'adzuna': { maxRequests: 500, windowMs: 30 * 24 * 60 * 60 * 1000 }, // ~500/month free
  'resend': { maxRequests: 3000, windowMs: 30 * 24 * 60 * 60 * 1000 }, // 3000 emails/month
};

export function checkRateLimit(service: string): { allowed: boolean; remaining: number } {
  const config = RATE_LIMITS[service];
  if (!config) return { allowed: true, remaining: Infinity };

  const limit = limits.get(service) || { ...config, service, currentCount: 0, windowStart: Date.now() };

  // Reset window if expired
  if (Date.now() - limit.windowStart > limit.windowMs) {
    limit.currentCount = 0;
    limit.windowStart = Date.now();
  }

  const allowed = limit.currentCount < limit.maxRequests;
  limit.currentCount++;
  limits.set(service, limit);

  return { allowed, remaining: limit.maxRequests - limit.currentCount };
}
```

---

## Cost Monitoring

### Per-Agent Cost Tracking

Every LLM call logs tokens and estimated cost:

```typescript
// lib/agents/cost-tracker.ts

const MODEL_COSTS = {
  'claude-opus-4-6': { input: 15.0, output: 75.0 }, // per 1M tokens
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 0.80, output: 4.0 },
};

export function calculateCost(
  model: keyof typeof MODEL_COSTS,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model];
  return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;
}
```

### Estimated Monthly Costs (Full V2 Operation)

| Service | Free Tier | Estimated Usage | Estimated Cost |
|---------|-----------|-----------------|----------------|
| Inngest | 25K runs/mo | ~10-20K runs/mo | $0 (free tier) |
| Turso | 9B rows read, 500 DBs | ~1M rows/mo | $0 (free tier) |
| OpenAI Embeddings | N/A | ~500K tokens/mo | $1-2/mo |
| Resend | 3K emails/mo | ~100-500/mo | $0 (free tier) |
| Vercel | 100GB bandwidth | ~5-10GB/mo | $0 (free tier) |
| Novu (cloud) | 30K events/mo | ~5-10K/mo | $0 (free tier) |
| Claude API | N/A | ~2M tokens/mo | $20-40/mo |
| Firecrawl | 500 pages | ~200-500/mo | $0-16/mo |
| JSearch | Free tier | Varies | $0-25/mo |
| **Total** | | | **$21-83/mo** |

Note: Costs scale with usage. Free tiers cover MVP/personal use. Budget $100/mo as ceiling.

### Monthly Budget Dashboard (Floor B1 / Floor 55)

```
API COSTS THIS MONTH                          BUDGET: $100/mo
──────────────────────────────────────────────────────────────
LLM Tokens (Claude)              $34.22  ███████████░░░░░░
Firecrawl                        $16.00  █████░░░░░░░░░░░░
JSearch                          $0.00   ░░░░░░░░░░░░░░░░░
Other APIs                       $0.00   ░░░░░░░░░░░░░░░░░
──────────────────────────────────────────────────────────────
TOTAL                            $50.22  ████████████████░░

BY DEPARTMENT:
  CEO:  $8.40  (Opus for orchestration)
  CIO:  $12.30 (Sonnet for research synthesis)
  COO:  $4.10  (Haiku for email classification)
  CRO:  $3.20  (Haiku for job matching)
  CMO:  $9.80  (Sonnet for cover letters)
  CPO:  $5.40  (Sonnet for prep packets)
  CNO:  $1.20  (Haiku for enrichment)
  CFO:  $0.82  (Haiku for analytics)
```

---

## How-To Guides: Adding New Things

### How to Add a New Integration

Step-by-step. Follow this EXACTLY.

```
STEP 1: Answer the Integration Checklist (Section above)
  - Which department? What data? What events? What floor?

STEP 2: Create the integration wrapper
  File: src/lib/integrations/{service-name}.ts
  Pattern:
    - Export a typed client object
    - All API calls go through this wrapper
    - Include rate limit checks
    - Handle errors with typed error classes
    - Log all calls for debugging

STEP 3: Add environment variable
  File: .env.local (add the key)
  File: .env.example (add placeholder)
  Vercel Dashboard: add to environment variables

STEP 4: Create the Inngest function
  File: src/lib/inngest/functions/{department}-{action}.ts
  Pattern:
    - Import the integration wrapper
    - Break work into durable steps
    - Each step is independently retryable
    - Emit completion event when done

STEP 5: Register in Inngest event types
  File: src/lib/inngest/events.ts
  Pattern:
    - Add new event type to the union
    - Include typed data payload

STEP 6: Wire into the department agent
  File: src/lib/agents/{department}/tools.ts
  Pattern:
    - Add tool that calls the Inngest function
    - Tool description tells the agent WHEN to use it

STEP 7: Add UI surface (if needed)
  - Which floor shows this data?
  - Create component in src/components/boardroom/
  - Wire to API route or SSE stream

STEP 8: Test
  - Unit test the integration wrapper (mock API)
  - Integration test the Inngest function (Inngest dev server)
  - E2E test the full flow (trigger → process → UI update)
```

### How to Add a New Agent (C-Suite Officer)

When the organization evolves and a new department is needed:

```
STEP 1: Define the role
  - What does this officer OWN?
  - What data does it produce?
  - What data does it consume from other departments?
  - What workers does it need?

STEP 2: Create the agent directory
  mkdir src/lib/agents/{new-department}/
  Files needed:
    - agent.ts    → Agent definition using AI SDK v4.x
    - tools.ts    → Tools available to this agent
    - prompts.ts  → System prompt with role, responsibilities, constraints
    - workers/    → Directory for worker agents (create as needed)

STEP 3: Agent definition pattern
  File: src/lib/agents/{dept}/agent.ts

  import { generateText } from 'ai';
  import { anthropic } from '@ai-sdk/anthropic';
  import { tools } from './tools';
  import { systemPrompt } from './prompts';

  export async function runNewAgent(userMessage: string) {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      tools,
      maxSteps: 10, // Safety limit on tool loops
      prompt: userMessage,
    });
    return result;
  }

STEP 4: System prompt pattern
  File: src/lib/agents/{dept}/prompts.ts

  export const systemPrompt = `
  You are the C{X}O (Chief {X} Officer) of Armaan Arora's Internship Command Center.

  YOUR ROLE:
  - {What you own}
  - {What you're responsible for}

  YOUR WORKERS:
  - {Worker 1}: {what it does}
  - {Worker 2}: {what it does}

  YOUR DATA SOURCES:
  - You READ from: {tables}
  - You WRITE to: {tables}

  YOUR CONSTRAINTS:
  - Never {guardrail 1}
  - Always {guardrail 2}
  - Escalate to CEO when {condition}

  ABOUT THE OWNER (Armaan Arora):
  - {Key preferences that affect this department's work}
  `;

STEP 5: Create Inngest functions
  File: src/lib/inngest/functions/{dept}-{action}.ts
  Register in: src/lib/inngest/events.ts

STEP 6: Add database tables (if new data types)
  Create migration in Turso

STEP 7: Wire into CEO dispatch
  Update: src/lib/inngest/functions/bell-ring.ts
  Add the new department to the parallel dispatch

STEP 8: Create UI floor (if needed)
  - Add route: src/app/(dashboard)/{floor-name}/page.tsx
  - Add to sidebar nav: src/components/boardroom/elevator-nav.tsx
  - Assign floor number
```

### How to Add a New Page (Floor)

```
STEP 1: Choose floor number
  - Higher = more important (90F is top, B1 is basement)
  - Insert between existing floors

STEP 2: Create route
  File: src/app/(dashboard)/{page-name}/page.tsx
  Pattern:
    - Server component that fetches initial data
    - Passes to client components for interactivity

STEP 3: Add to sidebar
  File: src/components/boardroom/elevator-nav.tsx
  Add entry: { floor: 'XXF', label: 'Page Name', subtitle: 'The Room Name', href: '/page-name', icon: LucideIcon }

STEP 4: Create page-specific components
  Directory: src/components/boardroom/{page-name}/
  Follow Boardroom design system:
    - Use glass-card for containers
    - Playfair Display for headings
    - JetBrains Mono for data
    - Gold accents for emphasis
    - Motion for transitions

STEP 5: Wire data
  - Create API routes in src/app/api/data/{resource}/
  - Or wire to SSE stream from agent

STEP 6: Add page transition
  - Integrate with layout-transition.tsx
  - Elevator arrival animation (fade up, gold progress line)
```

---

## Security Considerations

### API Key Storage
- All API keys in Vercel environment variables (encrypted at rest)
- Never expose keys to the client — all API calls go through server-side routes
- Use `NEXT_PUBLIC_` prefix ONLY for client-safe keys (PostHog, Sentry DSN)

### OAuth Token Security
- Refresh tokens stored encrypted in Turso (not in JWT)
- Access tokens short-lived (1 hour), auto-refreshed
- Scope principle: request minimum scopes, upgrade incrementally

### Agent Safety Rails
- No agent can DELETE data without CEO approval
- No agent can SEND emails without user approval (initially)
- Agent actions are logged with full audit trail in `agent_logs`
- Token budget per agent per run (prevent runaway LLM costs)
- Inngest timeout per function (prevent infinite loops)

### Authentication Gating
V1 uses ALLOWED_EMAILS environment variable to restrict access. V2 MUST maintain this restriction:
- Keep `ALLOWED_EMAILS` in `.env.local`
- Enforce in middleware.ts and auth callbacks
- Do NOT remove without explicit security review

### Data Privacy
- User's email content never leaves the system (processed server-side)
- Company research data is non-sensitive (public info)
- Contact data (emails, phone numbers) encrypted at rest in Turso

---

## V1 → V2 Migration Strategy

### What Carries Over
- Turso database (same instance, evolve schema)
- Auth.js configuration (add OAuth scopes incrementally)
- Vercel deployment (same project)
- Existing application data

### Migration Steps

```
STEP 1: Schema evolution (not replacement)
  - Add new columns to existing tables (nullable, with defaults)
  - Create new tables alongside existing ones
  - NEVER drop V1 tables until V2 equivalents are proven
  - Use Drizzle migrations for all schema changes

STEP 2: UI swap
  - V2 UI is built in parallel with V1 running
  - Feature flag: NEXT_PUBLIC_V2_UI=true
  - When ready, flip the flag
  - Keep V1 pages available at /v1/* for 30 days

STEP 3: Agent onboarding
  - Agents are added per-department (Phase 1-4)
  - Each agent writes to new columns/tables
  - V1 manual workflows continue to work alongside agent automation
  - Agent actions are "suggestions" initially (require user approval)
  - Gradually reduce approval requirements as trust builds

STEP 4: Data backfill
  - CIO researches all existing companies (batch job)
  - COO classifies all existing emails (batch job)
  - CRO enriches all existing applications (batch job)
  - These run as one-time Inngest batch functions
```

### V1 to V2 Migration Strategy (Expanded)

#### Breaking Changes
1. **Primary Keys:** INTEGER autoincrement → TEXT hex random
   - Every V1 table uses `integer('id').primaryKey({ autoIncrement: true })`
   - V2 uses `text('id').primaryKey().$defaultFn(() => crypto.randomUUID().replace(/-/g, '').slice(0, 16))`
   - Migration: Create new tables with TEXT PKs, copy data with generated IDs, maintain ID mapping table for foreign key updates

2. **Timestamps:** INTEGER (Unix epoch) → TEXT (ISO 8601)
   - V1: `integer('created_at', { mode: 'timestamp' })`
   - V2: `text('created_at').$defaultFn(() => new Date().toISOString())`
   - Migration: `datetime(old_col, 'unixepoch')` to convert during copy

3. **Table Renames:**
   - `company_research` → `companies` (with major schema expansion)

4. **Tables Dropped (Data Must Be Preserved):**
   - `follow_ups` → data migrates to dashboard actions + communications
   - `cover_letters` → data migrates to `documents` table (type='cover_letter')
   - `interview_prep` → data migrates to `interviews` table

#### Data Loss Risks (Must Address)
| V1 Field | Risk | Mitigation |
|----------|------|------------|
| `contacts.phone` | No V2 equivalent | Add `phone TEXT` column to V2 contacts |
| `contacts.introduced_by` | Referral chain dropped | Add `introduced_by TEXT` column |
| `cover_letters.is_active` | No active-version flag | Add `is_active INTEGER DEFAULT 0` to documents |
| `cover_letters.role/company` | Denormalized copies lost | Preserve via `application_id` foreign key |
| `follow_ups.*` | Entire table dropped | Migrate to scheduled notifications + outreach_queue |
| `applications.platform` | Only partially replaced by `source` | Map platform→source in migration script |
| `applications.sector` | Per-app granularity lost to company-level | Preserve as `sector TEXT` on applications |
| `applications.contact_name/email/role` | Inline contacts eliminated | Create contact records, link via `contact_id` |

#### Migration Script Order
1. Create V2 schema (new tables with TEXT PKs and indexes)
2. Create `_migration_id_map` temporary table (old_table, old_id, new_id)
3. Migrate `companies` (from `company_research`) — generate new IDs, store mapping
4. Migrate `applications` — generate new IDs, resolve company_id via mapping
5. Migrate `contacts` — generate new IDs, resolve company_id via mapping
6. Migrate `cover_letters` → `documents` — generate new IDs, resolve application_id
7. Migrate `follow_ups` → `notifications` + `outreach_queue` — split by type
8. Migrate `interview_prep` → `interviews` — generate new IDs, resolve application_id
9. Verify referential integrity
10. Drop `_migration_id_map`
11. Drop old tables

#### Rollback Plan
- Keep V1 tables with `_v1_` prefix until V2 is verified stable (2 weeks)
- Migration script is idempotent — can re-run safely
- V1 app code unchanged until migration verified

### V1 Code Transition Plan

#### src/lib/ Files (22 files)
| File | V2 Fate |
|------|---------|
| `google.ts` | KEEP — Gmail/Calendar helpers reused by COO agent |
| `utils.ts` | KEEP — utility functions |
| `follow-ups.ts` | REMOVE — replaced by agent-driven follow-up system |
| `agents/` directory | REPLACE — new agent architecture |
| All other lib files | AUDIT per-file during relevant phase implementation |

#### Route Files
| V1 Route | V2 Action |
|----------|-----------|
| `src/app/page.tsx` (Dashboard) | REWRITE in Phase 4 |
| `src/app/applications/` | RENAME to `/pipeline`, rewrite in Phase 4 |
| `src/app/contacts/` | RENAME to `/network`, rewrite in Phase 3 |
| `src/app/cover-letters/` | REWRITE in Phase 3 |
| `src/app/follow-ups/` | REMOVE — absorbed into Dashboard + Communications |
| `src/app/sign-in/` | RESTYLE in Phase 0 |
| `src/app/api/` | EXPAND with new agent/webhook routes |

#### Component Directories (10 dirs, 66 files)
- shadcn/ui primitives (19 files): KEEP as-is
- Application components (12 files): KEEP, add new fields
- Layout components (7 files): KEEP, restyle with Boardroom tokens
- Detail components (8 files): KEEP, these already integrate with Google APIs
- New components needed: Agent chat UI, charts, date picker, progress indicators

---

## Testing Strategy

### Unit Tests (per integration wrapper)
```
src/lib/integrations/__tests__/
  firecrawl.test.ts    → Mock Firecrawl API, test parsing
  jsearch.test.ts      → Mock JSearch API, test job normalization
  sec-edgar.test.ts    → Mock SEC API, test filing extraction
  ...
```

### Integration Tests (per Inngest function)
```
Use Inngest Dev Server (inngest dev) for local testing.
Each function can be triggered manually with test events.
Verify:
  - Correct Turso writes
  - Correct event emissions
  - Error handling paths
  - Retry behavior
```

### Agent Tests (per department)
```
src/lib/agents/__tests__/
  cio.test.ts          → Given research request, verify tool calls
  coo.test.ts          → Given email data, verify classification
  cro.test.ts          → Given job data, verify matching logic
  ...

Pattern:
  - Mock all integration wrappers
  - Provide sample inputs
  - Assert structured outputs (Zod schemas validate automatically)
  - Assert correct tool calls were made
```

### E2E Tests (critical flows)
```
Playwright tests for:
  1. Sign in → Dashboard loads → Morning Memo renders
  2. Ring the Bell → Progress streams → Memo updates
  3. Pipeline view → Add application → Status updates
  4. Communications → Email list → Classification badges
  5. Cover Letters → Generate → Typewriter effect → Version saved
```

### Visual Regression (Chromatic)
```
Storybook stories for every Boardroom component.
Chromatic runs on every PR.
Catches: gold color drift, font changes, spacing issues, animation breaks.
```

---

## Mastra Workflow Integration

Mastra provides graph-based workflow state machines for complex, multi-step agent orchestration that goes beyond simple tool loops.

### When to Use Mastra vs. Plain AI SDK

```
PLAIN AI SDK (generateText with maxSteps):
  - Single agent with tools
  - Linear tool execution
  - Simple request → process → respond
  - Example: CMO writes a cover letter

MASTRA WORKFLOWS:
  - Multi-agent coordination
  - Branching / conditional logic
  - Parallel execution paths
  - State persistence across steps
  - Example: "Ring the Bell" orchestration
  - Example: Interview invite processing (CIO + CPO + COO all triggered)
```

### Example: Interview Invite Workflow (Mastra)

```typescript
// lib/workflows/interview-invite.ts

import { Workflow } from '@mastra/core';

export const interviewInviteWorkflow = new Workflow({
  name: 'interview-invite-processing',
  triggerEvent: 'coo/email-classified',
  condition: (event) => event.data.classification === 'interview_invite',

  steps: [
    {
      id: 'extract-details',
      agent: 'coo-worker-thread-matcher',
      input: (event) => ({
        emailId: event.data.emailId,
        task: 'Extract company, role, date, time, format (phone/video/onsite), interviewer name',
      }),
    },
    {
      id: 'parallel-research-and-calendar',
      parallel: true,
      // NOTE: CIO and calendar run in parallel, but CPO runs AFTER CIO
      // because CPO depends on CIO's research output for prep packets
      steps: [
        {
          id: 'deep-research',
          agent: 'cio',
          input: (ctx) => ({
            companyName: ctx.steps['extract-details'].output.company,
            task: 'Deep research refresh — interview is scheduled',
          }),
        },
        {
          id: 'block-calendar',
          agent: 'coo-worker-calendar',
          input: (ctx) => ({
            date: ctx.steps['extract-details'].output.date,
            time: ctx.steps['extract-details'].output.time,
            title: `Interview: ${ctx.steps['extract-details'].output.company}`,
          }),
        },
      ],
    },
    {
      // CPO runs AFTER CIO completes — needs research data for prep packet
      id: 'generate-prep',
      agent: 'cpo',
      input: (ctx) => ({
        company: ctx.steps['extract-details'].output.company,
        role: ctx.steps['extract-details'].output.role,
        research: ctx.steps['deep-research'].output,
        task: 'Generate full interview prep packet using CIO research',
      }),
    },
    {
      id: 'compile-briefing',
      agent: 'ceo',
      input: (ctx) => ({
        research: ctx.steps['deep-research'].output,
        prepPacket: ctx.steps['generate-prep'].output,
        calendarEvent: ctx.steps['block-calendar'].output,
        task: 'Compile into owner briefing and determine urgency',
      }),
    },
    {
      id: 'notify-owner',
      action: 'notify',
      input: (ctx) => ({
        type: 'interview_invite',
        urgency: 'high',
        title: `Interview at ${ctx.steps['extract-details'].output.company}`,
        body: ctx.steps['compile-briefing'].output.briefing,
        actions: ['Accept', 'Decline', 'Reschedule'],
      }),
    },
  ],
});
```

---

## The Master Checklist: Before You Write ANY Code

```
Before implementing ANY feature, verify:

□ Is this in the design document? (If not, add it first)
□ Which phase does this belong to? (Don't jump ahead)
□ Which department owns this? (Must have clear ownership)
□ What tables does this touch? (Schema must exist first)
□ What Inngest events does this use? (Events must be defined)
□ What API routes does this need? (Routes must be planned)
□ What SSE events does the UI need? (Real-time updates?)
□ What error states are possible? (Handle all three types)
□ What happens on mobile? (Must work in Pocket Briefcase)
□ Does this need user approval? (Security rails)
□ What does loading look like? (Gold line trace)
□ What does empty state look like? ("The desk is clear")
□ What does error state look like? (Ruby accent, clear message)
□ Is there a Storybook story? (Component in isolation)
□ Is there a test? (Unit, integration, or E2E)
```
