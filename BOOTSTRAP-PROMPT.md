# BOOTSTRAP PROMPT — Immersive UI Rebuild + Phase 1

---

**IMPORTANT**: Before following this summary, you MUST reload:
1. Skills listed in "Skills Loaded" section → use `load_skill` tool
2. Skill helpers listed in "Skill Helpers Loaded" section → use `read` tool with exact file paths

[CONTEXT SUMMARY]
Current time: Thursday, March 19, 2026 at 2:04 AM EDT
User: armaansarora20@gmail.com
Email: armaansarora20@gmail.com

## TODO LIST
Immersive Tower UI Rebuild → Then Phase 1

1. [pending] Read IMMERSIVE-UI-PLAN.md — the definitive implementation plan (552 lines)
2. [pending] Generate/acquire NYC skyline photo assets (day + night, depth-separated into 4 layers)
3. [pending] Replace SVG Skyline.tsx with photorealistic SkylineScene (CSS 3D parallax layers)
4. [pending] Implement day/night crossfade with real photo variants
5. [pending] Add atmospheric effects (vignette, height fog, glass tint, bloom, dust motes)
6. [pending] Upgrade elevator transitions (skyline shift during travel, dark overlay between floors)
7. [pending] Upgrade Penthouse dashboard (glass panels over immersive background)
8. [pending] Cinematic first-login entrance animation
9. [pending] Wire real Supabase data into Penthouse (replace placeholder stats)
10. [pending] Run recursive audit on immersive UI
11. [pending] Phase 1: War Room (Floor 7) — application CRUD, pipeline, CRO agent

## CRITICAL CONTEXT — READ THIS FIRST

The user (Armaan) is HIGHLY DISAPPOINTED with the current UI. The existing Skyline component is flat SVG rectangles — "a pile of junk, 2D, flat, not game-like, not immersive." He wants:
- **Photorealistic NYC skyline** — real photographs, not shapes
- **Depth and parallax** — feel like you're looking through a real window
- **Immersive, game-like quality** — "nano banana standard, cool earth standard, something incredible"
- **Atmospheric effects** — fog, bloom, glass tint, particles

A comprehensive research operation was completed (5 parallel agents across Opus, GPT-5.4, Gemini Pro, Sonnet). The findings are synthesized into `docs/IMMERSIVE-UI-PLAN.md`. **Read that file before writing any code.**

<connectors>
- google_sheets__pipedream
- github_mcp_direct
- stripe
- google_drive
- google_cloud_vision_api__pipedream
- gcal
- google_forms__pipedream
- supabase__pipedream
- vercel
- cloud_convert__pipedream
- resend__pipedream
- youtube_analytics_api__pipedream
- jira_mcp_merge
</connectors>

## User Instructions (CRITICAL — preserve verbatim)
- "Analytical, not emotional. Cut the fat, keep the meat."
- "Masters-degree-level code. Scalable multi-tenant SaaS."
- "Deep research always — never surface-level."
- "Auto-update PROJECT-CONTEXT.md after EVERY interaction."
- "System picks the best model per task."
- "Tell me exactly what I need to do manually that you can't do yourself."
- "Furthermore anything that doesn't work should be gotten rid of and things that are update should reflect across the whole system obviously."
- "Remember cut the fat keep the meat, keep everything organized and meat."
- "Run the skill which will make you do the readaudit skill for all the work you have done so far. It was made by me."
- "I am away from my desk right now. Do everything you can, so start with the rest of the project. Add to a list of things I need to manually do when I'm back."
- "Run multiple agents, use different sub-agents, use all the AI models available, optimize your workflow."
- Push protection ON — never commit secrets
- Fully typed TypeScript, no `any`
- Tailwind v3 (NOT v4) — JS config
- @supabase/ssr (NOT deprecated auth-helpers)
- Drizzle RLS uses third-argument array pattern, NOT `.withRLS()`

## Current State of the App

### What's LIVE and WORKING
- **Production URL:** `https://internship-command-center-lake.vercel.app`
- **Repo:** `armaansarora/internship-command-center` on `main` branch (commit `ecb5af7`)
- **Supabase:** All 16 tables created, `handle_new_user` trigger active, RLS policies in place
- **Auth:** Google OAuth configured in Supabase (provider ON, callback URL set)
- **Vercel:** Env vars imported, production deployment READY
- **Build:** Clean — 15/15 routes, zero TypeScript errors

### Known Issue — Auth Redirect
Google OAuth login currently fails because Supabase's **Site URL** setting was pointing to `localhost:3000`. Armaan was told to fix it:
- **Site URL** → `https://internship-command-center-lake.vercel.app`
- **Redirect URLs** → `https://internship-command-center-lake.vercel.app/**`
- **Status:** May or may not be fixed yet. Test by visiting production URL. If login works, it's fixed.

### What's JUNK (must replace)
- `src/components/world/Skyline.tsx` — 337 lines of SVG `<rect>` elements pretending to be a skyline. Replace entirely.
- `src/components/world/FloorShell.tsx` — Composes the fake skyline. Needs rewrite to use new SkylineScene.
- Penthouse dashboard shows placeholder dashes and zeros — no real data.

