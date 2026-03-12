# Stack Research

**Domain:** Personal full-stack dashboard — local-first SQLite, AI integration, dark-mode UI
**Researched:** 2026-03-06
**Confidence:** HIGH (versions confirmed via npm registry; architectural choices verified against official docs and community consensus)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.6 | Full-stack framework — React UI + API routes + Server Actions | Single codebase handles both frontend and data layer. Server Actions eliminate a separate API server entirely. App Router lets you co-locate DB queries inside Server Components — no REST endpoints needed for internal reads. The previous attempt failed on execution, not on the framework — Next.js is the right choice; use it correctly this time. |
| React | 19.2.4 | UI rendering | Ships with Next.js 15/16. React 19's `useActionState` + `useOptimistic` simplify form submissions and optimistic UI without external state managers. |
| TypeScript | 5.9.3 | Type safety across full stack | Drizzle ORM's type inference flows from schema → queries → UI components. Catches cover letter engine data-shape bugs at compile time, not runtime. |
| better-sqlite3 | 12.6.2 | SQLite driver | Synchronous API — no async/await complexity for simple queries. Fastest Node.js SQLite driver. Works perfectly in Next.js Server Components and Server Actions. Required by Drizzle for local SQLite. |
| Drizzle ORM | 0.45.1 | Type-safe SQL query builder + schema + migrations | Thin layer over SQL — no magic, just types. Schema defines the DB; `drizzle-kit generate` + `drizzle-kit migrate` handles migrations. Significantly less overhead than Prisma (no engine binary, no separate migration runner). Type inference from schema means zero manual type declarations for DB shapes. |
| Tailwind CSS | 4.2.1 | Utility-first styling | Version 4 is a ground-up rewrite — CSS-native, no config file required, faster build. Works natively with shadcn/ui. Dark mode via `dark:` variants is first-class. |
| shadcn/ui | latest (CLI-installed) | Component library | NOT a dependency — components are copied into your project and you own every line. Built on Radix UI primitives (accessible, keyboard-navigable). Produces the exact Linear/Notion aesthetic specified. Dark mode works by swapping CSS variables, zero flicker. Table, Dialog, Badge, Select, Command palette all available. Install only what you use. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @anthropic-ai/sdk | 0.78.0 | Claude API client | Cover letter generation. Use `client.messages.stream()` for streaming output so the user sees letters being written in real time — far better UX than waiting 10s for a complete response. |
| @tavily/core | 0.7.2 | Tavily search + extract API | Company research before cover letter generation and on application detail pages. Use `tvly.search()` with `topic: "news"` + `include_answer: true` for fast structured results. Cache results in SQLite to stay within 1,000/month free tier. |
| drizzle-kit | 0.31.9 | Drizzle CLI — schema migrations | Run `drizzle-kit generate` after schema changes, `drizzle-kit migrate` to apply. Use `drizzle-kit studio` for a local DB browser during development. |
| @tanstack/react-table | 8.21.3 | Headless table with sorting/filtering | Application tracker list view. Headless = full control over styling. Built-in column sorting, filtering, pagination. Pair with shadcn's Table component for rendering. |
| @tanstack/react-query | 5.90.21 | Async state / server state management | Use only for the Claude streaming endpoint and Tavily fetch calls (these are true async operations). Do NOT use for SQLite reads — those go through Server Components or Server Actions directly. |
| zod | 4.3.6 | Runtime schema validation | Validate all form inputs before they touch the DB. Validate Claude API responses before rendering. Use with `react-hook-form` resolver. |
| react-hook-form | 7.71.2 | Form state management | Quick-add application form, status update forms. Integrates with Zod via `@hookform/resolvers`. Pairs with Next.js Server Actions via `useActionState`. |
| next-themes | 0.4.6 | Dark mode management | Wrap app in `ThemeProvider` with `defaultTheme="dark"` — this is a dark-mode-first tool. Persists preference to localStorage. Zero flicker with `attribute="class"`. |
| date-fns | 4.1.0 | Date formatting + diff calculations | Follow-up timeline calculations ("last contact 12 days ago"), displaying application dates in a human-readable way. Lightweight, tree-shakable, no global state. |
| lucide-react | 0.577.0 | Icon set | Same icon library shadcn/ui uses internally. Consistent, clean, 1,000+ icons. Import only what you use. |
| clsx + tailwind-merge | 2.1.1 / latest | Conditional class merging | `cn()` utility — standard pattern for merging Tailwind classes conditionally. shadcn/ui generates this automatically. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| drizzle-kit studio | Local database browser | Run `npx drizzle-kit studio` to inspect SQLite data during development. Replaces TablePlus/DB Browser for quick checks. |
| Next.js Dev Server | Hot reload with Turbopack | `next dev --turbo` in Next.js 15+ uses Turbopack by default. Significantly faster HMR than Webpack. |
| TypeScript strict mode | Catch type errors early | Enable `"strict": true` in tsconfig. With Drizzle's type inference this catches a large class of DB access bugs before runtime. |
| ESLint (Next.js config) | Lint + code quality | `eslint-config-next` catches common Next.js mistakes (missing keys, improper server/client boundaries). |
| dotenv (.env.local) | Secret management | `ANTHROPIC_API_KEY` and `TAVILY_API_KEY` go in `.env.local`. Next.js loads this automatically. Never expose these in client components. |

