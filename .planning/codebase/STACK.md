# Technology Stack

**Analysis Date:** 2026-03-06

## Languages

**Primary:**
- TypeScript 5.x - All application code in `bike-race/src/`
- CSS - Styling via `bike-race/src/app/globals.css`

**Secondary:**
- JavaScript - Standalone HTML games at root (`index.html`, `flappy-bird.html`)
- HTML - Self-contained canvas games at project root

## Runtime

**Environment:**
- Node.js v24.13.1

**Package Manager:**
- npm 11.8.0
- Lockfile: present (`bike-race/package-lock.json`, lockfileVersion 3)

## Frameworks

**Core:**
- Next.js 16.1.6 - App Router, React Server Components, SSR/SSG platform
  - Config: `bike-race/next.config.ts`
  - React Compiler enabled via `reactCompiler: true` in next config
- React 19.2.3 - UI component library
- React DOM 19.2.3 - Browser rendering

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
  - PostCSS plugin: `@tailwindcss/postcss` ^4
  - Config: `bike-race/postcss.config.mjs`
  - Imported via `@import "tailwindcss"` in `bike-race/src/app/globals.css`
  - Used heavily via inline Tailwind classes throughout all components

**Build/Dev:**
- TypeScript 5.x compiler - `bike-race/tsconfig.json`
  - Target: ES2017
  - Strict mode enabled
  - Path alias: `@/*` → `./src/*`
  - Module resolution: `bundler`
- ESLint 9.x - Code linting
  - Config: `bike-race/eslint.config.mjs`
  - Rules: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- babel-plugin-react-compiler 1.0.0 - React compiler Babel plugin

## Key Dependencies

**Critical:**
- `matter-js` ^0.20.0 - 2D rigid body physics engine used for bike simulation, terrain, constraints, and collision detection (`bike-race/src/game/engine.ts`)
  - `@types/matter-js` ^0.20.2 - TypeScript types for matter-js
- `@supabase/supabase-js` ^2.98.0 - Supabase client for database and auth (`bike-race/src/lib/supabase.ts`)
- `@supabase/ssr` ^0.9.0 - Supabase SSR helpers for Next.js

**Infrastructure:**
- `next/font/google` - Geist and Geist Mono fonts loaded via Next.js font optimization (`bike-race/src/app/layout.tsx`)
- Web Audio API - Browser-native, used for procedural sound effects in `bike-race/src/game/sounds.ts`
- HTML5 Canvas API - Browser-native, used for game rendering in `bike-race/src/components/GameCanvas.tsx`

## Configuration

**Environment:**
- Environment variables loaded from `.env.local` (present at `bike-race/.env.local`)
- Required vars (referenced in `bike-race/src/lib/supabase.ts`):
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- Both vars are `NEXT_PUBLIC_` prefixed, meaning they are exposed to the browser bundle

**Build:**
- `bike-race/next.config.ts` - Next.js configuration (React Compiler enabled)
- `bike-race/tsconfig.json` - TypeScript configuration with incremental builds
- `bike-race/postcss.config.mjs` - PostCSS with Tailwind CSS v4 plugin
- `bike-race/eslint.config.mjs` - ESLint flat config

## Platform Requirements

**Development:**
- Node.js v24+ recommended (tested on v24.13.1)
- npm 11+
- Run: `npm run dev` (starts `next dev`)

**Production:**
- Build: `npm run build` (runs `next build`)
- Start: `npm start` (runs `next start`)
- Deployment target: Vercel (evidenced by `public/vercel.svg` and standard Next.js setup)
- SSR-enabled; game canvas loaded client-side only via `dynamic(() => import(...), { ssr: false })`

---

*Stack analysis: 2026-03-06*
