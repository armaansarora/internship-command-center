# Internship Command Center — V2 Design Document
## "The Boardroom"
### Compiled: March 11, 2026

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [Agent Architecture — The Corporate Hierarchy](#2-agent-architecture)
3. [Design System — The Boardroom Aesthetic](#3-design-system)
4. [Page-by-Page UI Specification](#4-page-by-page-ui-specification)
5. [External API & Service Integrations](#5-external-api--service-integrations)
6. [AI/ML Infrastructure](#6-aiml-infrastructure)
7. [UI Component & Animation Stack](#7-ui-component--animation-stack)
8. [Claude Enhancement Tooling](#8-claude-enhancement-tooling)
9. [Performance & Accessibility](#9-performance--accessibility)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Vision & Philosophy

### The North Star
**"I should never have to manually enter or update anything. The system should know everything, do everything, and just surface what needs my human judgment."**

The Internship Command Center V2 transforms from a tracker into an **AI-powered internship war room** where specialized agents handle everything autonomously. The app runs itself — researching companies, drafting outreach, classifying emails, preparing for interviews, and eventually applying to jobs — while the user (the "Retired Owner") reviews briefings and makes final calls.

### The Metaphor
You are Armaan Arora, chairman of a private empire. You built the machine, hired the executives, and now you walk into your corner office each morning to find everything handled. The mahogany desk has today's briefing laid out. Your chief officers have been working through the night.

The app doesn't feel like software. It feels like stepping into a building. Every page is a room. Every interaction is a conversation with someone who works for you.

---

## 2. Agent Architecture — The Corporate Hierarchy

### Organizational Structure

```
╔══════════════════════════════════════════════════════════╗
║  YOU — Retired Owner / Chairman of the Board             ║
║  → Daily briefing lands on your desk                     ║
║  → Approve/reject high-stakes actions (send email, apply)║
║  → Set strategic direction ("focus on RE finance T1s")   ║
║  → Override any decision at any level                    ║
╚══════════════════════════════════════════════════════════╝
                          ↓
╔══════════════════════════════════════════════════════════╗
║  CEO — Chief Executive Agent                             ║
║  → Receives directives, decomposes into tasks            ║
║  → Morning briefing: "Here's what happened overnight"    ║
║  → Conflict resolution between departments               ║
║  → Priority ranking: what matters most RIGHT NOW         ║
║  → Escalation judgment: what needs YOUR eyes vs. auto    ║
║  → Memory: knows your preferences, history, patterns     ║
╚══════════════════════════════════════════════════════════╝
```

### C-Suite Agents (Department Heads)

#### CIO — Chief Intelligence Officer (Research & Recon)
- Owns all company intelligence and market knowledge
- **Workers:** Web Scraper, News Analyst, Culture Analyst, Deal Tracker, Competitive Mapper
- **Output:** Rich company profiles that feed every other department
- **Key integrations:** Firecrawl, SEC EDGAR API, FRED API, Tavily

#### CRO — Chief Revenue Officer (Applications & Pipeline)
- Owns the application pipeline end-to-end
- **Workers:** Opportunity Scout, Application Matcher, Auto-Applier, Pipeline Analyst, Status Updater
- **Output:** Pipeline health, new opportunities, stale app alerts
- **Key integrations:** JSearch API, Lever API, Greenhouse API (including programmatic apply)

#### CMO — Chief Marketing Officer (Personal Brand & Outreach)
- Owns how you present yourself to the world
- **Workers:** Cover Letter Writer, Resume Tailor, LinkedIn Drafter, Cold Email Composer, Follow-Up Strategist
- **Output:** All written materials, outreach drafts, follow-up queue
- **Key integrations:** Resend (email tracking), Google Docs API, @react-pdf/renderer

#### COO — Chief Operating Officer (Email & Calendar Ops)
- Owns all communication channels and scheduling
- **Workers:** Email Scanner, Thread Matcher, Response Classifier, Calendar Manager, Notification Router
- **Output:** Classified inbox, updated app statuses, calendar events
- **Key integrations:** Gmail API, Google Calendar API, Novu (notifications)

#### CPO — Chief Prep Officer (Interview & Readiness)
- Owns interview preparation and strategy
- **Workers:** Question Generator, Answer Coach, Company Briefer, Interviewer Profiler, Debrief Analyst
- **Output:** Prep packets, mock Q&A, post-interview notes
- **Key integrations:** CIO research data, LinkedIn data

#### CNO — Chief Networking Officer (Relationships & Contacts)
- Owns your professional network
- **Workers:** Contact Enricher, Warmth Monitor, Referral Mapper, Alumni Finder, Relationship Strategist
- **Output:** Network graph, warm intro suggestions, outreach priorities
- **Key integrations:** Apollo.io, Hunter.io, People Data Labs

#### CFO — Chief Forecasting Officer (Analytics & Strategy)
- Owns data analysis and strategic recommendations
- **Workers:** Funnel Analyst, Timing Analyst, Market Analyst, Performance Scorer, Strategy Advisor
- **Output:** Dashboards, trend charts, strategic recommendations
- **Key integrations:** Turso vector search, analytics data

### Cross-Department Communication Protocol
```
CIO researches Blackstone
  → feeds intel to CMO (cover letter uses recent deal data)
  → feeds intel to CPO (interview prep references fund strategy)
  → feeds intel to CNO ("you know 2 alumni there")
  → feeds intel to CRO ("3 open roles match your profile")

COO detects interview invite email
  → notifies CEO ("escalate to owner for approval")
  → triggers CPO ("generate prep packet")
  → triggers COO calendar worker ("block time")
  → triggers CIO ("deep research refresh on this company")
```

### Dynamic Worker Management (Hiring & Firing)
- **Hiring:** CEO or C-suite agent identifies a need → spins up a new worker with specific system prompt, tools, and scope → worker executes and reports back
- **Firing:** Worker's task is done or need disappears → worker is torn down, resources freed
- **Seasonal scaling:** During peak application season, CRO spins up more scouts. During interview season, CPO spins up more prep workers.
- **Ad-hoc task forces:** "I have a Blackstone interview Thursday" → CEO creates cross-department task force that dissolves after Thursday
- **Extensibility:** New "companies" can be acquired (separate agent networks), new C-suite officers can be hired for new domains. The architecture is a living organization.

### Agent Responsibility Gaps (To Address in Implementation)
- **Manual CRUD:** No agent handles direct user edits (add/edit/delete applications manually). Solution: CEO routes simple CRUD to appropriate department.
- **Error Recovery:** No agent handles retry/recovery when API calls fail. Solution: Inngest automatic retries + COO monitors for stuck operations.
- **Onboarding/Seeding:** No agent handles first-run data population. Solution: CEO runs "first day" workflow seeding initial data.
- **Deduplication:** No agent detects duplicate companies/contacts across sources. Solution: CIO includes dedup check in research pipeline.
- **CEO Tools/Prompt:** CEO agent needs explicit tool definitions and system prompt. Solution: Define in Phase 1 implementation.

### Agent Responsibility Overlaps (Resolution Rules)
- **CMO vs CNO on outreach:** CMO owns content creation, CNO owns relationship context. CMO drafts, CNO provides "who to contact" intelligence.
- **CRO vs COO on status updates:** COO detects status changes from email. CRO owns the pipeline state machine. COO feeds signals to CRO.
- **CIO vs CPO on research:** CIO owns company-level research. CPO owns interview-specific prep. CPO consumes CIO data, doesn't duplicate research.

### Extensibility: The Ever-Evolving Organization

The system is NOT a rigid hierarchy. It's a living organization that grows and adapts.

**Adding a New C-Suite Officer:**
When a new domain emerges (e.g., a "CLO — Chief Legal Officer" for contract review), the CEO can spin up a new department:
1. Create agent definition with role, tools, and system prompt
2. Register with Inngest event bus
3. Add to CEO's dispatch roster
4. Create Turso tables for the department's data
5. Build a new floor in the UI (if needed)
6. The architecture document has a step-by-step guide for this

**Acquiring a "Company" (Parallel Agent Network):**
If the system expands beyond internship search (e.g., a "Freelance Division" or "Graduate School Division"), it can run as a parallel organization:
- Separate CEO agent with its own C-suite
- Shared Turso database (different schemas/prefixes)
- Shared Inngest instance (different event namespaces)
- Shared UI shell with a "division switcher"
- Cross-company intelligence sharing via shared `agent_memory` vectors

**Dynamic Worker Lifecycle:**
Workers are ephemeral. They are TypeScript functions, not persistent services:
```
CEO says "Research Blackstone deeply" →
  CIO receives directive →
  CIO creates ad-hoc worker: DeepResearchWorker({
    company: "Blackstone",
    depth: "comprehensive",
    sources: ["sec-edgar", "firecrawl", "tavily", "fred"],
    deadline: "before Thursday interview"
  }) →
  Worker runs as Inngest function with durable steps →
  Worker stores results in Turso →
  Worker emits completion event →
  Worker is garbage collected (function ends)
```

### Technical Implementation

**Framework:** Vercel AI SDK v4.x (agent loop with tool execution) + Mastra (graph-based workflow state machines)

**Orchestration:** Inngest (event-driven background jobs)
- Free tier: 25,000 function runs/month
- Each agent step is a durable Inngest step with automatic retries
- Event-driven: one user action fans out to multiple agent functions

**ORM:** Drizzle ORM (`npm install drizzle-orm drizzle-kit`)
- Type-safe SQL queries (used throughout agent and API code)
- Migration generation via `drizzle-kit`
- Already implied by all `db.insert()`, `db.update()`, `eq()` calls in architecture doc

**Agent Memory:** Turso native vector search
- Vectors stored as `F32_BLOB` columns with `libsql_vector_idx` indexes
- Semantic search over past interactions, preferences, patterns
- No separate vector DB needed — unified data layer

**Real-time Updates:** Server-Sent Events (SSE)
- Agent progress streamed to UI: "CIO: Researching Blackstone..."
- Compatible with Vercel AI SDK streaming patterns
- Vercel supports SSE natively — no third-party realtime service needed
- If connection drops, client auto-reconnects via `EventSource` (built-in browser behavior)

---

## 3. Design System — The Boardroom Aesthetic

### Core Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `boardroom-black` | `#1A1A2E` | Primary background |
| `executive-charcoal` | `#252540` | Card backgrounds, elevated surfaces |
| `midnight-navy` | `#16213E` | Sidebar, secondary backgrounds |
| `champagne-gold` | `#C9A84C` | Signature accent (active states, borders, important metrics) |
| `warm-ivory` | `#F5F0E8` | Primary text, headings |
| `parchment` | `#D4C5A9` | Secondary text, labels, timestamps |
| `slate-silver` | `#8B8FA3` | Tertiary text, disabled, placeholder |

### Status Colors (Muted Jewel Tones)

| Token | Hex | Usage |
|-------|-----|-------|
| `emerald` | `#2D8B6F` | Success, offers, completed |
| `sapphire` | `#4A6FA5` | Info, in progress, active |
| `amber` | `#B8860B` | Warning, needs attention, overdue |
| `ruby` | `#9B3B3B` | Rejected, errors, urgent |
| `amethyst` | `#7B5EA7` | AI activity, agent processing |
| `pearl` | `#C8C8D0` | Neutral, applied, waiting |

### Tier Colors (Gradient Badges)

| Tier | Gradient | Meaning |
|------|----------|---------|
| T1 | `#C9A84C → #E8D48B` | Gold — VIP targets |
| T2 | `#9CA3AF → #D1D5DB` | Silver — strong contenders |
| T3 | `#A0785A → #C4A882` | Bronze — solid opportunities |
| T4 | `#6B7280 → #9CA3AF` | Iron — long shots |

### Typography System

| Role | Font | Weight | Size | Tracking |
|------|------|--------|------|----------|
| Page titles | Playfair Display | 700 | 28px | +0.02em |
| Section headers | Playfair Display | 600 | 20px | +0.02em |
| Card titles | Playfair Display | 500 | 16px | +0.02em |
| Body text | Inter | 400 | 14px | normal |
| Labels | Inter | 500 | 13px | normal |
| Table headers | Inter | 600 | 12px (uppercase) | +0.08em |
| Hero metrics | JetBrains Mono | 500 | 24px | normal |
| Data/stats | JetBrains Mono | 400 | 13px | normal |

### Spacing & Layout Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | 4px | Tight padding, icon gaps |
| `space-sm` | 8px | Compact spacing, pill padding |
| `space-md` | 16px | Standard padding, card gaps |
| `space-lg` | 24px | Section spacing |
| `space-xl` | 32px | Page section gaps |
| `space-2xl` | 48px | Major section breaks |

### Border & Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Buttons, badges |
| `radius-md` | 8px | Cards, inputs |
| `radius-lg` | 12px | Modals, panels |
| `radius-full` | 9999px | Pills, avatars |
| `shadow-card` | `0 4px 16px rgba(0,0,0,0.3)` | Card elevation |
| `shadow-modal` | `0 16px 48px rgba(0,0,0,0.5)` | Modal elevation |
| `shadow-glow-gold` | `0 0 20px rgba(201,168,76,0.15)` | Gold accent glow |

### Animation Tokens

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `duration-fast` | 150ms | ease-out | Hover states, toggles |
| `duration-normal` | 250ms | ease-in-out | Transitions, fades |
| `duration-slow` | 400ms | ease-in-out | Page transitions, reveals |
| `duration-dramatic` | 800ms | cubic-bezier(0.16,1,0.3,1) | Gold seal, typewriter |

### Responsive Breakpoints

| Token | Value | Usage |
|-------|-------|-------|
| `mobile` | 640px | Phone layout |
| `tablet` | 768px | Tablet layout |
| `laptop` | 1024px | Compact desktop |
| `desktop` | 1280px | Standard desktop |
| `wide` | 1536px | Wide monitors |

### CSS Luxury Techniques

**Dark Glassmorphism (requires ambient gradient orbs behind UI):**
```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

**Ambient gradient background (creates depth):**
```css
.ambient-bg {
  background:
    radial-gradient(ellipse at 20% 50%, rgba(120, 80, 200, 0.15), transparent 50%),
    radial-gradient(ellipse at 80% 50%, rgba(201, 168, 76, 0.1), transparent 50%);
}
```

**Gold glow effect:**
```css
.gold-glow {
  box-shadow: 0 0 20px rgba(201, 168, 76, 0.15),
              0 0 60px rgba(201, 168, 76, 0.05);
}
```

**Gradient border:**
```css
.gradient-border {
  background: linear-gradient(var(--bg), var(--bg)) padding-box,
              linear-gradient(135deg, #C9A84C, transparent, #C9A84C) border-box;
  border: 1px solid transparent;
}
```

**Film grain overlay:**
```css
.grain::after {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("/noise.svg");
  opacity: 0.03;
  pointer-events: none;
  z-index: 9999;
}
```

**Inner light (top highlight):**
```css
.inner-light {
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
}
```

### Tailwind v4 Theme Tokens

```css
@theme {
  --color-boardroom: #1A1A2E;
  --color-charcoal: #252540;
  --color-navy: #16213E;
  --color-gold: #C9A84C;
  --color-ivory: #F5F0E8;
  --color-parchment: #D4C5A9;
  --color-slate: #8B8FA3;
  --color-emerald: #2D8B6F;
  --color-sapphire: #4A6FA5;
  --color-amber: #B8860B;
  --color-ruby: #9B3B3B;
  --color-amethyst: #7B5EA7;
  --color-pearl: #C8C8D0;
}
```

### Micro-Interactions & Signature Details

**The Gold Seal:** When important actions complete, a small gold wax seal animation appears — a circle with "AA" that stamps down with a slight bounce. Powered by GSAP MorphSVG + timeline.

**The Intercom:** Command bar (cmdk) at the top. Gold glow on focus. CEO agent responds in dropdown formatted as a typed memo.

**Loading States:** Thin gold line traces the border of loading card/section (GSAP DrawSVG).

**Empty States:** Cream-colored card with Playfair italic: "The desk is clear." or "No briefings to review."

**Notifications:** Slide in from right as cream cards with gold left border. Each attributed to an agent: "From the COO: New email classified as interview invite."

**Page Transitions:** Content fades out with slight downward drift (0.2s), new content fades in with upward drift (0.3s) — like an elevator arriving. Thin gold progress line traces across top.

**Sound (optional, toggleable):** Paper rustle on card appear, stamp sound for gold seal, chime for notifications.

---

## 4. Page-by-Page UI Specification

### Sign-In Page — "The Door"
- Full-screen `#1A1A2E` background
- Center: thin gold border rectangle (the door frame)
- Inside: "AA" monogram in Playfair Display, gold, 80px
- Below: "Internship Command Center" in Inter, small caps, parchment, tracked out
- Google sign-in button: gold outline, ivory text, fills gold on hover
- Gold border draws itself on load (GSAP DrawSVG)
- Below sign-in: faint gold rule, "est. 2025 · Armaan Arora" in tiny parchment

### App Shell — "The Foyer"

**Sidebar (The Elevator Panel):**
- Width: 260px, background: `#16213E`
- Top: avatar in circular gold border, name in Playfair, "Chairman" in parchment small caps
- Nav items as floor numbers:
  - `90F` — Dashboard (The Office)
  - `85F` — Pipeline (The War Room)
  - `80F` — Research (The Library)
  - `75F` — Communications (The Mail Room)
  - `70F` — Preparation (The Briefing Room)
  - `65F` — Network (The Rolodex)
  - `60F` — Cover Letters (The Print Shop)
  - `55F` — Analytics (The Situation Room)
  - `B1` — Agent Operations (The Basement)
- Active floor: gold background tint + illuminated dot
- Bottom: gold "AA" monogram, "v2.0" in slate

**Top Bar:**
- Left: breadcrumb in Playfair Display
- Center: command input (the "Intercom") — gold outline pill, placeholder: "Speak to the CEO..."
- Right: notification bell (gold when items), system status indicator (green dot), theme toggle

### Floor 90 — Dashboard (The Office)

**Three-column layout on desktop, stacked on mobile.**

**Top: Morning Memo**
- Styled as typed memo on cream paper
- Header: `DAILY BRIEFING` in JetBrains Mono, caps, gold
- Date in Playfair, From: "Office of the CEO" in parchment italic
- 3-5 bullet points in natural language from CEO agent
- Gold seal stamp in bottom-right corner

**Left Column: Urgent Desk (The Red Folder)**
- `REQUIRES YOUR ATTENTION` with ruby accent line
- Interview invites (emerald border): company, role, date, Accept/Decline/Reschedule
- Outreach drafts (sapphire border): preview, Approve/Edit/Reject
- Stale applications (amber border): "No response in 21 days — follow up?"
- Agent icon in top-right corner of each card
- Dismissable: swipe right or "Handled" → gold checkmark

**Center Column: Pipeline Overview (The Blotter)**
- Hero metrics row (JetBrains Mono, large): Total Applications, Active Pipeline, Interviews, Offers
- Horizontal funnel: Applied → In Progress → Interview → Under Review → Offer
- Recent Activity feed with agent attribution and timestamps

**Right Column: Intelligence Summary**
- Email widget: unread count + sender previews
- Calendar widget: next 3 events as vertical timeline
- Network Pulse: "4 contacts going cold" with warmth bars
- Agent Status: mini grid of C-suite with status dots

### Floor 85 — Pipeline (The War Room)

**Three view modes:**
1. **Table View (default):** Alternating `#252540` row tints, no harsh grid lines. Inline editing with gold underline. Row hover lifts with shadow. TanStack Table for sorting, filtering, virtual scrolling.
2. **Board View:** Kanban columns by status. dnd-kit for drag-and-drop. Column headers show count in gold.
3. **Card Grid:** Responsive cards with company logo, tier badge, status pill. Gold border on T1. Hover flips to show quick stats.

**Filtering:** Brass toggle switch pills. Active filters glow gold.

**Note on V1 /applications/[id] Decomposition:**
V1's per-application detail page (`/applications/[id]`) is decomposed across V2:
- Company research → Floor 80 (Research)
- Email threads → Floor 75 (Communications)
- Interview prep → Floor 70 (Preparation)
- Contact info → Floor 65 (Network)
- Cover letters → Floor 60 (Cover Letters)
- Pipeline status → Floor 85 (Pipeline) inline editing
No single "application detail" page exists in V2 — the information is distributed to its natural department.

### Floor 80 — Research (The Library)
- Left panel (30%): searchable company list with tier badges
- Right panel (70%): full research profile
- Sections: Overview, Recent Activity, Culture & Values, Key People, Internship Intel, Your Connections, News Feed
- "Research freshness" indicator with last updated timestamp
- "Request Deep Dive" button styled as gold-embossed memo pad
- Each section shows originating agent icon

### Floor 75 — Communications (The Mail Room)
- Two-panel email client (Gmail integration)
- Left: email list with classification badges (Interview Invite, Rejection, Follow-up Needed)
- Right: threaded conversation view
- "Draft Response" button triggers CMO
- Outreach Queue tab: pending drafts with Approve & Send / Edit / Discard

### Floor 70 — Preparation (The Briefing Room)
- Full prep dossier when interview selected
- Cover page styled as classified document
- Sections: Company Brief, Likely Questions, Talking Points, Interviewer Profile, Recent News
- Post-interview: Debrief button for notes and lesson analysis
- "Regenerate" button (gold refresh) on each section

### Floor 65 — Network (The Rolodex)
- Card grid of contacts sorted by warmth
- Warmth thermometer graphic (gold/silver/slate)
- Network Graph View: force-directed graph with you at center (gold node)
- CNO Recommendations Panel: going cold, warm intro opportunities, alumni at targets

### Floor 60 — Cover Letters (The Print Shop)
- Left: letters grouped by company with version count
- Right: letter on cream "paper" card with shadow
- Version history timeline, compare side-by-side
- "Commission New Letter" button styled as wax seal
- Typewriter effect during generation (GSAP SplitText)
- Shows CIO research data being incorporated

### Floor 55 — Analytics (The Situation Room)
- Full-width chart dashboard (Nivo with Boardroom theming)
- Funnel chart, timeline chart, response rate heatmap
- Tier performance comparison, sector breakdown
- CFO strategy recommendations in memo format

### Floor B1 — Agent Operations (The Basement)
- Org chart: interactive tree visualization
- Activity Log: chronological feed filterable by department/agent
- Performance Metrics: per-agent stats, API cost tracker, system health
- "Hire Worker" / "Fire Worker" buttons on C-suite agents

### Mobile — "The Pocket Briefcase"
- Bottom tab bar: 5 gold icons on dark navy
- Dashboard condenses to: Morning Memo → Urgent Items (swipeable via Embla Carousel) → Quick Stats
- Pull-to-refresh triggers all-agent sync
- Swipe gestures: right = approve, left = dismiss
- Floating gold mic button for Intercom access
- Vaul drawers replace modals

### "Ring the Bell" — Global Refresh
- Gold bell icon in top bar
- Triggers CEO → all departments sync simultaneously
- Progress shows per-department status in real-time via SSE
- Morning memo regenerates with fresh data
- Gold seal stamps: "Updated at 2:34 PM"

---

## 5. External API & Service Integrations

### Job Discovery

| Service | Purpose | Cost | Auth |
|---------|---------|------|------|
| **JSearch (RapidAPI)** | Aggregates Indeed, LinkedIn, Glassdoor, ZipRecruiter, Google Jobs | Free tier / $25/mo | API key |
| **Lever Postings API** | Direct company job listings (thousands of companies) | Free | None |
| **Greenhouse Job Board API** | Direct company listings + programmatic apply | Free | None |
| **Adzuna API** | Secondary job search source | Free | API key |
| **Tavily** | AI-optimized web search (company news, industry intel) | Free tier | API key |

### Company Data & Enrichment

| Service | Purpose | Cost | Auth |
|---------|---------|------|------|
| **SEC EDGAR API** | All public company SEC filings (10-K, 10-Q, 8-K) | Free | None (User-Agent header) |
| **FRED API** | Economic indicators (interest rates, housing starts) | Free | API key |
| **Apollo.io** | Company firmographics + contact enrichment | Free tier | API key |
| **Firecrawl** | Convert any webpage to clean markdown for AI | Free 500 pages, then $16/mo | API key |

### Contact & Email Finding

| Service | Purpose | Cost | Auth |
|---------|---------|------|------|
| **Hunter.io** | Find professional emails by name + domain | Free 25/mo | API key |
| **People Data Labs** | Person enrichment (education, career history, alumni) | Free 100/mo | API key |
| **Apollo.io** | Dual-purpose: company data + email finding | Free tier | API key |

### Communication

| Service | Purpose | Cost | Auth |
|---------|---------|------|------|
| **Gmail API** | Email reading, classification, threading | Free | OAuth |
| **Google Calendar API** | Event management, scheduling | Free | OAuth |
| **Resend** | Transactional email with React Email + open/click tracking | Free 3,000/mo | API key |
| **Slack/Discord Webhooks** | Mobile push notifications | Free | Webhook URL |
| **Novu** (self-hosted OR cloud) | In-app notification center, notification routing | Free (MIT self-hosted) / Free cloud tier | API key or self-hosted |

### Document Generation

| Service | Purpose | Cost | Auth |
|---------|---------|------|------|
| **Google Docs API** | Cover letter generation from templates | Free | OAuth |
| **@react-pdf/renderer** | Server-side PDF generation (resumes, letters) | Free | N/A |

### Financial Data (RE Finance Focus)

| Service | Purpose | Cost | Auth |
|---------|---------|------|------|
| **SEC EDGAR API** | REIT filings, fund data | Free | None |
| **FRED API** | Macro indicators (Treasury yields, mortgage rates, CPI) | Free | API key |
| **Preqin** | PE/RE fund data | University library access | Institutional |
| **PitchBook** | Private market deals/company data | University library access | Institutional |

### Notification System

| Channel | Tool | When |
|---------|------|------|
| **In-app** | Novu (notification center component) | Always — all agent activity surfaces here |
| **Push (mobile)** | Slack webhook → personal Slack DM | High-urgency: interview invites, offers, deadlines |
| **Push (mobile alt)** | Discord webhook → personal server | Alternative to Slack |
| **Email digest** | Resend | Optional daily summary email (Morning Memo as email) |

**Notification Priority Levels:**
- `critical` → In-app + Push immediately (interview invite, offer)
- `high` → In-app + Push within 5 min (follow-up needed, stale app)
- `medium` → In-app only (new research available, cover letter draft ready)
- `low` → In-app, batched (agent completed routine task)

### Monitoring & Analytics

| Service | Purpose | Cost | Auth |
|---------|---------|------|------|
| **Sentry** | Error tracking, performance monitoring | Free 5K errors/mo | DSN |
| **PostHog** | Analytics, session replay, feature flags | Free 1M events/mo | API key |

**Total monthly cost estimate: $50–$150/month** at full V2 operation. Includes: LLM tokens (~$30-60), Firecrawl ($16), JSearch ($25), Inngest (free→$25 if exceeding 25K runs), embedding tokens (~$2-5), Resend (free for <3K/mo), Vercel (free tier), Turso (free tier). See V2-INTEGRATION-ARCHITECTURE.md for detailed cost breakdown per service.

---

## 6. AI/ML Infrastructure

### Agent Framework Stack

**Primary: Vercel AI SDK v4.x**
- Agent loop pattern with multi-step tool execution via `generateText` and `streamText`
- `generateObject()` with Zod schemas for structured outputs (email classification, company data extraction)
- Built-in SSE streaming for real-time agent progress
- `npm install ai`

**Orchestration: Mastra**
- Graph-based workflow state machines for multi-agent coordination
- Handles complex flows: branching, parallel execution, conditional logic
- Used for flows involving 2+ departments (e.g., interview invite triggers CIO + CPO + COO simultaneously)
- Built-in RAG support for semantic retrieval over agent memory
- 40+ provider integrations
- Compatible with AI SDK agent loop
- `npm install @mastra/core`
- **When to use Mastra vs. plain AI SDK:** If one agent can handle it with tools → AI SDK. If multiple agents need to coordinate → Mastra workflow.

**Background Jobs: Inngest**
- Event-driven, serverless-native
- Vercel Marketplace integration
- Durable steps with automatic retries
- 25,000 free function runs/month
- `npm install inngest`

### LLM Provider Strategy

| Agent Level | Model | Cost | Reasoning |
|-------------|-------|------|-----------|
| CEO (orchestration) | Claude Opus | Higher | Complex reasoning, judgment calls |
| C-Suite (department heads) | Claude Sonnet | Medium | Domain expertise, synthesis |
| Workers (task execution) | Claude Haiku | Low | Fast, specific tasks |
| Structured extraction | Claude Haiku | Low | Email parsing, data extraction |

### Vector Search & Semantic Memory

**Turso native vector search** (already in your stack):
- Store vectors as `F32_BLOB` columns
- Create indexes with `libsql_vector_idx`
- Query with `vector_top_k`
- DiskANN algorithm for approximate nearest neighbor
- Use for: agent memory, semantic job matching, company similarity search
- **Embedding model:** OpenAI `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens)
  - Anthropic doesn't offer embeddings — OpenAI's is the industry standard for this
  - `npm install openai` (used ONLY for embeddings, all reasoning stays on Claude)
  - Env var: `OPENAI_API_KEY` (embedding-only usage)

### Email Intelligence Pipeline

```
Gmail API → COO Email Scanner Worker
  → AI SDK generateObject() with Zod schema:
    {
      company: string,
      role: string,
      intent: "interview_invite" | "rejection" | "info_request" | "follow_up" | "newsletter",
      urgency: "high" | "medium" | "low",
      suggestedAction: string,
      matchedApplicationId: string | null
    }
  → Update application status in Turso
  → Trigger appropriate department notifications
```

### Research Pipeline

```
CIO receives research request
  → Firecrawl: scrape company website → markdown
  → SEC EDGAR: pull recent filings (if public)
  → Tavily: search recent news
  → AI SDK: synthesize into structured company profile
  → Store in Turso with vector embeddings
  → Push to relevant departments
```

---

## 7. UI Component & Animation Stack

### Foundation (Non-Negotiable)

| Package | Purpose | Install |
|---------|---------|---------|
| shadcn/ui | Component system | `npx shadcn@latest init` |
| Radix UI | Accessibility primitives | `npm install radix-ui` |
| Tailwind CSS v4 | Styling | Built into Next.js |
| Motion (Framer Motion) | Animations | `npm install motion` |
| Lucide | Icons | `npm install lucide-react` |
| next/font | Font loading | Built into Next.js |

### Animation & Effects

| Package | Purpose | Install |
|---------|---------|---------|
| GSAP + @gsap/react | Complex timeline animations (gold seal, typewriter, SVG draw) | `npm install gsap @gsap/react` |
| Magic UI | Animated components (beams, tickers, particles) | `npx shadcn@latest add "https://magicui.design/r/..."` |
| Aceternity UI | Dramatic effects (aurora, spotlight, 3D cards) | `npx shadcn@latest add "https://ui.aceternity.com/r/..."` |

### Data & Interaction

| Package | Purpose | Install |
|---------|---------|---------|
| TanStack Table | Pipeline data tables | `npm install @tanstack/react-table` |
| Nivo | Charts (dark theme, animated) | `npm install @nivo/core @nivo/bar @nivo/line @nivo/pie` |
| dnd-kit | Kanban drag-and-drop | `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` |
| Embla Carousel | Mobile swipeable cards | `npm install embla-carousel-react` |

### UI Patterns

| Package | Purpose | Install |
|---------|---------|---------|
| cmdk | Command palette (The Intercom) | `npx shadcn@latest add command` |
| Sonner | Toast notifications (secretary notes) | `npx shadcn@latest add sonner` |
| Vaul | Mobile drawers | `npx shadcn@latest add drawer` |
| Novel or Tiptap | Rich text editor (emails, cover letters) | `npm install novel` |

### Utilities

| Package | Purpose | Install |
|---------|---------|---------|
| tailwind-merge | Class conflict resolution | `npm install tailwind-merge` |
| clsx | Conditional classes | `npm install clsx` |
| class-variance-authority | Type-safe variants | `npm install class-variance-authority` |
| tw-animate-css | Animation utilities | `npm install tw-animate-css` |
| @phosphor-icons/react | Premium icon weights (duotone for luxury) | `npm install @phosphor-icons/react` |

### Optional Premium

| Package | Purpose | Install |
|---------|---------|---------|
| Three.js + R3F | 3D agent network visualization | `npm install three @react-three/fiber @react-three/drei` |
| Lottie React | Decorative vector animations | `npm install lottie-react` (lazy-load) |
| Rive | Interactive state-machine animations | `npm install @rive-app/react-canvas` (lazy-load) |

**Total UI stack cost: $0** (everything is free and open source)

### Quick Install Command

```bash
# Foundation
npx shadcn@latest init
npm install motion lucide-react

# Agent & data infrastructure (Phase 0 — these are skeleton, not optional)
npm install ai inngest @mastra/core
npm install drizzle-orm drizzle-kit
npm install openai  # Embeddings only (text-embedding-3-small)

# Animation extras
npm install gsap @gsap/react

# Data & interaction
npm install @tanstack/react-table @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities embla-carousel-react

# UI patterns (via shadcn)
npx shadcn@latest add command sonner drawer

# Rich text editor
npm install novel

# Charts
npm install @nivo/core @nivo/bar @nivo/line @nivo/pie

# Utilities
npm install tailwind-merge clsx class-variance-authority tw-animate-css

# Icons (supplementary)
npm install @phosphor-icons/react
```

---

## 8. Claude Enhancement Tooling

### MCP Servers

| Server | Purpose | Cost | Status |
|--------|---------|------|--------|
| **21st.dev Magic MCP** | AI component generation from natural language | $20/mo (5 free) | Install |
| **Figma MCP** | Read designs + push code to Figma | Free (with Figma plan) | Install |
| **Context7** | Up-to-date library documentation | Free | Already connected |
| **Vercel MCP** | Deployment, logs, domain management | Free | Already connected |
| **Supabase MCP** | Database, edge functions, branching | Free | Already connected |
| **Magic UI MCP** | Animated component library access | Free tier | Install |

### Skills & Persistent Context

**Install Anthropic frontend-design skill:**
```bash
npx skills add anthropics/claude-code -- skill frontend-design
```
277,000+ installs. Pushes Claude toward bold, distinctive aesthetics — fights "AI slop."

**Create Boardroom SKILL.md** at `.claude/skills/boardroom-design/SKILL.md`:
- Encode color palette, typography scale, spacing system
- Component naming conventions
- Animation preferences (Motion for micro, GSAP for complex)
- "Always use" and "Never use" lists
- Reference to design token files

**CLAUDE.md project file:**
- Tech stack declaration
- File structure conventions
- Design system reference pointers
- Component architecture patterns
- Critical rules (always dark theme, always gold accents, etc.)

**Custom slash commands** (`.claude/commands/`):
- `/new-page` — scaffold a new Boardroom page
- `/new-component` — scaffold a component following design system
- `/research-company` — trigger CIO research pipeline

### Design Token Infrastructure

**Style Dictionary** for single-source-of-truth design tokens:
```bash
npm install style-dictionary
```
- Define tokens once in JSON
- Auto-generate: CSS custom properties, Tailwind config, TypeScript types
- Forward-compatible with Design Token Community Group spec

### Visual Regression Testing

**Storybook** for isolated component development:
```bash
npx storybook@latest init
```
- Build each Boardroom component in isolation
- Auto-generated documentation with prop tables
- Accessibility auditing built-in

**Chromatic** for visual regression on PRs:
- Pixel-level visual diffs on every commit
- Free tier: 5,000 snapshots/month
- Catches any accidental design drift

---

## 9. Performance & Accessibility

### Animation Performance Rules

1. **Only animate `transform` and `opacity`** — GPU-accelerated, no layout recalculation
2. **Lazy-load heavy libraries:** Lottie (~40KB), Rive (~160KB) via `next/dynamic({ ssr: false })`
3. **Motion is safe everywhere** (~32KB gzipped)
4. **Cap simultaneous animations at 3-5 elements**
5. **Use Intersection Observer** for scroll-triggered animations (Motion's `useInView`)
6. **Respect `prefers-reduced-motion`** — Motion v12 handles this automatically
7. **Use `will-change` sparingly** — remove after animation completes

### Accessibility Requirements (WCAG AA)

- **Contrast:** 4.5:1 minimum for normal text, 3:1 for large text
- **Text color:** Warm ivory `#F5F0E8` for primary text (matches design system token `warm-ivory`). Not pure white — the warm tone prevents halation on dark backgrounds while maintaining 4.5:1+ contrast against `#1A1A2E`.
- **Focus indicators:** `focus-visible` with gold ring, 3:1 contrast against background
- **Screen readers:** `aria-live="polite"` on real-time data updates, `role="status"` on notifications
- **Keyboard navigation:** Full cmdk support, all interactions accessible via keyboard
- **Heading hierarchy:** Proper h1-h6 structure for screen reader navigation

### Performance Budget

| Resource | Target |
|----------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Total Blocking Time | < 200ms |
| Cumulative Layout Shift | < 0.1 |
| JS bundle (initial) | < 200KB gzipped |

### Monitoring

- **Sentry** for error tracking (5,000 errors/month free)
- **PostHog** for analytics + session replay (1M events/month free)
- **Lighthouse CI** in GitHub Actions for performance regression

### CI/CD Pipeline (GitHub Actions)
- **On PR:** lint → typecheck → unit tests → Lighthouse CI budget check
- **On merge to main:** Above + build → deploy preview → Chromatic visual regression
- **Config:** `.github/workflows/ci.yml` — defined in Phase 0

---

## 10. Implementation Roadmap

**Important:** This roadmap builds ON TOP of V1, not from scratch. V1 has 6 database tables with real data, 7 page routes, 66 components, full auth with Google OAuth, and established packages. Each phase must account for migrating or extending existing code, not replacing it blindly. See V2-INTEGRATION-ARCHITECTURE.md for the complete migration strategy.

### Phase 0: Foundation (Week 1-2)
- Set up design system: Tailwind tokens, fonts, base components
- Create CLAUDE.md, Boardroom SKILL.md, custom slash commands
- Install MCP servers (21st.dev, Figma, Magic UI)
- Set up Storybook for component development
- Build core layout: sign-in page, app shell, sidebar, top bar
- V1 → V2 data migration: PK conversion (INTEGER→TEXT), timestamp conversion (Unix epoch→ISO 8601), table renames and drops with data preservation
- Create error.tsx, not-found.tsx, and middleware.ts for route protection

### Phase 1: Agent Infrastructure (Week 3-5)
- Implement CEO agent with Vercel AI SDK v4.x
- Set up Inngest for background job orchestration
- Build agent state management in Turso
- Set up Novu for in-app notifications (agents need to notify from Phase 2 onward)
- Set up Slack/Discord webhooks for push notifications
- Create Agent Operations page (Floor B1)
- Implement "Ring the Bell" global refresh

### Phase 2: Intelligence Layer (Week 6-8)
- Build CIO with Firecrawl + SEC EDGAR + Tavily integration
- Build COO with Gmail API email classification pipeline
- Build CRO with JSearch + Lever + Greenhouse API integration
- Implement Research page (Floor 80)
- Implement Communications page (Floor 75)

### Phase 3: Output Layer (Week 9-11)
- Build CMO with cover letter generation + Resend integration
- Build CPO with interview prep packet generation
- Build CNO with Apollo.io + Hunter.io + People Data Labs integration
- Implement Cover Letters page (Floor 60)
- Implement Preparation page (Floor 70)
- Implement Network page (Floor 65)

### Phase 4: Dashboard & Analytics (Week 12-13)
- Build CFO with analytics pipeline
- Build Dashboard (Floor 90) with Morning Memo
- Build Analytics page (Floor 55) with Nivo charts
- Implement Pipeline page (Floor 85) with all 3 views

### Phase 5: Polish & Autonomy (Week 14-16)
- Add GSAP animations (gold seal, typewriter, page transitions)
- Mobile optimization (Pocket Briefcase)
- Auto-apply via Greenhouse API
- Sound design (optional)
- Visual regression testing (Chromatic)
- Performance optimization pass

### Phase 6: Evolution (Ongoing)
- New C-suite agents as needs arise
- "Company acquisitions" — new agent networks
- Deeper autonomy (less human approval needed)
- Cross-agent learning and pattern recognition

---

## Appendix: Research Documents

Detailed research files are available at:
- `.planning/API-AND-SERVICES-RESEARCH.md` — Communication, LinkedIn, notifications, financial data APIs
- `.planning/research/UI-COMPONENT-LIBRARY-RESEARCH.md` — 20 UI libraries with install commands and pricing
- `.planning/research/AI-DESIGN-AND-POLISH-TOOLS.md` — AI design tools, animation, theming, performance

---

*Document compiled from 6 parallel research agents covering: job board APIs, company enrichment APIs, AI agent frameworks, web scraping services, UI component libraries, animation tools, MCP servers, design-to-code tools, and Claude enhancement tooling.*

*Total estimated monthly cost for full V2: $50-100/month (mostly LLM tokens + Firecrawl)*
*Total cost of UI/component stack: $0 (100% open source)*
