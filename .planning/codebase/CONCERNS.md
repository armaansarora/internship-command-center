# Codebase Concerns

**Analysis Date:** 2026-03-06

## Tech Debt

**Bike unlock requirement parsed by regex instead of structured data:**
- Issue: Unlock thresholds are buried in human-readable strings (`"Earn 15 stars"`) and extracted with `parseInt(bike.unlockRequirement?.match(/\d+/)?.[0] || '999')`. This pattern is duplicated in two places and is fragile.
- Files: `bike-race/src/app/page.tsx:159`, `bike-race/src/components/BikeShop.tsx:34`
- Impact: Adding or renaming bikes with different requirement text silently breaks unlock logic. The regex discards the entire requirement string except the first number, making future requirements like "Complete level X" impossible without code changes.
- Fix approach: Add a `starsRequired: number` field to `BikeStats` in `bike-race/src/game/types.ts` and use it directly, keeping `unlockRequirement` as display text only.

**Bike and world data hardcoded in page component:**
- Issue: `DEFAULT_BIKES` (7 items) and `DEFAULT_WORLDS` (5 items) are declared as constants directly inside `bike-race/src/app/page.tsx` (lines 20-36). This game data belongs in `src/game/` alongside levels.
- Files: `bike-race/src/app/page.tsx:20-36`
- Impact: The page component is responsible for both routing/state and holding canonical game data. Any other component needing bike/world data must import from the page or receive it as props, making reuse difficult.
- Fix approach: Move `DEFAULT_BIKES` to `bike-race/src/game/bikes.ts` and `DEFAULT_WORLDS` to `bike-race/src/game/worlds.ts`. Export as named exports and import into `page.tsx`.

**`formatTime` function duplicated three times:**
- Issue: An identical `formatTime(seconds: number): string` function is defined in `bike-race/src/components/LevelSelect.tsx:106`, `bike-race/src/components/Leaderboard.tsx:138`, and `bike-race/src/game/renderer.ts:632`.
- Files: `bike-race/src/components/LevelSelect.tsx:106`, `bike-race/src/components/Leaderboard.tsx:138`, `bike-race/src/game/renderer.ts:632`
- Impact: Any fix to time formatting (e.g. padding, display for hours) must be applied in three places.
- Fix approach: Extract to `bike-race/src/lib/formatTime.ts` and import everywhere it is used.

**`BIKE_COLORS` map duplicated:**
- Issue: The same `Record<string, string>` mapping bike IDs to color hex values exists in both `bike-race/src/components/BikeShop.tsx:17-25` and `bike-race/src/game/renderer.ts:455-466` (`getBikeColor`).
- Files: `bike-race/src/components/BikeShop.tsx:17-25`, `bike-race/src/game/renderer.ts:455-466`
- Impact: Adding a new bike requires updating two separate files; colors can diverge.
- Fix approach: Export from the bike data file (once `bikes.ts` is created) and import in both locations.

**Levels file is a 1184-line monolith of raw data:**
- Issue: `bike-race/src/game/levels.ts` is a single file containing a `generateTerrain` helper, 25+ level definitions, and `ALL_LEVELS`/export helpers — all in one 1184-line file.
- Files: `bike-race/src/game/levels.ts`
- Impact: Adding a new world requires editing this single large file. The file is slow to navigate and difficult to review changes against.
- Fix approach: Split into per-world files (e.g. `levels/desert.ts`, `levels/arctic.ts`) with a barrel `levels/index.ts` that re-exports `ALL_LEVELS`.

**`collisionActive` event listener is a no-op:**
- Issue: `Events.on(this.engine, 'collisionActive', () => {})` registers an empty callback and a comment says it is "no longer needed".
- Files: `bike-race/src/game/engine.ts:344-345`
- Impact: Minor memory/CPU waste; the corresponding `Events.off` call in `destroy()` passes a new anonymous function reference, so the listener is never actually removed.
- Fix approach: Remove both the `collisionActive` registration (line 345) and its `Events.off` call in `destroy()` (line 564).

**`destroy()` uses new anonymous functions for `Events.off`, so listeners are never removed:**
- Issue: Matter.js `Events.off` requires the same function reference that was passed to `Events.on`. `destroy()` passes `() => {}` (a new function each call), so the original `collisionStart` handler is never unregistered.
- Files: `bike-race/src/game/engine.ts:563-564`
- Impact: If a component re-mounts (e.g. retrying a level), the old collision listener remains active on the engine. Multiple `finishRace()` or `crash()` calls can fire for one collision event, causing state corruption.
- Fix approach: Store the collision handler as a class property (`private onCollisionStart = (event) => { ... }`) and pass that reference to both `Events.on` and `Events.off`.

