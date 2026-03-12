# Architecture

**Analysis Date:** 2026-03-06

## Pattern Overview

**Overall:** Single-page application with a client-side game engine, screen-based navigation, and optional cloud persistence.

**Key Characteristics:**
- All UI rendering happens client-side via React (`'use client'` throughout)
- Game logic is fully decoupled from React — a plain TypeScript class (`BikeRaceEngine`) drives physics
- A separate renderer class (`GameRenderer`) handles canvas drawing, consuming engine state
- Navigation is a finite state machine managed with a single `screen` state string in `src/app/page.tsx`
- Persistence is dual-mode: Supabase for authenticated users, `localStorage` for guests

## Layers

**Navigation / Application Shell:**
- Purpose: Owns all shared state, orchestrates screen transitions, syncs auth and progress with Supabase
- Location: `src/app/page.tsx`
- Contains: `Screen` type union, bike/world/level data constants, session loading, finish/unlock handlers
- Depends on: All UI components, game types/levels, Supabase client, sounds
- Used by: Next.js router (this is the root `page.tsx`)

**UI Components:**
- Purpose: Stateless (or lightly stateful) presentational screens rendered based on the current `screen` value
- Location: `src/components/`
- Contains: `MainMenu`, `WorldSelect`, `LevelSelect`, `BikeShop`, `Leaderboard`, `AuthModal`, `GameCanvas`
- Depends on: `@/game/types`, `@/game/sounds`, `@/lib/supabase` (Leaderboard, AuthModal only)
- Used by: `src/app/page.tsx`

**Game Engine:**
- Purpose: Pure physics simulation using Matter.js. Manages bike body, terrain segments, collision events, star timing, and camera position
- Location: `src/game/engine.ts`
- Contains: `BikeRaceEngine` class — `init()`, `start()`, `update(delta)`, `reset()`, `destroy()`
- Depends on: `matter-js`, `@/game/types`
- Used by: `src/components/GameCanvas.tsx`

**Game Renderer:**
- Purpose: Canvas 2D drawing layer. Reads engine state each frame; draws sky, terrain, decorations, bike, particles, HUD, and overlays
- Location: `src/game/renderer.ts`
- Contains: `GameRenderer` class — `render()` called each animation frame
- Depends on: `@/game/engine`, `@/game/types`
- Used by: `src/components/GameCanvas.tsx`

**Game Support Modules:**
- Purpose: Shared utilities consumed by both engine and UI layers
- Location: `src/game/`
- Contains:
  - `types.ts` — all TypeScript interfaces (`BikeStats`, `WorldData`, `LevelData`, `GameState`, `Controls`, `PlayerProgress`, `LeaderboardEntry`)
  - `levels.ts` — `generateTerrain()` helper, all level definitions exported as `ALL_LEVELS`, `getLevelsByWorld()`, `getLevelById()`
  - `sounds.ts` — singleton `SoundManager` class using Web Audio API, exported as `sounds`
  - `useControls.ts` — `useControls()` React hook (keyboard) and `useTouchControls()` React hook (touch events)
- Depends on: `@/game/types` (engine, renderer, useControls)
- Used by: `GameCanvas`, `page.tsx`, other components

**Data / Auth Layer:**
- Purpose: Supabase client singleton for auth and database queries
- Location: `src/lib/supabase.ts`
- Contains: `createClient()` call, exported as `supabase`
- Depends on: `@supabase/supabase-js`, env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Used by: `page.tsx`, `AuthModal.tsx`, `Leaderboard.tsx`

## Data Flow

**Game Loop (during active gameplay):**

1. `GameCanvas` mounts → creates `BikeRaceEngine` and `GameRenderer` instances
2. `requestAnimationFrame` loop starts; each tick: `controlsRef.current` synced to `engine.controls`
3. `engine.update(delta)` runs physics substeps, applies player forces, updates `gameState`
4. `renderer.render()` reads `engine.gameState`, `engine.bike` positions, `engine.trackData` — draws canvas
5. On finish/crash: `GameCanvas` calls `onFinish(stars, time)` → `handleFinish()` in `page.tsx`

**Progress Persistence Flow:**

