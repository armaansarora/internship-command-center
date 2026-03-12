# V2 Implementation Plan — "The Boardroom"

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Internship Command Center from a manual tracker into an AI-powered war room with 7 autonomous agent departments, a luxury Boardroom design system, and full Google/email/calendar integration.

**Architecture:** Next.js 16 + Turso/Drizzle + Vercel AI SDK v4.x agent loops + Inngest background jobs + Mastra workflow orchestration. V1 data migrated via ID-mapping strategy. SSE for real-time agent updates. Boardroom dark glassmorphism design.

**Tech Stack:** Next.js 16, React 19, Turso (libSQL), Drizzle ORM, Vercel AI SDK v4.x, Inngest, Mastra, Novu, Tailwind v4, Motion, shadcn/ui, Zod v4, Vitest

---

## Phase Overview

| Phase | Name | Duration | Key Deliverables |
|-------|------|----------|-----------------|
| **T0** | Claude Tooling Setup | 1 day | CLAUDE.md files, rules, commands, skills, RTK, hooks |
| **0** | Foundation & Migration | 2 weeks | Design system, V1→V2 data migration, app shell, new layout |
| **1** | Agent Infrastructure | 3 weeks | CEO agent, Inngest, SSE, Novu, Agent Operations page |
| **2** | Intelligence Layer | 3 weeks | CIO, COO, CRO agents + Research, Communications pages |
| **3** | Output Layer | 3 weeks | CMO, CPO, CNO agents + Cover Letters, Prep, Network pages |
| **4** | Dashboard & Analytics | 2 weeks | CFO agent, Dashboard, Analytics, Pipeline pages |
| **5** | Polish & Autonomy | 2 weeks | GSAP animations, mobile, auto-apply, performance |

---

## Phase T0: Claude Tooling Setup (1 day)

### Task T0.1: Create Global CLAUDE.md

**Files:**
- Create: `~/.claude/CLAUDE.md`

**Step 1: Write the file**

