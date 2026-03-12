# Coding Conventions

**Analysis Date:** 2026-03-06

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `AuthModal.tsx`, `GameCanvas.tsx`, `BikeShop.tsx`
- Game modules (non-component): camelCase `.ts` — `engine.ts`, `renderer.ts`, `levels.ts`, `sounds.ts`, `types.ts`
- React hooks: camelCase `.ts` prefixed with `use` — `useControls.ts`
- Next.js special files: lowercase — `page.tsx`, `layout.tsx`, `globals.css`
- Library files: camelCase — `supabase.ts`

**Functions:**
- Event handlers: `handle` prefix — `handleSubmit`, `handleFinish`, `handleUnlockBike`, `handleAuth`
- Loader functions: `load` prefix — `loadSession`, `loadLeaderboard`
- React components: PascalCase — `Home`, `AuthModal`, `GameCanvas`
- Game engine methods: camelCase — `createTerrain()`, `createBike()`, `setupCollisions()`, `updateCamera()`
- Utility/helper functions: camelCase — `formatTime()`, `generateTerrain()`, `smoothPoints()`
- Hooks: `use` prefix camelCase — `useControls`, `useTouchControls`

**Variables:**
- Local state: camelCase — `selectedWorldId`, `unlockedBikes`, `totalStars`
- Constants/config data: SCREAMING_SNAKE_CASE for module-level — `DEFAULT_BIKES`, `DEFAULT_WORLDS`, `BIKE_COLORS`, `THEMES`
- Private class fields: camelCase with `_` prefix for backing fields — `_targetSpeed`, `_starTimes`
- Private class fields (truly private): `private` keyword without prefix — `lastAngle`, `isAirborne`, `cameraX`
- Ref variables: suffix `Ref` — `canvasRef`, `engineRef`, `rafRef`, `lastTimeRef`, `prevFlipsRef`
- Timer refs: suffix `Timer` — `engineSoundTimer`

**Types/Interfaces:**
- Interfaces: PascalCase — `BikeStats`, `WorldData`, `LevelData`, `GameState`, `Controls`
- Prop interfaces: component name + `Props` suffix — `GameCanvasProps`, `AuthModalProps`, `BikeShopProps`
- Local interface types: PascalCase inline in file — `LeaderboardRow`, `ThemeColors`, `LevelDef`
- Type unions: PascalCase — `type Screen = 'menu' | 'worlds' | 'levels' | 'game' | 'bikeshop' | 'leaderboard'`
- All types and interfaces centralized in `src/game/types.ts` for shared game types

## Code Style

**Formatting:**
- No Prettier config file detected — formatting relies on ESLint and editor defaults
- Indentation: 2 spaces throughout
- Trailing commas in multi-line arrays/objects
- Single quotes for strings in TypeScript files (consistent)
- Arrow functions for inline callbacks

**Linting:**
- ESLint 9 flat config at `bike-race/eslint.config.mjs`
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- React Compiler enabled (`reactCompiler: true` in `next.config.ts`) — handles memoization automatically

**TypeScript:**
- All files use strict TypeScript — no `any` unless forced (one case in `Leaderboard.tsx`: `Record<string, unknown>`)
- Non-null assertion operator (`!`) used for env vars and guaranteed refs — `process.env.NEXT_PUBLIC_SUPABASE_URL!`
- Optional chaining used throughout — `session?.user`, `engine?.start()`, `bike.unlockRequirement?.match()`
- Nullish coalescing for defaults — `progress[l.id]?.stars || 0`, `data.progress || {}`
- `unknown` preferred over `any` for caught errors — `catch (err: unknown)`

## Import Organization

**Order (observed pattern):**
1. React/Next.js core — `import { useState, useEffect, useCallback } from 'react'`
2. Next.js utilities — `import dynamic from 'next/dynamic'`
3. Internal components — `import MainMenu from '@/components/MainMenu'`
4. Game modules — `import { BikeRaceEngine } from '@/game/engine'`
5. Library clients — `import { supabase } from '@/lib/supabase'`
6. Types — `import { BikeStats, WorldData } from '@/game/types'`

**Path Aliases:**
- `@/*` maps to `./src/*` — defined in `tsconfig.json`
- All internal imports use `@/` prefix — never relative paths in components

