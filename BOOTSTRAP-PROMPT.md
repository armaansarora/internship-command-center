# BOOTSTRAP PROMPT — Paste Into New Chat

---

**IMPORTANT**: Before following this summary, you MUST reload:
1. Skills listed in "Skills Loaded" section → use `load_skill` tool
2. Skill helpers listed in "Skill Helpers Loaded" section → use `read` tool with exact file paths

[CONTEXT SUMMARY]
Current time: Wednesday, March 18, 2026 at 5:06 PM AST
User: armaansarora20@gmail.com
Email: armaansarora20@gmail.com

## TODO LIST
The Tower — Phase 0 Build

1. [pending] Initialize clean Next.js 16 project (wipe old code, keep .git)
2. [pending] Supabase Postgres + Drizzle schema (port SQLite→PG + userId + RLS)
3. [pending] Supabase Auth (Google OAuth) + RLS policies
4. [pending] Build world shell: lobby/login, elevator nav (GSAP), day/night engine, custom cursor
5. [pending] Build NYC skyline background (layered SVG, parallax, day/night integration)
6. [pending] Build The Penthouse — first complete floor with real Supabase data
7. [pending] Build character interaction system foundation (Option A: 2D illustrated + parallax)
8. [pending] Port contracts system (1,015 LOC)
9. [pending] Deploy to Vercel + verify

<connectors>
- github_mcp_direct
- vercel
- gcal
- google_drive
- supabase__pipedream
- resend__pipedream
- stripe
- google_sheets__pipedream
</connectors>

## User Instructions (CRITICAL)
- Analytical, not emotional. Cut the fat, keep the meat.
- Masters-degree-level code. Scalable multi-tenant SaaS.
- Deep research always — never surface-level.
- Auto-update PROJECT-CONTEXT.md after EVERY interaction.
- System picks the best model per task.
- Sources: web, vercel, gcal, google_drive, github_mcp_direct

## Active Task
Phase 0: The Shell. Full specs in `MASTER-PLAN.md` (12 deliverables, acceptance criteria, dependencies, risks).

## Context Files (READ IN ORDER)
1. `/home/user/workspace/command-center/PROJECT-CONTEXT.md` — Operational context: credentials, stack, audit summary, connectors (~150 lines)
2. `/home/user/workspace/command-center/MASTER-PLAN.md` — ALL 7 phases with concrete specs, acceptance criteria, deliverables, dependencies (~300 lines)
3. `/home/user/workspace/command-center/VISION-SPEC.md` — Locked spatial UI: building, floors, characters, cursor, day/night, design tokens (~250 lines)
4. `/home/user/workspace/command-center/TECH-BRIEF.md` — Research synthesis: GSAP, Drizzle/RLS, Inngest, AI SDK v6, character pipeline, skyline approach (~360 lines)
5. `/home/user/workspace/command-center/.env.local` — All credentials
6. `/home/user/workspace/command-center/AUDIT.md` — Keep/kill verdicts for old repo

### Skills Loaded
- `website-building/webapp`
- `design-foundations`
- `coding-and-data`
- `research-assistant` (load when researching)

### Skill Helpers Loaded
- `/home/user/workspace/skills/website-building/shared/01-design-tokens.md`
- `/home/user/workspace/skills/website-building/shared/02-typography.md`

### Key Details
- **Armaan Arora** — student, real estate internship, AST timezone, Max plan
- **Repo:** armaansarora/internship-command-center (push protection ON — never commit secrets)
- **Stack:** Next.js 16, Supabase, Drizzle, Inngest, AI SDK v6, GSAP + Framer Motion, Resend, Vercel
- **Design tokens:** Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px, Playfair/Satoshi/JetBrains Mono
- **Old repo meat:** contracts 1,015 LOC, agents 1,815 LOC, Gmail 304 LOC, calendar ~400 LOC, schema 517 LOC

Begin Phase 0. Read the context files in order, then start building.
