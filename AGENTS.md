# The Tower — AI Agent Guidelines

## Project-Specific Rules
- Next.js 16 App Router — Server Components by default, `"use client"` only when needed
- Tailwind v3 with JS config (`tailwind.config.ts`) — NOT v4
- @supabase/ssr for auth — NOT deprecated `@supabase/auth-helpers-nextjs`
- Drizzle RLS uses third-argument array pattern, NOT `.withRLS()`
- Fully typed TypeScript — no `any`
- All DB tables have RLS policies: `auth.uid() = user_id`
- Zod v4 for validation
- Design tokens: Gold `#C9A84C`, Dark `#1A1A2E`, Glass `backdrop-filter blur(16px)`
- Fonts: Playfair Display (headings), Satoshi (body), JetBrains Mono (data)

## Key Docs
Read `PROJECT-CONTEXT.md` first, then the relevant doc from `docs/`.