---

## Installation

```bash
# 1. Bootstrap Next.js with App Router + TypeScript + Tailwind
npx create-next-app@latest internship-command-center \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd internship-command-center

# 2. Database layer
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# 3. AI + Research APIs
npm install @anthropic-ai/sdk @tavily/core

# 4. UI components foundation
npm install next-themes lucide-react clsx tailwind-merge class-variance-authority
npx shadcn@latest init
# Choose: dark theme, CSS variables, src/components/ui

# 5. Install shadcn components you'll use
npx shadcn@latest add table badge button dialog select command sheet card separator input textarea label tooltip

# 6. Data fetching + table
npm install @tanstack/react-query @tanstack/react-table

# 7. Forms + validation
npm install react-hook-form zod @hookform/resolvers

# 8. Utilities
npm install date-fns

# Dev extras
npm install -D tsx  # For running seed scripts with TypeScript
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Express.js + React SPA | Only if you need a truly standalone API that multiple frontends consume. Overkill for a personal single-user tool. |
| Next.js 16 App Router | SvelteKit | If Armaan preferred Svelte syntax over React. Ecosystem is smaller — fewer shadcn-equivalent components, less Claude API example code floating around. |
| Drizzle ORM | Prisma | Prisma has better docs and a larger community, but ships a binary engine that complicates local deployment and has more runtime overhead. Drizzle is better for SQLite + TypeScript-first projects in 2026. |
| Drizzle ORM | Kysely | Kysely is a solid query builder but has no schema + migration system — you'd need a separate migration tool. Drizzle handles both. |
| better-sqlite3 | @libsql/client | libsql adds Turso remote capability but is heavier. Use it later if migrating to Turso for cloud deployment. For now, better-sqlite3 is simpler and faster locally. |
| shadcn/ui | Mantine | Mantine has more batteries included (data tables, date pickers) but imposes its own design system. shadcn gives full control over the exact aesthetic. Mantine's dark mode is also good — use it only if dev speed is more important than design precision. |
| shadcn/ui | Radix UI bare | shadcn/ui IS Radix UI with styling applied. Don't use Radix bare unless you need a completely custom design system — that's not this project. |
| @tanstack/react-query | SWR | Both are fine for async state. TanStack Query v5 is more powerful and pairs better with TanStack Table (same ecosystem). SWR is fine if you already know it. |
| Tailwind CSS v4 | CSS Modules | CSS Modules are valid but verbose for utility-heavy dark-mode work. Tailwind v4's `dark:` variants are faster to write and more consistent. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma | Ships a binary engine (`prisma-client-js`); adds ~50MB to project; migration runner is separate from query builder; overkill overhead for local SQLite | Drizzle ORM |
| Redux / Zustand | No global client state needed. This app's state lives in SQLite (server) and URL params. Adding a client store adds accidental complexity. | React 19 `useActionState`, URL state, TanStack Query for async |
| Axios | Redundant in 2026. Next.js Server Components use `fetch` natively. TanStack Query's `queryFn` can use fetch directly. | Native `fetch` |
| `sqlite3` (node package) | Async callback API — significantly harder to use correctly than better-sqlite3. The callback style creates nested error handling nightmares inside Server Actions. | better-sqlite3 |
| OpenAI SDK | Wrong API. This project uses Anthropic Claude. Swapping providers mid-build is painful. | @anthropic-ai/sdk |
| Cheerio / Puppeteer for company research | Fragile — breaks when company websites change markup. Rate-limited. IP-blocked. Maintenance burden. | Tavily API (purpose-built for this) |
| `pages/` Router (Next.js) | Legacy. App Router is the current standard. Server Actions only work in App Router. Mix of pages/ and app/ creates confusion. | App Router only |
| CSS-in-JS (Emotion, styled-components) | Poor compatibility with React Server Components (they require client-side JS to run). Tailwind is zero-runtime. | Tailwind CSS |

---

## Stack Patterns by Variant

**For SQLite reads (application list, detail views, dashboard):**
- Use Server Components — query better-sqlite3 directly inside the component
- No API endpoint, no TanStack Query, no loading state needed
- Data is available at render time

**For mutations (add application, update status, generate cover letter):**
- Use Server Actions (`'use server'`) called from Client Components
- Validate with Zod before writing to DB
- Invalidate/revalidate with `revalidatePath()` after write
- No separate REST API endpoint needed

**For AI cover letter generation (long-running, streaming):**
- Create a Next.js Route Handler (`/api/generate-cover-letter/route.ts`)
- Use `@anthropic-ai/sdk` with `client.messages.stream()`
- Return a `ReadableStream` response
- Consume in the client with TanStack Query + `fetch` + streaming reader
- This is the ONE place that needs a traditional API endpoint (streaming requires it)

**For Tavily company research:**
- Call from a Server Action (API key stays server-side)
- Cache result in SQLite `company_research` table with `fetched_at` timestamp
- Check cache first; only call Tavily if cache is stale (> 7 days) or missing
- This preserves the 1,000/month free tier limit

**If deploying later (post-MVP):**
- Swap better-sqlite3 for @libsql/client pointing at Turso
- Drizzle ORM's dialect is compatible — schema stays the same, connection string changes
- No other stack changes needed

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.x | React 19.x | Ships together — don't mix versions |
| drizzle-orm 0.45.x | drizzle-kit 0.31.x | Keep major/minor in sync; mismatches cause migration generation errors |
| drizzle-orm 0.45.x | better-sqlite3 12.x | Fully supported; Drizzle uses better-sqlite3 as its synchronous driver |
| Tailwind CSS 4.x | shadcn/ui (latest) | shadcn/ui supports Tailwind v4 as of 2025. Run `npx shadcn@latest init` — it handles the v4 config automatically |
| zod 4.x | react-hook-form 7.x + @hookform/resolvers | Use `zodResolver` from `@hookform/resolvers/zod`. Works with Zod v4. |
| @tanstack/react-query 5.x | React 19.x | TanStack Query v5 explicitly supports React 19 |
| @tanstack/react-table 8.x | React 19.x | Headless library — framework-agnostic, React version doesn't matter |
| next-themes 0.4.x | Next.js 16.x App Router | Works with App Router. Wrap root layout, not individual pages. |

---

## Environment Variables

```bash
# .env.local (never commit this file)
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
DATABASE_PATH=./data/internship.db  # relative to project root, used in db.ts
```

---

## Sources

- npm registry (live, 2026-03-06) — drizzle-orm@0.45.1, better-sqlite3@12.6.2, @anthropic-ai/sdk@0.78.0, next@16.1.6, tailwindcss@4.2.1, @tavily/core@0.7.2, drizzle-kit@0.31.9, react@19.2.4, zod@4.3.6, react-hook-form@7.71.2, @tanstack/react-query@5.90.21, @tanstack/react-table@8.21.3, lucide-react@0.577.0, clsx@2.1.1, next-themes@0.4.6, date-fns@4.1.0, typescript@5.9.3 — HIGH confidence
- [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/get-started-sqlite) — SQLite driver options, better-sqlite3 integration — HIGH confidence
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) — Node.js >=20, streaming API, server-side key requirement — HIGH confidence
- [Tavily @tavily/core npm](https://www.npmjs.com/package/@tavily/core) — JavaScript/TypeScript SDK, search + extract APIs — MEDIUM confidence
- [Next.js 15 blog](https://nextjs.org/blog/next-15) — React 19 support, Server Actions stable, Turbopack default — HIGH confidence
- [TanStack Query v5 docs](https://tanstack.com/query/v5/docs/framework/react/overview) — Suspense support, React 19 compatibility — HIGH confidence
- [TanStack Table v8 migration guide](https://tanstack.com/table/latest/docs/guide/migrating) — TypeScript-first rewrite, headless architecture — HIGH confidence
- shadcn/ui dark mode + theming (community research, multiple sources) — CSS variable approach, next-themes integration — MEDIUM confidence
- Framework comparison (WebSearch, multiple 2026 sources) — Next.js ecosystem dominance, Drizzle over Prisma for SQLite — MEDIUM confidence

---

*Stack research for: Internship Command Center — personal full-stack dashboard*
*Researched: 2026-03-06*