**Terrain Y snap overrides physics and can phase through terrain on fast bikes:**
- Issue: The engine force-sets wheel Y positions every tick to prevent clipping (lines 391-405 in `engine.ts`). This bypasses Matter.js contact resolution and can produce jitter or allow the bike to clip through steep terrain segments when `_targetSpeed` is high.
- Files: `bike-race/src/game/engine.ts:391-405`
- Impact: Physics feel inconsistent at high speed; clipping bugs are possible on sharp downward slopes.
- Fix approach: Replace position override with a downward force proportional to penetration depth; let the physics engine resolve the contact.

**`loadSession` called inside `handleAuth` callback but is not memoized:**
- Issue: `loadSession` is a regular `async function` inside `Home` (not wrapped in `useCallback`). `handleAuth` is memoized with `useCallback` but calls `loadSession()` directly. If the component re-renders before auth completes, `loadSession` gets a stale closure.
- Files: `bike-race/src/app/page.tsx:61-109`, `bike-race/src/app/page.tsx:121-128`
- Impact: Rare race condition: if the component re-renders between sign-in and the session fetch completing, state setters (`setProgress`, `setUnlockedBikes`) may be called on a stale reference.
- Fix approach: Wrap `loadSession` in `useCallback` with the same dependencies as `handleAuth`.

## Known Bugs

**Star count hardcoded as `/24` in WorldSelect:**
- Symptoms: The world card footer always shows `X/24` regardless of how many levels the world has.
- Files: `bike-race/src/components/WorldSelect.tsx:90`
- Trigger: Visible immediately for any world with fewer or more than 8 levels (8 levels × 3 stars = 24).
- Workaround: None; incorrect number is always shown.

**Leaderboard silently swallows fetch errors:**
- Symptoms: If the Supabase query fails, `setEntries` is not called and the loading spinner is removed, leaving an empty "No records yet" state with no user feedback.
- Files: `bike-race/src/components/Leaderboard.tsx:42-49`
- Trigger: Network error or Supabase outage while viewing leaderboard.
- Workaround: None; user cannot distinguish a network error from a genuinely empty leaderboard.

**`finishRace()` can be called multiple times per crossing:**
- Symptoms: Both a position check (line 477) and a collision sensor fire `finishRace()`. After `status` is set to `'finished'`, the position check still runs every tick, but since it re-checks `this.bike.frame.position.x >= finishX` (still true) and does not guard with `if status !== playing`, the function would re-trigger. The guard inside `finishRace` (`if gameState.status !== 'playing') return`) prevents double-execution, but this relies on the guard rather than proper deduplication.
- Files: `bike-race/src/game/engine.ts:476-479`, `bike-race/src/game/engine.ts:506-519`
- Trigger: Every frame after crossing the finish line until the player leaves.
- Workaround: The internal status guard prevents double state mutations, but the check fires redundantly.

## Security Considerations

**No server-side validation of leaderboard scores:**
- Risk: Any authenticated user can POST arbitrary `time` values (including negative or zero) directly to the `leaderboards` Supabase table through the client-side SDK. There is no server function, edge function, or Row Level Security policy visible that validates score plausibility.
- Files: `bike-race/src/app/page.tsx:175-179`
- Current mitigation: None beyond Supabase auth (user must be signed in).
- Recommendations: Add a Supabase Edge Function or database trigger that rejects times outside a plausible range (e.g. < 1s or > 600s) before inserting into `leaderboards`.

**Username uniqueness not enforced at the application layer:**
- Risk: The `profiles` table insert (AuthModal, line 38) sends `{ id, username }` without checking for duplicate usernames. If the database does not have a unique constraint on `username`, two accounts can share a display name, making leaderboard attribution confusing and enabling impersonation-style abuse.
- Files: `bike-race/src/components/AuthModal.tsx:36-40`
- Current mitigation: Depends entirely on a database-level unique constraint (not visible in source).
- Recommendations: Check for username availability before insert; surface a clear error message when the username is taken.

**Supabase client uses `!` non-null assertion on env vars:**
- Risk: `supabaseUrl` and `supabaseAnonKey` are accessed with `!` (non-null assertion). If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing from the environment (e.g. a misconfigured deployment), the app silently creates an invalid Supabase client rather than failing with a clear error.
- Files: `bike-race/src/lib/supabase.ts:3-4`
- Current mitigation: None.
- Recommendations: Add an explicit check: `if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase environment variables');`.

