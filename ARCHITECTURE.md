# The Tower — Internship Command Center
## Architecture & Development Roadmap

**Owner:** armaansarora20@gmail.com
**GitHub:** armaansarora/internship-command-center
**Vercel Project:** prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g (team_EC8AIyc155clLRjzrJ0fblpa)
**Vision:** A multi-tenant SaaS platform for automating internship/job searches. Users log in, connect their accounts, and the system automates everything — email parsing, application tracking, follow-ups, interview prep, analytics.

---

## Production Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | SSR, API routes, middleware, Vercel-native |
| Database | Supabase Postgres | DB + Auth + Storage + Realtime + RLS + Edge Functions |
| ORM | Drizzle | Type-safe, migration support, already proven in v1 |
| Auth | Supabase Auth | Google OAuth, magic link, multi-tenant, RLS integration |
| Background Jobs | Inngest | Agent orchestration, cron, event-driven workflows |
| AI/LLM | Vercel AI SDK v6 + Anthropic | Agentic tool use, streaming, structured output |
| Animations | GSAP + Framer Motion | Premium UI, scroll-driven effects |
| Email | Resend | Transactional emails |
| Caching | Upstash Redis | Rate limiting, caching, queues |
| Embeddings | pgvector (Supabase) | Similarity search |
| Hosting | Vercel | Auto-deploy, edge, preview deploys |
| Payments | Stripe | Subscription tiers |
| CI/CD | GitHub Actions | Lint → Typecheck → Test → Build |

---

## Multi-Tenancy

Every table has `userId`. Supabase RLS policies enforce tenant isolation at the database level. Each user gets their own OAuth tokens, data, agent configs, and activity logs.

---

## Phase Roadmap

### Phase 0: Foundation
- Initialize Next.js 16, Supabase Postgres + Drizzle
- Supabase Auth (Google OAuth)
- RLS policies
- Port contracts + agent system + Gmail/Calendar libs from v1
- Basic Penthouse UI shell
- Deploy to Vercel

### Phase 1: Gmail Integration
- Per-user OAuth, email parsing, auto-create applications, Inngest cron sync

### Phase 2: Calendar Sync
- Bidirectional Google Calendar, interview detection, follow-up reminders

### Phase 3: AI Agent Brain
- Full CEO orchestration (8 departments), pgvector memory, daily briefing

### Phase 4: Document Generation
- Cover letters, interview prep, Google Drive/PDF export

### Phase 5: Monetization
- Stripe subscriptions (Free/Pro/Team)

---

## Connected Services

| Service | Connector | Purpose |
|---------|-----------|---------|
| Gmail + Calendar | gcal | Email parsing, calendar sync |
| Google Drive | google_drive | Document storage |
| GitHub | github_mcp_direct | Source control, CI/CD |
| Vercel | vercel | Production hosting |
| Supabase | supabase__pipedream | Database operations |
| Resend | resend__pipedream | Transactional email |
| Stripe | stripe | Payments |
| Google Sheets | google_sheets__pipedream | Bulk import/export |
