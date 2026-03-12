# Project Research Summary

**Project:** Internship Command Center
**Domain:** Personal job application tracker with AI cover letter engine (local-first, single-user)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

The Internship Command Center is a personal, local-first full-stack web application that tracks internship applications and generates tailored cover letters using AI. This domain is well-understood — job tracker apps are a mature category — but this project differentiates itself through two specific design decisions: (1) an attention-first dashboard that surfaces only what needs action today, rather than a comprehensive overview, and (2) a research-grounded AI cover letter engine that uses live company data from Tavily and Armaan's actual resume facts, eliminating the hallucination risk that plagued the previous attempt. The correct technical approach is Next.js 16 with App Router, SQLite via Drizzle ORM + better-sqlite3, and Anthropic's Claude API for generation — all server-side, with API keys never touching the browser.

The recommended build order follows a strict dependency chain: data foundation first (schema + WAL-mode SQLite + seed data), then core CRUD tracker, then the attention-scoring dashboard, then the Tavily research pipeline with aggressive caching, then the cover letter engine built on top of that research pipeline, and finally the follow-up system. Each layer depends on the one below it. The AI cover letter phase is the highest-complexity and highest-stakes phase — the cover letter engine must be grounded in structured resume constants and verified company research before any UI is built around it.

The top risks are well-defined from a previous failed attempt on this exact project: (1) a cluttered dashboard that shows everything instead of what matters, (2) a cover letter engine that fabricates facts the user never had, and (3) a Kanban-style tracker that collapses under 100+ applications. All three are preventable through upfront design constraints, not post-hoc fixes. The research identifies these with high confidence because they are observed failure modes, not hypothetical risks.

---

## Key Findings

### Recommended Stack

The stack centers on Next.js 16 App Router as the full-stack framework — Server Components handle SQLite reads at render time without API routes, and Server Actions handle mutations. This eliminates a separate API layer for all standard CRUD operations, with the single exception of the cover letter streaming endpoint which requires a traditional Route Handler because SSE streaming cannot go through Server Actions. better-sqlite3 (synchronous) over async SQLite alternatives is a firm recommendation: its synchronous API is the correct fit for Next.js Server Components and eliminates async complexity throughout the data layer.

**Core technologies:**
- **Next.js 16 + React 19:** Full-stack framework — Server Components for reads, Server Actions for mutations, Route Handler for SSE streaming
- **better-sqlite3 + Drizzle ORM:** Local SQLite with type-safe schema; synchronous API; no binary engine overhead
- **TypeScript 5.9 (strict):** Type inference from Drizzle schema flows to UI — catches data-shape bugs at compile time
- **Tailwind CSS 4 + shadcn/ui:** Dark-mode-first UI; CSS-native build; components are owned code, not a dependency
- **@anthropic-ai/sdk 0.78:** Claude API with `messages.stream()` for real-time cover letter generation
- **@tavily/core 0.7:** Company research API; must be paired with SQLite cache to stay within 1,000/month free tier
- **@tanstack/react-table 8 + @tanstack/react-query 5:** Headless sortable table for the tracker; async state for streaming endpoints only

**Critical version note:** Next.js 16.x ships with React 19.x — do not mix versions. Drizzle ORM 0.45.x requires drizzle-kit 0.31.x in sync.

See `/Users/armaanarora/Claude Code/.planning/research/STACK.md` for full installation commands and alternatives considered.

### Expected Features

Competitors (Huntr, Teal, Simplify) all provide basic status tracking but none offer: a tier-based priority system, attention-first dashboards, or research-grounded AI cover letter generation. The unique value proposition is the combination of "what needs action today" surfacing and factually-grounded AI output.

**Must have (table stakes):**
- Application list with sortable/filterable table — primary interface for 100+ entries
- Status tracking with defined stages (Applied, In Progress, Interview, Under Review, Rejected, Offer)
- Priority tier system (T1: RE Finance, T2: Real Estate, T3: Finance, T4: Other)
- Quick-add form — company + role + tier + date as minimum, smart defaults
- Per-application notes and contact storage
- Follow-up date tracking with auto-suggestion by tier
- Attention-first dashboard — interviews pending, stale leads, overdue follow-ups
- Pre-seeded database with 71 existing applications (tool must be useful on day 1)