**Guest user ID is the hardcoded string `'guest'`:**
- Risk: `onAuth('guest', 'Guest')` is called when the user dismisses the auth modal. Throughout `page.tsx`, authenticated writes are gated on `userId && userId !== 'guest'`. If any future code path forgets the `!== 'guest'` guard, it would attempt a Supabase write with `user_id = 'guest'`, which would either error or insert garbage data.
- Files: `bike-race/src/components/AuthModal.tsx:157`, `bike-race/src/app/page.tsx:112`, `bike-race/src/app/page.tsx:167`, `bike-race/src/app/page.tsx:205`
- Current mitigation: Multiple explicit `userId !== 'guest'` guards.
- Recommendations: Use `null` for unauthenticated state (the `userId` type is already `string | null`). Remove the "Continue as Guest" path that sets `userId` to a non-null sentinel string.

**Multiple awaited Supabase writes in `handleFinish` have no error handling:**
- Risk: `handleFinish` fires four separate `await supabase` calls (progress upsert, leaderboard insert, bike_unlocks upsert, profile update) with no try/catch. A network failure midway leaves state partially updated: e.g. progress saved but leaderboard entry missing.
- Files: `bike-race/src/app/page.tsx:167-193`
- Current mitigation: None.
- Recommendations: Wrap the block in try/catch and surface a toast or retry UI. Consider batching via a Supabase Edge Function or RPC.

## Performance Bottlenecks

**Particle array grows unbounded during long acceleration bursts:**
- Problem: `renderer.ts` pushes 2 particles per frame (60fps = 120/s) into `this.particles` while accelerating. Each particle lives 30 frames (~0.5s), so at steady state the array holds ~60 entries. This is acceptable normally, but after a crash the game does not clear particles, so all existing particles remain until they naturally expire.
- Files: `bike-race/src/game/renderer.ts:332-345`, `bike-race/src/game/renderer.ts:469-487`
- Cause: No maximum cap on the particle array; no explicit clear on game state change.
- Improvement path: Add `if (this.particles.length > 100) this.particles.splice(0, this.particles.length - 100);` or clear on crash.

**`getTerrainY` and `getTerrainAngle` do linear scans every physics substep:**
- Problem: Both functions iterate the entire `terrainPoints` array from index 0 on every call. With 20 physics substeps per frame and two calls to `getTerrainY` per substep, that is 40+ linear scans per frame over potentially hundreds of terrain points.
- Files: `bike-race/src/game/engine.ts:120-148`
- Cause: No spatial indexing; terrain points are stored as a flat array.
- Improvement path: Cache the last segment index as an instance variable and start the scan from there, since the bike always moves forward.

**`levels.ts` is 1184 lines of static data loaded eagerly:**
- Problem: All 25+ levels across all 5 worlds are parsed and held in memory from the first page load, even though the player can only be in one level at a time.
- Files: `bike-race/src/game/levels.ts`
- Cause: All levels exported as `ALL_LEVELS` in a single synchronous import.
- Improvement path: Split levels by world and use dynamic `import()` to load only the current world's levels on demand.

**Canvas DPR transform reset on every frame:**
- Problem: `GameCanvas.tsx` calls `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` inside the game loop (line 129) on every frame. This is redundant since the transform is set once during `resize()` and `ctx.save()/restore()` already preserve it.
- Files: `bike-race/src/components/GameCanvas.tsx:128-130`
- Cause: Defensive re-application of the DPR scale each frame.
- Improvement path: Remove the `ctx.setTransform` call inside the loop; the `ctx.save()/ctx.restore()` pair already handles this correctly.

## Fragile Areas

**`BikeRaceEngine` has public mutable fields (`bike`, `terrain`, `engine`, `world`):**
- Files: `bike-race/src/game/engine.ts:7-17`
- Why fragile: `GameCanvas.tsx` accesses `engine.controls` directly on line 101. `renderer.ts` accesses `engine.bike`, `engine.trackData`, `engine.gameState`, `engine.controls` directly. Any change to the internal structure of the engine breaks the renderer without a TypeScript error at the call site.
- Safe modification: Access internal engine state only through methods; add a `getState(): GameState` method and make physics bodies private.
- Test coverage: Zero automated tests; all feedback is visual.