```markdown
# Global Claude Configuration

## Identity
Working with Armaan Arora. Senior CS student building an AI-powered internship command center.

## Tool Overlap Rules
- File reads: Use Read tool (not `cat`/Desktop Commander)
- File edits: Use Edit tool (not `sed`/Desktop Commander)
- File search: Use Glob/Grep (not Desktop Commander search)
- Desktop Commander: Only for system commands, process management, non-project files

## Memory System
Primary memory: `~/.claude/projects/*/memory/`
Supplementary: Obsidian vault (when installed)

## MCP Profiles (Documentation)
- Coding: Supabase, Vercel, Context7, Claude Preview, Sentry
- Communication: Gmail, Calendar, iMessage, Apple Notes
- Creative: Gamma, Claude in Chrome, Spotify
- Full: All of the above
```

**Step 2: Verify it loads**

Start a new Claude Code session and confirm the global CLAUDE.md content appears in context.

**Step 3: Commit**

```bash
# No commit needed - this is outside the project repo
```

---

### Task T0.2: Create Project CLAUDE.md

**Files:**
- Create: `/Users/armaanarora/Claude Code/internship-command-center/CLAUDE.md`

**Step 1: Write the file**

```markdown
# Internship Command Center (ICC)

## Architecture
Next.js 16 + Turso (libSQL) + Drizzle ORM + Vercel AI SDK v4.x + Inngest + Auth.js
Deployed on Vercel. Sentry for errors. Tailwind v4 + shadcn/ui.

## Agent System
Corporate hierarchy: CEO orchestrates 7 C-suite agents (CIO, CRO, CMO, COO, CPO, CNO, CFO).
Each agent uses AI SDK generateText/streamText + Zod tool schemas.
Inter-agent communication via Turso DB + Inngest events.

## Design System (Boardroom)
Dark glassmorphism. Primary: #1A1A2E. Accent: #C9A84C (gold).
Fonts: Playfair Display (headings), Inter (body), JetBrains Mono (data).
All components use shadcn/ui + Boardroom token overrides.

## Key Commands
- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm test` — vitest
- `pnpm lint` — eslint
- `pnpm db:push` — push schema to Turso
- `pnpm db:studio` — Drizzle Studio

## Conventions
- Server Components by default; "use client" only when needed
- Zod v4 for all validation
- ISO 8601 timestamps (TEXT columns)
- TEXT primary keys (hex random)
- Feature branches, atomic commits
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add project CLAUDE.md for Claude Code context"
```

---

### Task T0.3: Create Path-Scoped Rules

**Files:**
- Create: `.claude/rules/agents.md`
- Create: `.claude/rules/database.md`
- Create: `.claude/rules/design-system.md`
- Create: `.claude/rules/api-routes.md`
- Create: `.claude/rules/testing.md`
- Create: `.claude/rules/integrations.md`

**Step 1: Write agents.md**

```markdown
---
paths:
  - "src/lib/agents/**"
---
# Agent Rules
- Use `generateText` from 'ai' with `maxSteps` for tool loops
- Define tools with Zod schemas using `tool()` from 'ai'
- Each agent: system prompt + tools + model selection
- CEO=opus, C-suite=sonnet, Workers=haiku
- Register Inngest functions for background execution
- Store results in Turso, emit completion events
```

**Step 2: Write database.md**

```markdown
---
paths:
  - "src/db/**"
  - "drizzle.config.ts"
---
# Database Rules
- Turso/libSQL via Drizzle ORM
- TEXT primary keys: `text('id').primaryKey().$defaultFn(() => randomHex())`
- TEXT timestamps: `text('created_at').$defaultFn(() => new Date().toISOString())`
- Vectors: `F32_BLOB(1536)` with `libsql_vector_idx`
- Always add indexes for frequently queried columns
- Use `eq()`, `and()`, `or()` from drizzle-orm for queries
```

**Step 3: Write design-system.md**

```markdown
---
paths:
  - "src/components/**"
---
# Boardroom Design System
- Background: #1A1A2E (boardroom), #252540 (charcoal cards), #16213E (navy sidebar)
- Accent: #C9A84C (champagne gold) for active states, borders, important elements
- Text: #F5F0E8 (warm ivory primary), #D4C5A9 (parchment secondary)
- Status: emerald=#2D8B6F, sapphire=#4A6FA5, amber=#B8860B, ruby=#9B3B3B
- Glass cards: bg rgba(255,255,255,0.03), backdrop-filter blur(20px)
- Fonts: Playfair Display headings, Inter body, JetBrains Mono data
```

**Step 4: Write api-routes.md**

```markdown
---
paths:
  - "src/app/api/**"
---
# API Route Rules
- Use Next.js Route Handlers (GET, POST, etc.)
- Auth check: `const session = await auth(); if (!session) return Response.json({error}, {status: 401})`
- SSE streaming: `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })`
- Inngest webhook: single `/api/inngest` route serves all functions
- Error responses: `{ error: string, code: string }` with appropriate HTTP status
```

**Step 5: Write testing.md**

```markdown
---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
---
# Testing Rules
- Vitest for all tests
- Test files: `*.test.ts` or `*.test.tsx` next to source
- Use `describe/it/expect` pattern
- Mock external APIs (Gmail, Anthropic, Turso) with vi.mock()
- Integration tests hit real Turso dev DB
- Component tests: @testing-library/react (install when needed)
```

**Step 6: Write integrations.md**

```markdown
---
paths:
  - "src/lib/integrations/**"
---
# Integration Rules
- Each external API gets its own client file in src/lib/integrations/
- All API calls wrapped in try/catch with typed error handling
- Rate limiting: use token bucket or exponential backoff per service
- Cache responses in Turso when appropriate (company research, job listings)
- Log all API calls to agent_logs table for cost tracking
```

**Step 7: Create .claude/.gitignore and commit**

```bash
mkdir -p .claude/rules
# Write all 6 files above
cat > .claude/.gitignore << 'GITIGNORE'
*
!.gitignore
!commands/**
!rules/**
!skills/**
!launch.json
!settings.json
GITIGNORE

git add .claude/.gitignore .claude/rules/
git commit -m "feat: add path-scoped Claude rules for agents, DB, design, API, testing, integrations"
```

---

### Task T0.4: Create Custom Commands

**Files:**
- Create: `.claude/commands/test.md`
- Create: `.claude/commands/deploy-check.md`
- Create: `.claude/commands/db-migrate.md`
- Create: `.claude/commands/component.md`
- Create: `.claude/commands/agent.md`
- Create: `.claude/commands/healthcheck.md`

**Step 1: Write test.md**

```markdown
Run the test suite. If a specific test file is provided as $ARGUMENTS, run only that file. Otherwise run all tests.

Steps:
1. Run: `pnpm test $ARGUMENTS`
2. If tests fail, read the failing test file and the source file it tests
3. Identify the root cause of each failure
4. Suggest specific fixes with code
```

**Step 2: Write deploy-check.md**

```markdown
Run the full deployment readiness check. This is a sequential gate — each step must pass before the next runs.

Steps:
1. Run `pnpm lint` — must pass with zero errors
2. Run `pnpm tsc --noEmit` — must pass with zero type errors
3. Run `pnpm build` — must succeed
4. Run `pnpm test` — must pass
5. Output a pass/fail summary table
```

**Step 3: Write db-migrate.md**

```markdown
Generate and apply a Drizzle database migration.

$ARGUMENTS should describe what the migration does.

Steps:
1. Read the current schema at src/db/schema.ts
2. Make the requested schema changes
3. Run `pnpm drizzle-kit generate` to create migration SQL
4. Review the generated SQL in src/db/migrations/
5. Run `pnpm db:push` to apply
6. Verify with `pnpm db:studio` or a test query
```

**Step 4: Write component.md**

```markdown
Scaffold a new Boardroom-styled component.

$ARGUMENTS should be the component name (e.g., "StatusBadge").

Steps:
1. Create `src/components/<category>/<name>.tsx` with Boardroom design tokens
2. Use shadcn/ui primitives where applicable
3. Include proper TypeScript types and props interface
4. Add `"use client"` directive only if the component needs interactivity
5. Create `src/components/<category>/<name>.test.tsx` with basic render test
6. Export from the appropriate index file
```

**Step 5: Write agent.md**

```markdown
Scaffold a new V2 agent.

$ARGUMENTS should be "AgentName DepartmentHead" (e.g., "EmailScanner COO").

Steps:
1. Create `src/lib/agents/<department>/<name>.ts` with:
   - System prompt defining role and constraints
   - Tool definitions using Zod schemas
   - generateText loop with maxSteps
   - Proper model selection (CEO=opus, C-suite=sonnet, Worker=haiku)
2. Create Inngest function at `src/lib/agents/<department>/<name>.inngest.ts`
3. Create test at `src/lib/agents/<department>/<name>.test.ts`
4. Register in the department's agent index
```

**Step 6: Write healthcheck.md**

```markdown
Run a health check on all ICC integrations and infrastructure.

Steps:
1. Turso DB: Run `SELECT COUNT(*) FROM applications` (5s timeout)
2. TypeScript: Run `pnpm tsc --noEmit` (30s timeout)
3. ESLint: Run `pnpm lint` (15s timeout)
4. Vercel: Check latest deployment status via Vercel MCP
5. Output a pass/fail table with timing for each check
```

**Step 7: Commit**

```bash
mkdir -p .claude/commands
# Write all 6 files above
git add .claude/commands/
git commit -m "feat: add custom Claude commands (test, deploy-check, db-migrate, component, agent, healthcheck)"
```

---

### Task T0.5: Remove Duplicate MCP Servers

**Step 1: Remove duplicate Context7**

Remove the standalone MCP instance (mcp__fb9353a7...) — keep the plugin version (context7@claude-plugins-official).

Check `~/.claude/settings.json` for the standalone entry and remove it.

**Step 2: Remove Control Chrome**

Claude in Chrome is a strict superset. Remove the Control Chrome MCP server.

Check `~/.claude/settings.json` for Control Chrome and remove it.

**Step 3: Verify**

Start a new session and confirm both duplicate tools are gone.

---

### Task T0.6: Install RTK (Rust Token Killer)

**Step 1: Install Rust if needed**

```bash
# Check if cargo exists
which cargo || curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Step 2: Install RTK**

```bash
cargo install --git https://github.com/rtk-ai/rtk
```

**Step 3: Initialize**

```bash
rtk init --global
```

This creates `~/.claude/hooks/rtk-rewrite.sh`, `~/.claude/RTK.md`, and patches settings.json.

**Step 4: Verify hook ordering**

Check `~/.claude/settings.json` — RTK's PreToolUse Bash hook must be FIRST in the array, before any GSD hooks.

---

### Task T0.7: Add Shell Aliases

**Step 1: Add to .zshrc**

```bash
echo '' >> ~/.zshrc
echo '# ICC shortcuts' >> ~/.zshrc
echo 'alias icc="cd ~/Claude\ Code/internship-command-center"' >> ~/.zshrc
echo 'alias icc-dev="icc && npm run dev"' >> ~/.zshrc
echo 'alias icc-db="icc && npm run db:studio"' >> ~/.zshrc
source ~/.zshrc
```

**Step 2: Verify**

```bash
icc && pwd
# Should output: /Users/armaanarora/Claude Code/internship-command-center
```

---

## Phase 0: Foundation & Migration (2 weeks)

### Task 0.1: Install New V2 Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install agent & orchestration packages**

```bash
pnpm add ai inngest @mastra/core openai
```

**Step 2: Install UI packages not yet present**

```bash
pnpm add @nivo/core @nivo/bar @nivo/line @nivo/pie
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add embla-carousel-react
pnpm add gsap @gsap/react
pnpm add react-markdown remark-gfm
pnpm add novel
pnpm add @phosphor-icons/react
```

**Step 3: Install dev/test packages**

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom msw
```

**Step 4: Verify build**

```bash
pnpm build
```

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: install V2 dependencies (AI SDK, Inngest, Mastra, Nivo, dnd-kit, GSAP)"
```

---

### Task 0.2: Write V2 Database Schema in Drizzle

**Files:**
- Create: `src/db/schema-v2.ts` (new V2 schema alongside V1)
- Modify: `src/db/schema.ts` (re-export V2 when ready)

**Step 1: Write failing test**

```typescript
// src/__tests__/db/schema-v2.test.ts
import { describe, it, expect } from 'vitest'
import * as schema from '../../db/schema-v2'

describe('V2 Schema', () => {
  it('exports all 15+ tables', () => {
    const tables = ['applications', 'companies', 'contacts', 'emails', 'documents',
      'interviews', 'calendarEvents', 'outreachQueue', 'notifications',
      'userPreferences', 'agentLogs', 'agentMemory', 'dailySnapshots',
      'companyEmbeddings', 'jobEmbeddings']
    for (const table of tables) {
      expect(schema).toHaveProperty(table)
    }
  })

  it('uses TEXT primary keys', () => {
    expect(schema.applications.id.dataType).toBe('string')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/__tests__/db/schema-v2.test.ts
```

**Step 3: Implement V2 schema**

Write `src/db/schema-v2.ts` with all 15 tables from the Integration Architecture document, using TEXT PKs, ISO timestamps, and proper foreign keys.

**Step 4: Run test to verify it passes**

```bash
pnpm test src/__tests__/db/schema-v2.test.ts
```

**Step 5: Commit**

```bash
git add src/db/schema-v2.ts src/__tests__/db/schema-v2.test.ts
git commit -m "feat: add V2 database schema (15 tables, TEXT PKs, ISO timestamps)"
```

---

### Task 0.3: Write V1→V2 Migration Script

**Files:**
- Create: `src/db/migrate-v1-to-v2.ts`
- Create: `src/__tests__/db/migration.test.ts`

**Step 1: Write the migration script**

Implements the 11-step migration order from the Integration Architecture:
1. Create V2 tables
2. Create `_migration_id_map` table
3. Migrate companies (from company_research)
4. Migrate applications (with new IDs, resolved company_id)
5. Migrate contacts (with new IDs, resolved company_id)
6. Migrate cover_letters → documents
7. Migrate follow_ups → notifications + outreach_queue
8. Migrate interview_prep → interviews
9. Verify referential integrity
10. Drop _migration_id_map
11. Rename old tables with _v1_ prefix (rollback safety)

**Step 2: Write migration test**

Test with fixture data that covers all 8 data loss risks.

**Step 3: Commit**

```bash
git add src/db/migrate-v1-to-v2.ts src/__tests__/db/migration.test.ts
git commit -m "feat: add V1→V2 migration script with ID mapping and data preservation"
```

---

### Task 0.4: Set Up Boardroom Design Tokens

**Files:**
- Modify: `src/app/globals.css` (add Tailwind v4 @theme tokens)
- Create: `src/lib/design-tokens.ts` (TypeScript constants)

**Step 1: Add all Boardroom tokens to globals.css**

Add the `@theme` block with all colors, plus CSS utility classes for glass cards, ambient background, gold glow, gradient border, film grain, and inner light.

**Step 2: Add Google Fonts**

Add Playfair Display and JetBrains Mono via `next/font/google` in the root layout.

**Step 3: Commit**

```bash
git add src/app/globals.css src/lib/design-tokens.ts src/app/layout.tsx
git commit -m "feat: add Boardroom design tokens, glass card utilities, custom fonts"
```

---

### Task 0.5: Build App Shell (Sidebar + Top Bar)

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (restyle with Boardroom)
- Modify: `src/components/layout/top-bar.tsx` (add Intercom, notifications)
- Modify: `src/app/layout.tsx` (update structure)

**Step 1: Restyle sidebar as "The Elevator Panel"**

Navy background (#16213E), floor numbers, gold active states, avatar with gold border.

**Step 2: Build top bar with Intercom**

Breadcrumb, command palette input (gold outline), notification bell, status indicator.

**Step 3: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: restyle app shell with Boardroom sidebar and top bar"
```

---

### Task 0.6: Restyle Sign-In Page

**Files:**
- Modify: `src/app/sign-in/page.tsx`

**Step 1: Implement "The Door" design**

Full-screen #1A1A2E background, gold border rectangle, AA monogram, animated border draw.

**Step 2: Commit**

```bash
git add src/app/sign-in/page.tsx
git commit -m "feat: restyle sign-in as Boardroom 'The Door' with gold border animation"
```

---

### Task 0.7: Create Error and Not-Found Pages

**Files:**
- Modify: `src/app/global-error.tsx` (already exists, restyle)
- Create: `src/app/not-found.tsx`
- Create: `src/middleware.ts`

**Step 1: Style error page with Boardroom tokens**

**Step 2: Create not-found with "This floor doesn't exist" message**

**Step 3: Create middleware for auth redirects**

Check session, redirect unauthenticated users to /sign-in, enforce ALLOWED_EMAILS.

**Step 4: Commit**

```bash
git add src/app/global-error.tsx src/app/not-found.tsx src/middleware.ts
git commit -m "feat: add Boardroom error pages and auth middleware"
```

---

### Task 0.8: Set Up Inngest

**Files:**
- Create: `src/lib/inngest/client.ts`
- Create: `src/app/api/inngest/route.ts`

**Step 1: Create Inngest client**

```typescript
import { Inngest } from 'inngest'
export const inngest = new Inngest({ id: 'icc' })
```

**Step 2: Create API route**

```typescript
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
// Import functions as they're created
export const { GET, POST, PUT } = serve({ client: inngest, functions: [] })
```

**Step 3: Add INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY to .env.local**

**Step 4: Commit**

```bash
git add src/lib/inngest/ src/app/api/inngest/
git commit -m "feat: set up Inngest client and webhook route"
```

---

### Task 0.9: Set Up CI/CD Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Write GitHub Actions workflow**

On PR: lint → typecheck → unit tests
On merge to main: above + build

**Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline (lint, typecheck, test, build)"
```

---

## Phase 1: Agent Infrastructure (Weeks 3-5)

> Detailed task breakdown created when Phase 0 is complete.

**Key deliverables:**
1. CEO agent with system prompt, tools (dispatch, briefing, conflict resolution)
2. Agent base class/pattern (shared generateText config, error handling, logging)
3. agent_logs table populated on every agent run
4. agent_memory table with vector search
5. SSE endpoint for real-time agent progress streaming
6. Novu integration for in-app notifications
7. Agent Operations page (Floor B1) — org chart, activity log, cost tracker
8. "Ring the Bell" global refresh triggering all departments

**Dependencies:** Phase 0 complete (V2 schema, Inngest, design system)

---

## Phase 2: Intelligence Layer (Weeks 6-8)

> Detailed task breakdown created when Phase 1 is complete.

**Key deliverables:**
1. CIO agent: Firecrawl + SEC EDGAR + Tavily + FRED integration
2. COO agent: Gmail classification pipeline + Calendar sync
3. CRO agent: JSearch + Lever + Greenhouse job discovery
4. Research page (Floor 80): company profiles, deep dive requests
5. Communications page (Floor 75): classified email inbox, outreach queue

**Dependencies:** Phase 1 complete (CEO, Inngest functions, agent pattern)

---

## Phase 3: Output Layer (Weeks 9-11)

> Detailed task breakdown created when Phase 2 is complete.

**Key deliverables:**
1. CMO agent: cover letter generation, Resend email sending
2. CPO agent: interview prep packet generation
3. CNO agent: contact enrichment (Apollo, Hunter, PDL)
4. Cover Letters page (Floor 60): split-panel editor, version history
5. Preparation page (Floor 70): classified dossier, mock Q&A
6. Network page (Floor 65): contact cards, warmth tracking, network graph

**Dependencies:** Phase 2 complete (CIO research data feeds CMO/CPO/CNO)

---

## Phase 4: Dashboard & Analytics (Weeks 12-13)

> Detailed task breakdown created when Phase 3 is complete.

**Key deliverables:**
1. CFO agent: funnel analysis, timing, strategy recommendations
2. Dashboard (Floor 90): Morning Memo, urgent desk, pipeline overview, intelligence summary
3. Analytics page (Floor 55): Nivo charts, funnel, heatmap, strategy memos
4. Pipeline page (Floor 85): table view, board view, card grid with TanStack + dnd-kit

**Dependencies:** Phase 3 complete (all departments running, data to analyze)

---

## Phase 5: Polish & Autonomy (Weeks 14-16)

> Detailed task breakdown created when Phase 4 is complete.

**Key deliverables:**
1. GSAP animations: gold seal, typewriter, page transitions, loading traces
2. Mobile optimization: bottom tab bar, swipe gestures, Vaul drawers
3. Auto-apply via Greenhouse API (with approval gate)
4. Sound design (optional, toggleable)
5. Performance optimization pass (Lighthouse budget enforcement)
6. Visual regression testing (Chromatic/Storybook)

**Dependencies:** Phase 4 complete (all pages built)

---

## Environment Variables Checklist

```
# Phase 0 (already have)
TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
ALLOWED_EMAILS, ANTHROPIC_API_KEY, TAVILY_API_KEY, SENTRY_DSN

# Phase 0 (need to add)
OPENAI_API_KEY          # text-embedding-3-small only
INNGEST_EVENT_KEY       # Inngest
INNGEST_SIGNING_KEY     # Inngest

# Phase 2
FIRECRAWL_API_KEY, FRED_API_KEY, RESEND_API_KEY
JSEARCH_API_KEY, ADZUNA_APP_ID, ADZUNA_API_KEY

# Phase 3
APOLLO_API_KEY, HUNTER_API_KEY, PDL_API_KEY

# Phase 1
NOVU_API_KEY, NEXT_PUBLIC_NOVU_APP_ID
SLACK_WEBHOOK_URL, DISCORD_WEBHOOK_URL

# Phase 5
NEXT_PUBLIC_POSTHOG_KEY
```

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| V1 data loss during migration | Medium | Critical | ID mapping table, _v1_ prefix rollback, test with fixture data |
| Inngest free tier exceeded | Low | Medium | Monitor usage, batch events, upgrade if needed ($25/mo) |
| Vercel AI SDK v4.x API changes | Low | High | Pin version, test on update |
| Turso vector search performance | Medium | Medium | DiskANN indexes, embedding caching |
| LLM costs exceed budget | Medium | High | Haiku for workers, token logging, monthly cost alerts |
| Google OAuth scope rejection | Low | High | All 4 scopes already granted in V1 |

---

*Plan created March 11, 2026. Phase-specific detailed plans to be created at the start of each phase.*