**Should have (differentiators):**
- AI cover letter engine with Tavily company research (research-grounded, voice-consistent, no fabrication)
- Stale lead detection with tier-appropriate thresholds (T1: 5 days, T3/T4: 10-14 days)
- Company research view per application (Tavily live + cached major firm intel)
- Follow-up suggestion engine (rule-based, surfaces actionable cards on dashboard)

**Defer (v1.x and v2+):**
- Cover letter history / saved outputs per application (v1.x — trigger: 10+ letters generated)
- Follow-up email draft generation (v1.x)
- Gmail integration for auto-tracking replies (v2 — OAuth complexity)
- Google Calendar sync for interview scheduling (v2)
- Export to PDF/CSV (v2)
- Analytics dashboard with charts (explicitly rejected — Armaan does not want this)

See `/Users/armaanarora/Claude Code/.planning/research/FEATURES.md` for full feature dependency tree and competitor analysis.

### Architecture Approach

The architecture is local-first with a clear three-layer separation: Next.js route handlers as the only public surface, a service layer (ApplicationService, ResearchService, CoverLetterService) holding all business logic, and a data layer (db singleton + static resume constants). All external API calls (Tavily, Claude) are server-side only — API keys never reach the browser. The one architectural exception to Server Components/Actions is the cover letter streaming endpoint, which uses a traditional Route Handler returning SSE because Server Actions cannot stream.

**Major components:**
1. **Dashboard (AttentionPanel)** — computes urgency at request time from status + tier + dates; shows maximum 3-5 actionable items; no charts
2. **Application List (AppTable)** — sortable/filterable table via TanStack Table; handles 100+ rows; NOT a Kanban board
3. **Cover Letter Pipeline** — ResearchService (Tavily + SQLite cache) feeds CoverLetterService (prompt builder + Claude stream) feeds StreamingOutput UI
4. **db singleton (db/index.ts)** — single better-sqlite3 connection with WAL mode enabled; never instantiated twice
5. **lib/resume.ts** — Armaan's resume facts as typed TypeScript constants; never in the database; compile-time safety against hallucination

See `/Users/armaanarora/Claude Code/.planning/research/ARCHITECTURE.md` for full system diagram, data flow, and code examples for each pattern.

### Critical Pitfalls

The following pitfalls are drawn from the previous failed attempt on this exact project plus research-verified patterns. They are not hypothetical.

1. **Cluttered dashboard (shown before)** — The dashboard must answer only "what do I need to do today?" Maximum 3-5 attention items. No charts, no pipeline metrics, no filters on the homepage. Every element that does not answer "what do I need to do today?" gets removed. Build this constraint in from the first commit, not as a refactor.

2. **Cover letter fabrication (shown before)** — Pass Armaan's exact resume data (National Lecithin, SREG mentorship, AI modernization initiative, NYU Schack, GPA) as structured TypeScript constants in every prompt. Include explicit instruction: "Use ONLY facts from the provided context. Do not invent metrics, titles, or accomplishments." Grounded RAG reduces hallucinations 42-68%. The previous attempt failed here — prevention is the only strategy; there is no recovery once a fabricated letter is sent.

3. **Kanban abstraction mismatch** — Do NOT build the tracker as a Kanban board. At 100+ applications, Kanban is unscrollable chaos. Use a sortable table. The Kanban mental model exists only as a color-coded status badge per row.

4. **Tavily quota burn** — The SQLite research cache must be built before the cover letter engine, not after. Check cache first on every cover letter generation. Only call Tavily on cache miss. Pre-seed cache with major firm intel (JPM, Blackstone, Goldman, Brookfield). Free tier is 1,000/month — unprotected use exhausts it in days.

5. **SQLite concurrent writes without WAL** — Enable `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL` in the very first database initialization commit. A single-connection singleton via `globalThis.__db` prevents hot-reload connection multiplication. Corruption from missing WAL is unrecoverable without backup.

