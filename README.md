# The Tower — Internship Command Center

A multi-tenant SaaS that automates the internship and job search process. Users sign in, connect their Google account, and the system handles email parsing, application tracking, follow-ups, interview prep, cover letters, analytics, and AI agent orchestration.

**Not a dashboard.** The Tower is an immersive spatial experience — users navigate a virtual building via elevator, interact with AI characters who manage different departments, and watch the NYC skyline change with their local time of day.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase Postgres + pgvector |
| Schema / migrations | Drizzle v1 (runtime reads/writes use Supabase REST + RLS, not Drizzle queries on Vercel) |
| Auth | Supabase Auth (Google OAuth) |
| Background Jobs | Vercel Cron + API routes |
| AI/LLM | Vercel AI SDK v6 + Anthropic |
| Animations | GSAP |
| Email Ingestion | Gmail API + Calendar API |
| Payments | Stripe |
| Hosting | Vercel |

## The C-Suite

8 AI characters with distinct personalities manage different aspects of the job search:

| Agent | Domain |
|---|---|
| CEO | Orchestration, morning briefings |
| CRO | Pipeline tracking, conversion analytics |
| COO (Dylan Shorts) | Calendar, follow-ups, deadlines |
| CIO | Company research, competitive intelligence |
| CMO | Cover letters, outreach messaging |
| CPO | Interview preparation, mock interviews |
| CNO | Contact management, networking |
| CFO | Analytics, cost tracking, reporting |

## Development

```bash
npm install
npm run dev
```

See `docs/MASTER-PLAN.md` for the full 7-phase build plan.

## Docs

All planning documents are in `/docs/`:
- **MASTER-PLAN.md** — Phases, deliverables, acceptance criteria, testing strategy
- **VISION-SPEC.md** — Spatial UI specification (locked)
- **TECH-BRIEF.md** — Research findings, code patterns, dependency list
- **ARCHITECTURE-MAP.md** — Current folder boundaries, shared primitives, and mutation flow
- **SCHEMA-DRAFT.md** — 16-table Postgres schema with RLS
- **CHARACTER-PROMPTS.md** — System prompts for all AI agents

Operational context in `PROJECT-CONTEXT.md` (root).

## License

Private. Not open source.