**'use client' directive:**
- All components and pages that use hooks, browser APIs, or event handlers declare `'use client'` at top of file
- `src/app/layout.tsx` is server component (no 'use client')
- `src/game/levels.ts` is server-safe module (no browser APIs, no directive)

## Error Handling

**Supabase queries:**
- Destructure `{ data, error }` from every query
- Two patterns in use:
  1. Guard-and-proceed: `if (!error && data) { ... }` (in `Leaderboard.tsx`)
  2. Throw-on-error: `if (signUpError) throw signUpError` (in `AuthModal.tsx`)
- Error messages surfaced to UI state: `setError(err instanceof Error ? err.message : 'Something went wrong')`

**LocalStorage:**
- Wrapped in `try/catch` with silent ignore for parse failures:
  ```typescript
  try {
    const data = JSON.parse(saved);
    setProgress(data.progress || {});
  } catch {
    // ignore
  }
  ```

**Web Audio API:**
- All audio operations wrapped in `try/catch` with silent ignore (browser compatibility):
  ```typescript
  try {
    const ctx = this.getCtx();
    // ... audio operations
  } catch {
    // Audio not available
  }
  ```

**Game state errors:**
- Physics crash detection via collision events and position checks — sets `gameState.status = 'crashed'`
- Guard early returns on null refs: `if (!engineRef.current || !this.bike) return`

## Logging

**No logging framework** — zero `console.log`, `console.warn`, or `console.error` calls in the codebase. Silent error handling via `try/catch` with empty catch blocks is the pattern for non-critical failures.

## Comments

**When to Comment:**
- Numbered step markers for long multi-phase functions: `// --- 1. PHYSICS SUBSTEPS ---`, `// --- 2. SPEED CONTROL ---`
- Inline explanations for non-obvious physics constants: `// For long segments (>80px), subdivide to create smoother terrain`
- Section markers in JSX: `{/* Back button */}`, `{/* Engine sound */}`
- Brief clarifications for workarounds: `// collisionActive no longer needed for airborne detection (using position-based)`

**No JSDoc** — functions have no documentation comments. Types serve as primary documentation.

## Function Design

**Size:**
- Small utility functions: 3–15 lines — `formatTime()`, `isUnlocked()`, `canUnlock()`
- Event handlers: 10–30 lines
- Core game methods: up to 130 lines (`update()` in `engine.ts`) with numbered step markers
- Async data loaders: 15–50 lines

**Parameters:**
- Component props destructured in function signature: `function AuthModal({ onClose, onAuth }: AuthModalProps)`
- Callback handlers use `useCallback` with deps array for stable references
- Optional callbacks typed with `?`: `onStart?: () => void`

**Return Values:**
- Components return JSX
- Utility functions return typed primitives — `formatTime(seconds: number): string`
- Async loaders return `void` (side effects via `setState`)

## Module Design

**Exports:**
- Components: single `export default` named after the component
- Game classes: named `export class` — `export class BikeRaceEngine`
- Singletons: named `export const` — `export const sounds = new SoundManager()`
- Types: named `export interface` from `src/game/types.ts`
- Level data: named exports — `export const ALL_LEVELS`, helper functions `getLevelsByWorld`, `getLevelById`

**No barrel files** — each module imported directly from its file path.

## React Patterns

**State Management:**
- All state lifted to root `page.tsx` — single source of truth for game progression
- Components are stateless where possible; accept callbacks for mutations
- `useRef` used for mutable values that don't trigger renders: `engineRef`, `controlsRef`, `rafRef`

**Effects:**
- `useEffect` with empty deps `[]` for one-time initialization
- `useEffect` with specific deps for reactive data loading
- Cleanup functions returned from all effects that register event listeners or animation frames

**Dynamic imports:**
- `GameCanvas` loaded with `dynamic(() => import(...), { ssr: false })` to prevent server-side canvas access

## HTML/Single-File Games

**flappy-bird.html and index.html:**
- Vanilla JavaScript, no framework
- Constants declared at top in SCREAMING_SNAKE_CASE — `GAME_WIDTH`, `GAME_HEIGHT`
- `camelCase` for all functions and variables
- State managed via plain objects and globals

---

*Convention analysis: 2026-03-06*
