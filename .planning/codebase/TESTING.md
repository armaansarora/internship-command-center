# Testing Patterns

**Analysis Date:** 2026-03-06

## Test Framework

**Runner:** None detected

No testing framework is installed. There are no test runner dependencies in `bike-race/package.json`, no test configuration files (no `jest.config.*`, `vitest.config.*`, `.mocharc.*`), and no test files anywhere in the project (`*.test.*` or `*.spec.*` patterns return zero results).

**Run Commands:**
```bash
# No test commands configured
npm run lint    # Only quality check available
```

## Test File Organization

**Location:** Not applicable — no test files exist in the codebase.

**Naming:** No established pattern.

**Structure:** No established pattern.

## Test Structure

No test suite structure exists. If tests are added, the recommended structure for this Next.js/TypeScript project would be:

```
bike-race/
├── src/
│   ├── game/
│   │   ├── engine.test.ts      # Unit tests for BikeRaceEngine class
│   │   ├── levels.test.ts      # Tests for level generation helpers
│   │   └── sounds.test.ts      # Tests for SoundManager
│   └── components/
│       ├── AuthModal.test.tsx   # Component tests
│       └── Leaderboard.test.tsx # Component tests
└── vitest.config.ts             # Recommended: Vitest (compatible with Vite/Next.js)
```

## Mocking

**Framework:** None — no mocking infrastructure exists.

**What would need mocking for any future tests:**
- Supabase client (`src/lib/supabase.ts`) — all components call `supabase.auth.*` and `supabase.from().*`
- `matter-js` physics engine — `BikeRaceEngine` in `src/game/engine.ts` depends on it heavily
- Web Audio API (`AudioContext`) — `SoundManager` in `src/game/sounds.ts` creates AudioContext instances
- `requestAnimationFrame` / `cancelAnimationFrame` — game loop in `src/components/GameCanvas.tsx`
- `performance.now()` — used in `src/game/engine.ts` for timing
- `localStorage` — used in `src/app/page.tsx` for guest progress persistence

## Fixtures and Factories

**Test Data:** None exists.

**Level data** in `src/game/levels.ts` (exported as `ALL_LEVELS`) could serve as fixture-like test data for engine/renderer tests since it is deterministic and static.

## Coverage

**Requirements:** None enforced — no coverage configuration exists.

**View Coverage:** Not configured.

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present.

## Linting as Quality Gate

The only automated quality check is ESLint:

```bash
npm run lint    # Runs: eslint
```

Config at `bike-race/eslint.config.mjs` extends:
- `eslint-config-next/core-web-vitals` — enforces React/Next.js best practices
- `eslint-config-next/typescript` — TypeScript-specific rules

TypeScript strict mode (`"strict": true` in `tsconfig.json`) acts as a secondary quality gate during build.

## Recommendations for Adding Tests

If tests are added to this project, use **Vitest** (natural fit for Next.js 16 + TypeScript):

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Priority test targets by risk:**
1. `src/game/engine.ts` — `BikeRaceEngine.update()` and `finishRace()` logic (568 lines, no tests, core game logic)
2. `src/game/levels.ts` — `generateTerrain()` and `getLevelsByWorld()` (1184 lines, algorithmic terrain generation)
3. `src/app/page.tsx` — `handleFinish()` star calculation and unlock logic (side effects with Supabase)
4. `src/components/AuthModal.tsx` — sign up / sign in flow with error handling

**Recommended mock setup for Supabase:**
```typescript
// In test setup file
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }),
  },
}));
```

---

*Testing analysis: 2026-03-06*