---

## Implications for Roadmap

Based on combined research, the build order is dictated by strict dependency chains. The architecture's Phase 1-6 ordering from ARCHITECTURE.md is confirmed by FEATURES.md's dependency tree and PITFALLS.md's phase-to-prevention mapping. Six phases are recommended.

### Phase 1: Data Foundation and Core Tracker

**Rationale:** Everything else depends on the database schema and basic CRUD. Pre-seeding with 71 applications requires the full schema to exist first. WAL mode and the singleton pattern must be established here — they cannot be retrofitted safely. The table-based tracker (not Kanban) must be the initial design decision.

**Delivers:** Working SQLite database with WAL mode, Drizzle schema, 71 seeded applications, basic list view with sort/filter/search, quick-add form, status updates, priority tier display

**Features addressed:** Application list, status tracking, priority tier system, quick-add form, per-application notes and contacts, date tracking, visual status badges, pre-seeded database

**Pitfalls to avoid:**
- Enable WAL mode in first commit (Pitfall 6)
- Use sortable table layout, never Kanban (Pitfall 4)
- Enforce "ugly but working" — no polish until data layer is verified (Pitfall 8)

**Research flag:** Standard patterns, skip phase research. Next.js + Drizzle + better-sqlite3 CRUD is well-documented.

---

### Phase 2: Attention-First Dashboard

**Rationale:** The dashboard requires status, tier, and date fields to exist (Phase 1). Attention scoring is a pure function over application data — no external dependencies. Build this before AI features so the tool delivers daily value independently of API availability.

**Delivers:** Homepage showing top 3-5 urgent items — interviews pending, warm leads going cold, overdue follow-ups. AttentionPanel + AttentionCard components. computeAttentionScore() service function.

**Features addressed:** Attention-first dashboard, follow-up date tracking, overdue follow-up alerts, interview pending indicators

**Pitfalls to avoid:**
- Maximum 3-5 items, no charts, no pipeline metrics (Pitfall 1 — the specific previous failure mode)
- Rule-based scoring only, transparent logic (users must trust the urgency ranking)
- Dashboard is complete only when tested with real seed data, not when it looks good (Pitfall 8)

**Research flag:** Standard patterns for attention scoring. No deeper research needed.

---

### Phase 3: Research Pipeline (Tavily + Cache)

**Rationale:** The cover letter engine (Phase 4) cannot be built without the research pipeline. Cache must exist before any Tavily call is made — building it first is cheaper than running out of API quota. Company detail view is a natural addition in the same phase.

**Delivers:** ResearchService with Tavily API + SQLite cache layer (company_research table with TTL). Company detail view per application. Pre-seeded cache for major firms (JPM, Blackstone, Goldman, Brookfield).

**Features addressed:** Company research view, Tavily API integration, cache management

**Pitfalls to avoid:**
- Cache-first architecture mandatory — Tavily is fallback, not default (Pitfall 5)
- Research loaded on user click, not on route render — avoids latency on application list (Performance trap)
- Validate Tavily URLs before passing to Claude (Integration gotcha)

**Research flag:** Tavily API behavior under edge cases (dead links, empty results for niche firms) may need validation during implementation. The `@tavily/core` package confidence is MEDIUM — test early.

---

### Phase 4: AI Cover Letter Engine

**Rationale:** Depends on Phase 3 (research pipeline) and Phase 1 (application CRUD). This is the highest-complexity, highest-stakes phase. The grounding architecture (resume.ts as static constants, explicit no-fabrication instructions) must be designed first, before any UI is built around it.