1. Level finish → `handleFinish()` in `src/app/page.tsx` computes new star counts
2. If authenticated: upserts to Supabase tables `progress`, `leaderboards`, `bike_unlocks`, `profiles`
3. If guest: writes to `localStorage` key `bikerace_progress` as JSON

**Authentication Flow:**

1. User clicks Sign In → `showAuth` state set to `true` → `AuthModal` renders
2. `AuthModal` calls `supabase.auth.signUp` or `supabase.auth.signInWithPassword`
3. On success: `onAuth(userId, username)` callback → `page.tsx` sets `userId`/`username`, calls `loadSession()`
4. `loadSession()` fetches `profiles`, `progress`, `bike_unlocks` rows and hydrates React state

**Screen Navigation Flow:**

```
menu → worlds → levels → game → (back to levels on finish)
menu → bikeshop → menu
menu → leaderboard → menu
```

All transitions are `setScreen(...)` calls; the `page.tsx` renders the appropriate component via conditional JSX.

**State Management:**

All shared state lives in `page.tsx` as `useState` hooks:
- `screen`: current navigation state
- `progress`: `Record<string, PlayerProgress>` keyed by level ID
- `unlockedBikes`: string array of unlocked bike IDs
- `selectedBikeId`: currently equipped bike
- `userId` / `username`: auth identity
- `selectedWorldId` / `selectedLevelId`: navigation context

Game-internal state (positions, physics) lives entirely inside `BikeRaceEngine` instance, not in React.

## Key Abstractions

**BikeRaceEngine:**
- Purpose: Encapsulates the entire physics simulation for one race run
- Examples: `src/game/engine.ts`
- Pattern: Imperative class with lifecycle methods (`init`, `start`, `update`, `reset`, `destroy`). Exposes `gameState`, `controls`, `bike`, `trackData` as public properties for the renderer to read.

**GameRenderer:**
- Purpose: Separates rendering concern from game logic
- Examples: `src/game/renderer.ts`
- Pattern: Reads engine state, never writes to it. All visual themes defined via `THEMES` record keyed by `backgroundTheme` string.

**LevelData / TrackData:**
- Purpose: Data-driven level definition
- Examples: `src/game/levels.ts`, `src/game/types.ts`
- Pattern: Terrain is procedurally generated from a `segments` descriptor array via `generateTerrain()`. Each level exports `starTimes` for 1/2/3-star thresholds.

**Screen Union Type:**
- Purpose: Typed navigation state
- Examples: `src/app/page.tsx` line 18
- Pattern: `type Screen = 'menu' | 'worlds' | 'levels' | 'game' | 'bikeshop' | 'leaderboard'`

## Entry Points

**Next.js Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All page loads
- Responsibilities: Sets metadata, viewport (no zoom), applies Geist fonts, wraps children in `<html><body>`

**Root Page Component:**
- Location: `src/app/page.tsx`
- Triggers: Route `/`
- Responsibilities: Owns all app state, loads session on mount, renders current screen's component, handles all cross-screen callbacks

**GameCanvas Component:**
- Location: `src/components/GameCanvas.tsx`
- Triggers: `screen === 'game'` in `page.tsx`; dynamically imported with `ssr: false`
- Responsibilities: Creates engine + renderer, runs the `requestAnimationFrame` loop, mounts keyboard/touch controls, triggers `onFinish` callback

## Error Handling

**Strategy:** Try/catch on async Supabase calls with local error state displayed inline. Silent catch blocks for non-critical paths (JSON parse, audio).

**Patterns:**
- `AuthModal`: try/catch → `setError(err.message)` displayed in form
- `page.tsx` `loadSession()`: no error handling — Supabase failures silently skip loading data
- `sounds.ts`: try/catch around every Web Audio API call — audio failure never surfaces to user
- `localStorage` parse: bare `catch {}` in `page.tsx` — corrupt save data silently ignored

## Cross-Cutting Concerns

**Logging:** None — no structured logging anywhere. Console not used outside of browser dev tools.

**Validation:** None server-side. Client-side HTML form `required`, `minLength`, `maxLength` attributes only (in `AuthModal`).

**Authentication:** Optional. Users can play as guests (userId = `'guest'`). Auth state gates Supabase writes but not gameplay. Session loaded once on mount via `supabase.auth.getSession()`.

---

*Architecture analysis: 2026-03-06*