**Touch control `leanBack`/`leanForward` is driven only by `touchmove`, never reset unless `touchend`:**
- Files: `bike-race/src/game/useControls.ts:117-131`
- Why fragile: If a `touchmove` event sets `leanBack = true` but the user releases their finger without moving (triggering `touchend` but not `touchmove`), the lean state is correctly cleared. However, if the user uses two fingers (multi-touch), only `e.touches[0]` is tracked, and the second touch's end does not clear the lean state. The bike can get stuck leaning.
- Safe modification: Reset lean state on every `touchstart` before setting the new state; handle the multi-touch `changedTouches` in `touchend`.
- Test coverage: None.

**Resize handler scales the canvas but does not re-render the initial frame:**
- Files: `bike-race/src/components/GameCanvas.tsx:71-80`
- Why fragile: When the browser window resizes while the game is in `'ready'` state (before the player starts), the canvas dimensions update but the game loop continues to run and re-render, which works. However, `ctx.scale(dpr, dpr)` is called inside `resize()` cumulatively — calling `ctx.scale` without resetting the transform first stacks scales. After multiple resizes, all drawing coordinates are multiplied.
- Safe modification: Replace `ctx.scale(dpr, dpr)` with `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` inside the resize handler.
- Test coverage: None.

## Scaling Limits

**Leaderboard query is capped at 20 entries with no pagination:**
- Current capacity: 20 records per level displayed.
- Limit: No way for users to see ranks 21+; no pagination UI.
- Scaling path: Add `range()` / `offset` parameters and a "Load more" button in `Leaderboard.tsx`.

**All progress for authenticated users is fetched in full on session load:**
- Current capacity: Works fine with a handful of levels (25 levels × small row size).
- Limit: If levels are ever expanded to hundreds, the initial `select('*')` from `progress` fetches the entire history for the user.
- Scaling path: Fetch progress lazily per world on `WorldSelect` mount.

## Dependencies at Risk

**`matter-js` version 0.20.0 is unmaintained:**
- Risk: The last `matter-js` release was in 2022. Open issues include tunneling at high speeds, constraint instability, and body overlap at spawn. The codebase works around several of these issues with position overrides (terrain snap, forced X position), which adds complexity.
- Impact: Physics bugs (tunneling, jitter) that cannot be fixed by upgrading a patch version.
- Migration plan: Evaluate `rapier.js` (WASM, actively maintained) or `planck.js` (Box2D port) as replacements. The physics abstraction is contained in `engine.ts`, making a swap feasible.

**`next` is version 16.1.6, a pre-release / non-standard version:**
- Risk: Next.js public stable releases are in the 14.x / 15.x range as of early 2026. Version 16.1.6 may be a canary or private build. If this is unintentional, the app may be on a non-LTS release receiving no security patches.
- Impact: Potential security vulnerabilities; missing stable APIs.
- Migration plan: Confirm the intended Next.js version and pin to the latest stable LTS release.

## Missing Critical Features

**No input validation on username during signup:**
- Problem: The `AuthModal` enforces `minLength={3}` and `maxLength={20}` via HTML attributes only, with no server-side or Supabase-level validation. HTML validation can be bypassed programmatically.
- Blocks: Prevents malicious or invalid usernames from being rejected at the database level.

**No sign-out functionality:**
- Problem: There is no UI element to sign out of an existing account. Once authenticated, the only way to change accounts is to clear local state or cookies manually.
- Blocks: Multi-user usage on a shared device; ability to switch accounts.

## Test Coverage Gaps

**Zero test files exist in the project:**
- What's not tested: All game logic (physics engine, flip/wheelie detection, finish/crash conditions), all Supabase data operations (progress save, leaderboard insert, session restore), all React components (navigation, auth flow, bike unlock).
- Files: All files under `bike-race/src/`
- Risk: Any change to `engine.ts` or `page.tsx` can introduce silent regressions with no automated safety net.
- Priority: High

**Physics engine edge cases have no coverage:**
- What's not tested: Finish line detection (collision sensor vs position backup), crash detection angle threshold (2.8 radians), flip counting across level boundaries, `destroy()` cleanup preventing memory leaks.
- Files: `bike-race/src/game/engine.ts`
- Risk: Refactoring the engine (e.g. fixing the `Events.off` bug) has no regression safety net.
- Priority: High

**Supabase interaction has no mocking/testing:**
- What's not tested: `loadSession`, `handleFinish`, `handleUnlockBike` — all Supabase calls in `page.tsx`; the `loadLeaderboard` function in `Leaderboard.tsx`.
- Files: `bike-race/src/app/page.tsx`, `bike-race/src/components/Leaderboard.tsx`
- Risk: Auth regressions, data-loss bugs in the progress-save flow, and leaderboard display bugs are only caught manually.
- Priority: High

---

*Concerns audit: 2026-03-06*
