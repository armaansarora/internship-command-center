# The Tower — Internship Command Center

A multi-tenant SaaS that automates the internship and job search process. Users sign in, connect their Google account, and the system handles email parsing, application tracking, follow-ups, interview prep, cover letters, analytics, and AI agent orchestration.

**Not a dashboard.** The Tower is an immersive spatial experience — users navigate a virtual building via elevator, interact with AI characters who manage different departments, and watch the NYC skyline change with their local time of day.

Live at [interntower.com](https://www.interntower.com).

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
| COO | Calendar, follow-ups, deadlines |
| CIO | Company research, competitive intelligence |
| CMO | Cover letters, outreach messaging |
| CPO | Interview preparation, mock interviews |
| CNO | Contact management, networking |
| CFO | Analytics, cost tracking, reporting |

## Development

Requires Node 24.x (see `engines` in `package.json`).

```bash
npm install            # install dependencies
npm run dev            # dev server (http://localhost:3000)
```

A handful of environment variables gate local runs. The two Supabase
`NEXT_PUBLIC_*` keys are required even for the build/test commands; the rest are
optional (features fail closed when unset). Copy the template and fill it in:

```bash
cp .env.example .env.local   # then populate values
```

### Quality gates

These mirror what CI runs — keep them green before pushing:

```bash
npx tsc --noEmit       # type check
npm run lint           # eslint
npm test               # vitest unit/integration suite
npm run build          # production build (next build)
npm run test:e2e       # Playwright E2E (auto-starts the stub server on :3001)
```

See `docs/TESTING.md` for the test layout and `CLAUDE.md` for the full command
reference (ArtLab, Drizzle, env helpers).

## Docs

| File | What it covers |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Architecture, conventions, gotchas — the canonical project brief for engineers and AI agents |
| [`STRUCTURE.md`](./STRUCTURE.md) | Where every file lives — read this when you don't know where something should go |
| [`docs/VISION-SPEC.md`](./docs/VISION-SPEC.md) | Spatial UI specification — the building metaphor (sacred) |
| [`docs/CHAIN-OF-COMMAND.md`](./docs/CHAIN-OF-COMMAND.md) | AI agent hierarchy and dispatch model |
| [`docs/CHARACTER-PROMPTS.md`](./docs/CHARACTER-PROMPTS.md) | System prompts for all 8 agents |
| [`docs/LAUNCH-READY.md`](./docs/LAUNCH-READY.md) | Locked business decisions + remaining ops checklist |
| [`docs/TESTING.md`](./docs/TESTING.md) | Test layout (vitest + Playwright) |

## License

Private. Not open source.