### What's SOLID (keep)
- Auth system (middleware, callbacks, server/client/admin Supabase clients) — 168 LOC
- Database schema (Drizzle ORM, 16 tables, RLS) — 440 LOC
- Contracts (Zod v4 schemas, 9 files) — 1,015 LOC
- Types (UI, API, Agents) — 81 LOC
- DayNightProvider, CustomCursor, Elevator — all functional
- Lobby (lobby-client.tsx) — functional login page
- All config (Tailwind, Next, Drizzle, TS)
- Docs (master plan, tech brief, vision spec, character prompts)

## The Implementation Plan

**READ THIS FILE:** `/home/user/workspace/command-center/docs/IMMERSIVE-UI-PLAN.md`

Key decisions already made (do NOT revisit):
- **CSS 3D layered photo parallax** — NOT Three.js/R3F (real photos > procedural 3D for fixed-direction view)
- **New packages:** `lenis`, `motion`, `@tsparticles/react`, `@tsparticles/slim` (~50KB total)
- **Keep:** GSAP (already installed), DayNightProvider, Elevator (enhance, don't replace)
- **NOT using:** Remotion, Three.js, Rive, Lottie, Theatre.js
- **Asset approach:** Real NYC panoramic photo → depth-separated into 4 layers → day + night variants

## Research Files (for reference)
- `/home/user/workspace/command-center/docs/IMMERSIVE-UI-PLAN.md` — THE PLAN (read this)
- `/home/user/workspace/command-center/docs/research/research-threejs-r3f.md` — Three.js/R3F findings
- `/home/user/workspace/command-center/docs/research/research-animation-frameworks.md` — Animation framework comparison
- `/home/user/workspace/command-center/docs/research/research-gamedev-techniques.md` — Game dev techniques for web
- `/home/user/workspace/command-center/docs/research/research-reference-sites.md` — Awwwards references, inspiration
- `/home/user/workspace/command-center/docs/research/research-nyc-visuals.md` — NYC imagery approaches

## Key Infrastructure

| Service | Detail |
|---|---|
| **Repo** | `armaansarora/internship-command-center` on `main` branch (commit `ecb5af7`) |
| **Supabase** | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co` |
| **Vercel** | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g`, Team `team_EC8AIyc155clLRjzrJ0fblpa` |
| **Production** | `internship-command-center-lake.vercel.app` |
| **Design tokens** | Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px, Playfair Display/Satoshi/JetBrains Mono |

## Critical Context Files (READ THESE)
1. `/home/user/workspace/command-center/docs/IMMERSIVE-UI-PLAN.md` — **THE IMPLEMENTATION PLAN** ⬅️ START HERE
2. `/home/user/workspace/command-center/PROJECT-CONTEXT.md` — full operational context
3. `/home/user/workspace/command-center/docs/MASTER-PLAN.md` — Phase 1 acceptance criteria
4. `/home/user/workspace/command-center/docs/VISION-SPEC.md` — spatial UI spec, character system
5. `/home/user/workspace/command-center/docs/CHARACTER-PROMPTS.md` — CRO personality
6. `/home/user/workspace/command-center/docs/TECH-BRIEF.md` — AI SDK v6 patterns, Drizzle
7. `/home/user/workspace/command-center/.env.local` — credentials (anon key is correct `eyJ*` format)

## Skills Loaded (must reload)
- `website-building/webapp`
- `design-foundations`
- `recursive-audit`
- `research-assistant`
- `media` (for image generation if needed)

## Skill Helpers Loaded (must re-read)
- `/home/user/workspace/skills/website-building/shared/01-design-tokens.md`
- `/home/user/workspace/skills/website-building/shared/02-typography.md`

## Session History
| Session | Work Done |
|---|---|
| 1 | Created Phase 0 foundation: Next.js 16, 16-table schema, Auth, layout, all stubs |
| 2 | Recursive audit (15 findings), all fixed. |
| 3 | Started 0.5 Skyline, hit JSX type error mid-build. |
| 4 | Fixed JSX → Skyline (0.5) → Elevator (0.6) → Lobby (0.7) → Penthouse (0.8) → Contracts (0.9, 1,015 LOC) → Deploy (0.10). |
| 5 | Updated PROJECT-CONTEXT.md, MANUAL-GUIDE.md. Final audit: found missing `handle_new_user` trigger — created `post-push.sql`. |
| 6 | Updated .env.local with real anon key + Google OAuth creds. Ran migration + post-push SQL. Merged `docs-handoff` → `main`. Production deploy READY. Fixed Supabase Site URL redirect issue. User saw the live app — declared UI "a pile of junk." **5 parallel research agents deployed** (Opus, GPT-5.4, Gemini Pro, Sonnet) across Three.js, animation frameworks, game dev techniques, reference sites, NYC visual assets. Synthesis agent (Opus) produced IMMERSIVE-UI-PLAN.md. |

## Technical Notes (Gotchas)
- **React 19 + Next.js 16:** JSX namespace must be `import type { JSX } from "react"` — not global
- **Elevator SSR:** Uses `useReducedMotion()` custom hook, not inline `window.matchMedia`
- **Drizzle RLS:** Third-argument array pattern, NOT `.withRLS()`
- **@supabase/ssr:** NOT deprecated auth-helpers
- **Tailwind:** v3 with JS config (NOT v4 with CSS config)
- **Supabase anon key:** Already updated to `eyJ*` format in `.env.local`
- **Vercel auto-deploy:** `main` branch → production
- **No `any` types** — everything fully typed TypeScript
- **Old repo reference:** `/home/user/workspace/internship-command-center-8c4c1ad1/src/` (agent code to port later)