**Delivers:** lib/resume.ts (Armaan's facts as typed constants), lib/prompts.ts (system prompt with style constraints + Beam Living voice examples + explicit no-fabrication instruction), CoverLetterService (prompt builder + Claude streaming), SSE route handler, StreamingOutput UI component

**Features addressed:** AI cover letter engine (research-grounded, voice-consistent), streaming generation UX

**Pitfalls to avoid:**
- Resume facts in lib/resume.ts, never in the database (Anti-pattern 3, Pitfall 2)
- Explicit fabrication prohibition in system prompt (Pitfall 2 — previous failure)
- Voice constraints: include Beam Living letter as style anchor, ban buzzwords (Pitfall 3)
- Request deduplication: disable generate button while request in flight (Performance trap)
- No cover letter generation without research step (Anti-pattern 4)

**Research flag:** NEEDS PHASE RESEARCH. Prompt engineering for voice consistency and hallucination prevention is nuanced. The system prompt design is the most critical artifact of this phase and warrants a dedicated research pass before implementation. Specifically: how to structure the closed-world grounding instruction for Claude, and how to encode the five-paragraph structure constraint.

---

### Phase 5: Follow-Up System

**Rationale:** Follow-up logic depends on Phase 1 (application data, tier, dates) and Phase 2 (dashboard infrastructure). It layers on top of the attention dashboard rather than replacing it.

**Delivers:** Tier-specific follow-up timeline calculation (T1: 3 days, T2: 5 days, T3: 7 days, T4: 10+ days), FollowUpQueue component on dashboard, auto-suggested follow-up dates overridable by user, stale lead detection with tier-appropriate thresholds

**Features addressed:** Follow-up suggestion engine, stale lead detection, overdue follow-up alerts (enhanced version)

**Pitfalls to avoid:**
- Follow-up logic must respect tier — generic 5-day window for all tiers is a "looks done but isn't" failure
- Test with T1, T2, T3, T4 applications and verify each tier produces correct window before phase is marked complete
- NULL handling in date sort (applications with no follow-up date must sort predictably)

**Research flag:** Standard date-diff logic. No research needed.

---

### Phase 6: Polish and v1.x Enhancements

**Rationale:** Function is verified across all phases. Now polish UI to Linear/Notion aesthetic, add quality-of-life features, and implement v1.x additions that user behavior has validated.

**Delivers:** Consistent dark mode design, cover letter history per application, follow-up email draft generation, company intel cache refresh on demand, responsive layout improvements

**Features addressed:** Cover letter history, follow-up email drafting, cache refresh, UI polish

**Pitfalls to avoid:**
- No new core features unless driven by observed daily usage (Pitfall 7 — feature scope explosion)
- All new ideas go to FUTURE.md first; only ship what solves a real friction point observed in daily use

**Research flag:** Standard patterns. No research needed unless adding email integration (defer to v2).

---

### Phase Ordering Rationale

- **Dependency chain is firm:** Database schema must precede everything. Research cache must precede cover letter engine. Attention scoring must precede dashboard UI. No phase can be safely reordered.
- **Daily-driver value delivered in phases 1-2:** The tool is usable for tracking without AI features. This prevents the project from stalling if AI integration is complex.
- **Phase 4 (cover letter) is the highest risk:** It is also the highest-value differentiator. Treating it as its own isolated phase with a pre-implementation research pass reduces the chance of repeating the previous failure.
- **Polish is explicitly last:** The previous attempt spent too much time on UI before function was verified. Phases 1-5 use shadcn defaults and standard Tailwind. Phase 6 is the only place for design polish.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Cover Letter Engine):** Prompt engineering for hallucination prevention and voice consistency is the highest-complexity, most novel component. Needs a targeted research pass on: (a) closed-world grounding instruction structure for Claude, (b) style anchoring techniques for consistent voice, (c) self-verification prompt design.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Data Foundation):** Next.js + Drizzle + better-sqlite3 CRUD is well-documented. WAL singleton pattern has explicit code examples in ARCHITECTURE.md.
- **Phase 2 (Dashboard):** Attention scoring is pure application logic. No external dependencies.
- **Phase 3 (Research Pipeline):** Tavily integration is straightforward; cache pattern is documented. Minor validation needed on edge cases.
- **Phase 5 (Follow-up System):** Date arithmetic and tier-based rules. No novel patterns.
- **Phase 6 (Polish):** Standard UI work. No research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified against npm registry on 2026-03-06. Core patterns (Next.js App Router + Drizzle + better-sqlite3) confirmed against official documentation. One MEDIUM area: shadcn/ui + Tailwind v4 compatibility verified via community sources, not official benchmark. |
| Features | HIGH | Competitor analysis covers top 5 tools (Huntr, Teal, Simplify, JobHero, Careerflow). Feature prioritization informed by explicit user feedback from PROJECT.md. Anti-features explicitly validated against Armaan's stated preferences. |
| Architecture | HIGH (core), MEDIUM (AI pipeline) | SQLite singleton, server-side API calls, SSE streaming — all confirmed against official docs and GitHub examples. AI pipeline specifics (prompt engineering, streaming edge cases) are MEDIUM because real-world behavior requires iteration. |
| Pitfalls | HIGH | Pitfalls 1, 2, 3, 4 are observed failure modes from the previous attempt, not hypothetical. Pitfalls 5, 6 are documented SQLite and Tavily API behaviors confirmed in official documentation. |

