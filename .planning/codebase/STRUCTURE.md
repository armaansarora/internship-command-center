# Codebase Structure

**Analysis Date:** 2026-03-06

## Directory Layout

```
Claude Code/                    # Workspace root (git repo)
├── bike-race/                  # Next.js game application
│   ├── src/
│   │   ├── app/                # Next.js App Router entry points
│   │   │   ├── layout.tsx      # Root layout (fonts, metadata, viewport)
│   │   │   ├── page.tsx        # Root page — all app state & navigation
│   │   │   ├── globals.css     # Tailwind base styles
│   │   │   └── favicon.ico
│   │   ├── components/         # UI screen components
│   │   │   ├── GameCanvas.tsx  # Canvas game host (engine + renderer wiring)
│   │   │   ├── MainMenu.tsx    # Start screen
│   │   │   ├── WorldSelect.tsx # World picker
│   │   │   ├── LevelSelect.tsx # Level grid per world
│   │   │   ├── BikeShop.tsx    # Bike unlock/equip screen
│   │   │   ├── Leaderboard.tsx # Global leaderboard (Supabase query)
│   │   │   └── AuthModal.tsx   # Sign in / sign up modal
│   │   ├── game/               # Game engine and support modules
│   │   │   ├── types.ts        # All TypeScript interfaces
│   │   │   ├── engine.ts       # BikeRaceEngine class (Matter.js physics)
│   │   │   ├── renderer.ts     # GameRenderer class (Canvas 2D drawing)
│   │   │   ├── levels.ts       # Level definitions + generateTerrain()
│   │   │   ├── sounds.ts       # SoundManager singleton (Web Audio API)
│   │   │   └── useControls.ts  # useControls + useTouchControls hooks
│   │   └── lib/
│   │       └── supabase.ts     # Supabase client singleton
│   ├── public/                 # Static assets served at root
│   ├── next.config.ts          # Next.js config (reactCompiler: true)
│   ├── tsconfig.json           # TypeScript config (strict, @/* alias)
│   ├── eslint.config.mjs       # ESLint config
│   ├── postcss.config.mjs      # PostCSS / Tailwind config
│   └── package.json            # Dependencies
├── flappy-bird.html            # Standalone HTML5 game (unrelated)
├── index.html                  # Standalone HTML file (unrelated)
└── .planning/
    └── codebase/               # GSD analysis documents
```

## Directory Purposes

**`bike-race/src/app/`:**
- Purpose: Next.js App Router directory. Defines the application shell and the single routed page.
- Contains: `layout.tsx` (root layout), `page.tsx` (entire navigation and state), `globals.css`
- Key files: `src/app/page.tsx` is the most important file — all application state lives here

**`bike-race/src/components/`:**
- Purpose: One file per screen. Each component is a self-contained UI screen passed callbacks from `page.tsx`. No component directly mutates shared state — all changes flow through callback props.
- Contains: Screen components (`MainMenu`, `WorldSelect`, `LevelSelect`, `GameCanvas`, `BikeShop`, `Leaderboard`, `AuthModal`)
- Key files: `src/components/GameCanvas.tsx` — the only component that creates class instances and runs a game loop

**`bike-race/src/game/`:**
- Purpose: All game logic, entirely framework-agnostic (except `useControls.ts` which uses React hooks). Can be tested and run independently of Next.js.
- Contains: Type definitions, physics engine, renderer, level data, audio, controls hooks
- Key files: `src/game/engine.ts`, `src/game/renderer.ts`, `src/game/types.ts`, `src/game/levels.ts`

**`bike-race/src/lib/`:**
- Purpose: Shared infrastructure singletons.
- Contains: `supabase.ts` — the single Supabase client used across the app
- Key files: `src/lib/supabase.ts`

**`bike-race/public/`:**
- Purpose: Static files served at root URL. Currently contains default Next.js placeholder assets.
- Generated: No
- Committed: Yes

## Key File Locations

**Entry Points:**
- `bike-race/src/app/layout.tsx`: Root HTML shell, font loading, viewport config
- `bike-race/src/app/page.tsx`: Root page — navigation state machine, all shared state, Supabase session

