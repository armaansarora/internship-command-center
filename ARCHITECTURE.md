# The Tower — Internship Command Center
## Architecture & Development Roadmap

**Owner:** armaansarora20@gmail.com
**GitHub:** armaansarora/internship-command-center
**Vercel Project:** prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g (team_EC8AIyc155clLRjzrJ0fblpa)
**Vision:** A multi-tenant SaaS platform for automating internship/job searches. Users log in, connect their accounts, and the system automates everything — email parsing, application tracking, follow-ups, interview prep, analytics.

---

## Current State (v0.1 — Prototype)

- Express + Vite + React + Tailwind + shadcn/ui
- In-memory storage (resets every deploy)
- Hardcoded seed data (12 RE companies, 7 contacts)
- No authentication, no real data, no integrations
- Deployed as static bundle to Perplexity Computer S3
- Agent cards are decorative — no AI logic

---

## Target Architecture (v1.0 — Production SaaS)

### Tech Stack Migration

| Layer | Current (Prototype) | Target (Production) |
|-------|-------------------|-------------------|
| **Framework** | Express + Vite + React | **Next.js 15** (App Router) |
| **Hosting** | Perplexity S3 | **Vercel** (already connected) |
| **Database** | In-memory Map | **Neon Postgres** (serverless, free tier: 0.5GB, 100 CU-hrs/mo) |
| **ORM** | Drizzle (already using) | **Drizzle** (keep — production-ready) |
| **Auth** | None | **Better Auth** (self-hosted, no vendor lock-in, free) |
| **Email** | None | **Gmail API** via OAuth (per-user) |
| **Calendar** | None | **Google Calendar API** via OAuth (per-user) |
| **File Storage** | None | **Google Drive API** or **Vercel Blob** |
| **AI/LLM** | None | **Vercel AI SDK** + OpenAI/Anthropic |
| **Payments** | None | **Stripe** (already connected) |
| **CI/CD** | Manual deploy | **GitHub → Vercel** auto-deploy |

### Why This Stack

1. **Next.js over Express+Vite**: Server components, API routes, middleware, edge functions, ISR — all in one. Vercel deploys it natively with zero config. The current Express setup requires manual build steps and can't do SSR.

2. **Neon Postgres over in-memory**: Serverless Postgres that scales to zero when idle (free tier covers early stage). Drizzle ORM works identically — just swap the connection string. Data persists across deploys.

3. **Better Auth over Clerk/Auth0**: 
   - Free forever (self-hosted)
   - No vendor lock-in (data in YOUR Postgres)
   - Built-in: OAuth, 2FA, RBAC, multi-tenancy, passkeys
   - Drizzle adapter built-in
   - You own the auth data — critical for a sellable product

4. **Vercel over Perplexity S3**: Already connected. GitHub push → auto-deploy. Preview deployments for PRs. Serverless functions. Edge middleware. Analytics. The internship-command-center project already exists there.

5. **Stripe**: Already connected. Can add subscription tiers later (free/pro/team).

---

## Multi-Tenancy Model

Each user gets:
- Their own OAuth tokens (Gmail, Calendar, Drive)
- Their own application/contact/follow-up data (tenant isolation via `userId` foreign key)
- Their own AI agent configurations and activity logs
- Role-based access if they invite team members (Better Auth organizations)

Database schema adds `userId` to every table. All queries filter by authenticated user.

---

## Phase Roadmap

### Phase 0: Foundation Migration (THIS SESSION)
- [ ] Initialize Next.js 15 project in the existing repo
- [ ] Set up Neon Postgres + Drizzle migrations
- [ ] Implement Better Auth (Google OAuth sign-in)
- [ ] Migrate schema with `userId` tenant isolation
- [ ] Port the Penthouse UI to Next.js App Router
- [ ] Deploy to Vercel via GitHub

### Phase 1: Gmail Integration
- [ ] OAuth flow for Gmail access (per-user)
- [ ] Email parsing engine — detect application confirmations, rejections, interview invites
- [ ] Auto-create/update applications from parsed emails
- [ ] Background sync (cron or webhook)

