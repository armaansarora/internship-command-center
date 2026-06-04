# Owl companion — session handoff (animation)

**Read this first.** Everything you need to continue the owl/animation work. Scoped to the owl only.

---

## 0. Where things are (critical)
- **Repo path: `/Users/armaanarora/Developer/The Tower`** — it was moved OUT of iCloud (the old `~/Documents/The Tower` is a dead husk; don't use it). **Never put this repo back in iCloud Documents.**
- **Branch:** `identity/autopilot`. All owl work is **additive and uncommitted** (not on `main`, not pushed, not deployed). Live lobby + byte-protected character art untouched.
- **Surface:** everything is gated behind **`/lobby-pilot`** (route: `src/app/lobby-pilot/`). Nothing touches main/live.
- Node: project wants **Node 24** (`.nvmrc`); use `fnm use` / your 24 toolchain.

## 1. The decision (locked)
**Rive-anchored hybrid.** Rive for the characters; GSAP for UI/transitions/the owl's on-page glide; canvas for the skyline; dotLottie optional. Full rationale in `decision_*` forge memory + `ANIMATION-BRIEF.md`.

**For the owl specifically, there are TWO working engines** (toggle on `/lobby-pilot`):
- **`engine="png"` (default) — GSAP owl, ALREADY ALIVE & shipped.** Breathe + greet-on-click + hover-perk + idle float + corner glide. Pure GSAP on the single `owl-cream.png`. Verified (tsc/lint/build clean; Playwright confirmed breathe animating, hover, greet bubble, 0 console errors). This is the safe fallback and a fine v1 on its own.
- **`engine="rive"` — Rive owl, integration DONE, just needs the `.riv` asset.** Falls back to the PNG (with all the GSAP life) until `public/brand/owl.riv` exists.

## 2. Rive integration — built & verified, waiting only on the asset
Files (all present at the new path):
- `src/components/identity/RiveOwl.tsx` — code-split (`next/dynamic`, `ssr:false`) island. **v1 plays an animation named `Idle` directly via the `animations` param — NO state machine required.** Optional `stateMachine="Owl"` prop flips it to state-machine mode (Stage 2). Greet/hover input bridge is a safe no-op until a state machine exists. Graceful PNG fallback via `onLoadError`.
- `src/lib/rive-init.ts` — central Rive contract (mirrors `gsap-init.ts`): self-hosts the WASM at `/rive/rive.wasm`, **disables the CDN fallback**.
- `src/components/identity/TowerCompanion.tsx` — the overlay; `engine` + `riveSrc` props; lazy-mounts Rive after first paint (LCP-safe); reduced-motion → lit PNG still.
- **CSP:** `next.config.ts` adds `'wasm-unsafe-eval'` to `script-src` (Rive WASM is blocked in prod without it).
- **Middleware:** `src/lib/supabase/middleware.ts` adds `/rive` to `PUBLIC_PATHS` (+2 tests in `middleware.public-paths.test.ts`) so the wasm serves without auth.
- `public/rive/rive.wasm` — self-hosted runtime (re-copy with `npm run rive:wasm` after a Rive upgrade).
- Dep: `@rive-app/react-canvas@^4.28.6` (peer-OK with React 19).

**Runtime facts (verified, prod server):** wasm loads 200 under the strict CSP with **zero CSP violations**; `/rive/rive.wasm` serves; missing `owl.riv` → graceful PNG; greet works.

## 3. THE NEXT STEP (do this to light up the Rive owl)
The user is mid-Rive-editor with **`owl-cream` imported (40% scale) + a looping `Idle` animation that keyframes Scale (the breathe)** — the screenshot state. It is **not exported yet**.

0. **First make the breathe actually MOVE.** A single Scale keyframe = static. Author the `Idle` loop with ≥2 keyframes whose Scale differs (e.g. rest → ~+1.5% → rest), first==last for a seamless loop, Cubic/Ease-In-Out interpolation, loop mode = **Loop**, ~3s long (brand rule: slow/barely-perceptible — a 1s pulse reads like panting). Anchor Origin Y≈100% so it breathes from the feet, not floating. Press play in the editor and confirm.
1. **Export → For runtime** (confirmed path, Rive docs): top-left **`☰` menu → Export → For runtime**, or the blue export action on the toolbar. NOT **"Publish"** (that publishes to the Rive Community, not a local file). Needs a paid seat (Cadet covers it). No state machine needed for v1.
2. Save the export to **`public/brand/owl.riv`** (this path is git-tracked and NOT CI-byte-protected — confirmed; only `public/art/lobby/otis/**` + `public/art/penthouse/ceo/**` are locked).
3. On `/lobby-pilot`, flip the engine toggle to **"Rive (rigged)"** → the owl should breathe via Rive. **Zero code changes** (RiveOwl already plays `animations: "Idle"`).
4. Verify: open `/lobby-pilot`, toggle to Rive. **A status pill under the toggle now reads out exactly what the file contains** — "Rig live — playing 'Idle' ✓", or "Loaded, but no animation named 'Idle'. Found: […]" (rename + re-export), or "No rig at /brand/owl.riv yet" (fallback). No more silent fallback. (Runtime-verified 2026-06-02: missing-rig path shows the fallback pill + keeps the GSAP owl, only the expected 404 in console.)

If the export uses a different animation name than `Idle`, the pill names what it found — either rename it in Rive to `Idle` or pass `animation="<name>"` to `<RiveOwl>` in `TowerCompanion.tsx`.

**Dev-server caveat (this session):** `npm run dev` (Turbopack) panicked on `/lobby-pilot` with "Failed to write app endpoint … Next.js package not found" and reload-looped. `npm run build && npm run start` (the production server) is clean — use it to smoke-test the owl if Turbopack dev panics.

## 4. Deferred (Stage 2 / later — NOT needed for v1)
- **Greet + hover in Rive:** needs a **state machine named exactly `Owl`** with a **Trigger input `greet`** and **Boolean input `hover`**, plus Greet/Hover states + transitions. Then set `<RiveOwl stateMachine="Owl" ...>` in TowerCompanion and the greet/hover bridge lights up automatically. (For now, GSAP already does greet/hover on the `png` engine.)
- **True wing-flap / blink:** needs a **regenerated, layered, occlusion-inpainted owl** (front-facing, wings slightly spread) — the current 3/4 folded-wing single render can't fake it. This is a parked founder decision (regen vs keep the exact brand render). See `ANIMATION-BRIEF.md` + `ANIMATION-RIG-RECIPE.md`.
- **App-wide cast:** same pipeline later rigs the 8 floor agents (Otis/CEO PNGs are CI byte-protected → use NEW `.riv` paths, never mutate the bitmaps).

## 5. Gotchas (learned the hard way)
- **Rive's in-app AI Agent (Build mode) cannot reliably build a state machine** — it builds mesh + animations + inputs fine but **hangs on transition-wiring and freezes the editor**, and falls back to making a "property group" (≠ a real state machine; the runtime won't bind it). That's WHY v1 uses an animation, not a state machine.
- **The Rive Editor MCP is deprecated** and can't import images, mesh, keyframe, or export — only state machines/shapes. Not viable for this.
- **Driving the Rive desktop editor via computer-use is too slow/fragile.** The reliable division: a human (or the Agent) builds the simple `Idle` animation in the editor + exports; the code plays it.
- **Rive Cadet seat** ($9/mo annual or $17/mo monthly) is required to export `.riv`; **exports work forever even after cancellation** (no royalty/MAU) — so the user can cancel and re-rig later.
- **Rive runtime is ~770KB over the wire** (~70KB gz JS + ~700KB gz WASM), NOT the "~78KB" some docs imply — keep it lazy/after-first-paint (already done).

## 6. Quick verify commands (from `/Users/armaanarora/Developer/The Tower`)
```
./node_modules/.bin/tsc --noEmit          # type check
npm run lint                               # eslint
npm run build                              # prod build
npm run dev                                # then open /lobby-pilot
```
Key files: `src/components/identity/{RiveOwl,TowerCompanion,Mascot}.tsx` · `src/lib/rive-init.ts` · `src/app/lobby-pilot/` · `public/brand/owl-cream.png` · `public/rive/rive.wasm` · `docs/research/mascots/{ANIMATION-BRIEF,ANIMATION-RIG-RECIPE,MASCOT-DECISION}.md`.