**Configuration:**
- `bike-race/next.config.ts`: Next.js config (React Compiler enabled)
- `bike-race/tsconfig.json`: TypeScript config; defines `@/*` → `./src/*` path alias
- `bike-race/postcss.config.mjs`: Tailwind CSS v4 integration
- `bike-race/eslint.config.mjs`: ESLint with Next.js rules
- `bike-race/.env.local`: Required env vars (not committed) — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Core Logic:**
- `bike-race/src/game/engine.ts`: `BikeRaceEngine` — all physics, collision, game state
- `bike-race/src/game/renderer.ts`: `GameRenderer` — all canvas drawing
- `bike-race/src/game/types.ts`: Canonical type definitions for the entire codebase
- `bike-race/src/game/levels.ts`: Level data, `ALL_LEVELS` export, `getLevelsByWorld()`, `getLevelById()`
- `bike-race/src/lib/supabase.ts`: Supabase client (`supabase` named export)

**Testing:**
- No test files or testing framework present

## Naming Conventions

**Files:**
- React components: PascalCase `.tsx` (e.g., `GameCanvas.tsx`, `MainMenu.tsx`)
- Non-component TypeScript modules: camelCase `.ts` (e.g., `engine.ts`, `sounds.ts`, `useControls.ts`)
- Config files: camelCase or framework-prescribed (e.g., `next.config.ts`, `postcss.config.mjs`)

**Directories:**
- All lowercase (e.g., `app/`, `components/`, `game/`, `lib/`)

**Exports:**
- Components: default export from each file
- Engine/Renderer: named class exports (`BikeRaceEngine`, `GameRenderer`)
- Types: named interface exports from `types.ts`
- Singletons: named exports (`supabase`, `sounds`)
- Hooks: named function exports (`useControls`, `useTouchControls`)

**Types and Interfaces:**
- PascalCase with descriptive suffixes: `BikeStats`, `WorldData`, `LevelData`, `GameState`, `TrackData`, `PlayerProgress`

## Where to Add New Code

**New UI Screen:**
- Implementation: `bike-race/src/components/NewScreen.tsx`
- Wire up: Add new screen name to `Screen` type in `bike-race/src/app/page.tsx`, add conditional render block and handler callbacks

**New Game Feature (physics / simulation):**
- Implementation: `bike-race/src/game/engine.ts` (extend `BikeRaceEngine`) or create a new module in `bike-race/src/game/`
- Types: Add interfaces to `bike-race/src/game/types.ts`

**New Level:**
- Implementation: `bike-race/src/game/levels.ts` — add a new level object using `generateTerrain()` and push to `ALL_LEVELS`

**New World:**
- Data: Add to `DEFAULT_WORLDS` array in `bike-race/src/app/page.tsx`
- Visual theme: Add entry to `THEMES` record in `bike-race/src/game/renderer.ts`
- Level select colors: Add entry to `THEME_COLORS` in `bike-race/src/components/LevelSelect.tsx`
- World select colors: Add entry to `WORLD_COLORS` in `bike-race/src/components/WorldSelect.tsx`

**New Bike:**
- Data: Add to `DEFAULT_BIKES` array in `bike-race/src/app/page.tsx`
- Color: Add to `BIKE_COLORS` in `bike-race/src/components/BikeShop.tsx` and `getBikeColor()` in `bike-race/src/game/renderer.ts`

**Shared Utilities / Helpers:**
- Add to `bike-race/src/lib/` for infrastructure concerns
- Add to `bike-race/src/game/` for game-domain utilities

**New Sound Effect:**
- Add method to `SoundManager` class in `bike-race/src/game/sounds.ts`, then call via the `sounds` singleton

## Special Directories

**`bike-race/.next/`:**
- Purpose: Next.js build output and dev server cache
- Generated: Yes (by `next build` / `next dev`)
- Committed: No (in `.gitignore`)

**`bike-race/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No

**`.planning/codebase/`:**
- Purpose: GSD analysis documents consumed by `/gsd:plan-phase` and `/gsd:execute-phase`
- Generated: Yes (by `/gsd:map-codebase`)
- Committed: Yes

---

*Structure analysis: 2026-03-06*