### Phase 2: Calendar Sync
- [ ] Bidirectional Google Calendar integration
- [ ] Auto-detect interview events
- [ ] Create follow-up reminders as calendar events
- [ ] Deadline tracking

### Phase 3: AI Agent Brain
- [ ] Vercel AI SDK integration
- [ ] CEO agent: daily briefing from real data
- [ ] CRO agent: follow-up opportunity detection
- [ ] CIO agent: company research (web scraping + LLM summarization)
- [ ] CMO agent: cover letter / email drafting
- [ ] COO agent: pipeline health monitoring
- [ ] CPO agent: interview prep generation
- [ ] CNO agent: network warmth tracking
- [ ] CFO agent: analytics and reporting

### Phase 4: Document Generation
- [ ] AI-powered cover letter generation
- [ ] Interview prep packet generation
- [ ] Export to Google Drive
- [ ] PDF generation for printing

### Phase 5: Monetization
- [ ] Stripe subscription integration
- [ ] Free tier (manual tracking, limited AI)
- [ ] Pro tier (full automation, all agents)
- [ ] Team tier (shared pipeline, RBAC)

---

## Connected Services & How They're Used

| Service | Connector | Purpose |
|---------|-----------|---------|
| **Gmail** | `gcal` (search_email, send_email) | Parse incoming emails, detect app status changes, send follow-ups |
| **Google Calendar** | `gcal` (search_calendar, update_calendar) | Interview scheduling, deadline reminders |
| **Google Drive** | `google_drive` (export_files) | Store generated documents (cover letters, prep packets) |
| **GitHub** | `github_mcp_direct` (gh CLI) | Source control, CI/CD trigger |
| **Vercel** | `vercel` (deploy, logs, projects) | Production hosting, preview deploys |
| **Google Sheets** | `google_sheets__pipedream` | Optional: spreadsheet export/import for bulk operations |
| **Stripe** | `stripe` | Payment processing for subscriptions |

---

## Key Technical Decisions

### Why NOT Google Sheets as DB
- No ACID transactions, no foreign keys, no indexes
- 10M cell limit, 500 req/100s rate limit
- Can't do joins, can't enforce schema
- Fine for export/import, terrible as primary storage

### Why NOT Clerk for Auth
- $0.02/MAU after 10k users — costs scale fast
- Vendor lock-in — user data on their servers
- Can't self-host — problematic for selling the product
- Better Auth gives same features, free, in your own DB

### Why Next.js App Router
- Server components reduce client bundle size
- API routes co-located with pages
- Middleware for auth checks at the edge
- Vercel deploys it with zero config
- React Server Actions for form handling
- Streaming SSR for fast perceived performance

---

## File Structure (Target)

```
internship-command-center/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (sign-in, sign-up)
│   │   ├── (dashboard)/        # Protected dashboard pages
│   │   │   ├── page.tsx        # The Penthouse (dashboard)
│   │   │   ├── applications/   # The War Room
│   │   │   ├── contacts/       # The Rolodex Lounge
│   │   │   ├── cover-letters/  # The Writing Room
│   │   │   ├── follow-ups/     # The Situation Room
│   │   │   ├── interview-prep/ # The Briefing Room
│   │   │   ├── analytics/      # The Observatory
│   │   │   └── agents/         # The C-Suite
│   │   ├── api/                # API routes
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Shared components
│   │   ├── ui/                 # shadcn/ui
│   │   ├── elevator-sidebar/   # The elevator navigation
│   │   └── glass-system/       # Glassmorphism components
│   ├── lib/
│   │   ├── auth.ts             # Better Auth config
│   │   ├── db.ts               # Drizzle + Neon connection
│   │   ├── email-parser.ts     # Gmail parsing engine
│   │   └── agents/             # AI agent logic
│   └── db/
│       ├── schema.ts           # Drizzle schema (all tables)
│       └── migrations/         # SQL migrations
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── vercel.json
```