**Overall confidence:** HIGH

### Gaps to Address

- **Tavily API edge cases:** The `@tavily/core` package is MEDIUM confidence. Test early against: companies with no search results, companies where Tavily returns dead links, companies where results are stale or unrelated. Build fallback logic (use cached major firm data) before the cover letter engine depends on it.
- **Claude prompt output quality:** The system prompt design in Phase 4 is the most critical unknown. The architecture specifies what the prompt must achieve (no fabrication, Armaan's voice, five-paragraph structure) but the exact prompt text requires iteration. Plan for 2-3 prompt revision cycles before the cover letter engine is considered complete.
- **Seed data quality:** 71 applications exist in source form but may have inconsistent field coverage (some missing notes, contacts, or follow-up dates). The seed script must handle nullable fields gracefully. Validate all 71 records display correctly before Phase 1 is marked complete.

---

## Sources

### Primary (HIGH confidence)
- npm registry (live, 2026-03-06) — all package versions confirmed
- [Next.js 15 blog](https://nextjs.org/blog/next-15) — React 19 support, Server Actions stable
- [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/get-started-sqlite) — SQLite driver, better-sqlite3
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) — streaming API
- [Tavily API Documentation](https://docs.tavily.com/documentation/about) — capabilities, rate limits
- [TanStack Query v5 docs](https://tanstack.com/query/v5/docs/framework/react/overview) — React 19 compatibility
- [Claude API Streaming Docs](https://platform.claude.com/docs/en/build-with-claude/streaming) — SSE structure
- [Write-Ahead Logging (SQLite Official)](https://sqlite.org/wal.html) — WAL mode
- [better-sqlite3 Performance Docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md) — synchronous API
- `.planning/PROJECT.md` — previous attempt failure modes (direct evidence)

### Secondary (MEDIUM confidence)
- [Huntr](https://huntr.co), [Teal](https://www.tealhq.com), [Simplify](https://simplify.jobs), [JobHero](https://www.softwaresuggest.com/jobhero), [Careerflow](https://www.careerflow.ai) — competitor feature inventory
- [Claude Streaming with Next.js (dev.to)](https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7) — production streaming pattern
- [Next.js SQLite Singleton](https://github.com/ncrmro/nextjs-sqlite) — App Router singleton pattern
- [How to Prevent LLM Hallucinations (Voiceflow)](https://www.voiceflow.com/blog/prevent-llm-hallucinations) — RAG grounding, 42-68% reduction claim
- shadcn/ui dark mode + Tailwind v4 compatibility (community sources)
- Framework comparison sources (2026) — Next.js ecosystem, Drizzle over Prisma for SQLite

### Tertiary (LOW confidence)
- [Is It Bad to Use AI for Your Cover Letter? (LiftMyCV)](https://www.liftmycv.com/blog/using-ai-for-cover-letter/) — detection rates (methodology unclear)
- [Rethinking Tool Calling: Tavily Auto-Parameters](https://www.tavily.com/blog/rethinking-tool-calling-introducing-tavily-auto-parameters) — 30-70% tool call failure rates (context-dependent)

---

*Research completed: 2026-03-06*
*Ready for roadmap: yes*
