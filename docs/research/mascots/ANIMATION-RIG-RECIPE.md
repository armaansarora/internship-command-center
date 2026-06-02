# The Owl — Rive rig recipe (de-risk: single-image mesh-deform)

**Goal of this pass:** prove the calm feel + the whole Rive-on-Next-16 pipeline with the
**least possible art work** — no layer cutting, no occlusion inpaint, no identity regen. We
rig the **existing** `public/brand/owl-cream.png` with single-image **mesh deformation** so it
breathes, blinks, and greets. A true wing-flap and the 8-agent cast come later, off the
regenerated layered master (see `ANIMATION-BRIEF.md` → "the layered master").

The React side is already wired (`src/components/identity/RiveOwl.tsx` +
`src/lib/rive-init.ts`). It loads `/brand/owl.riv` and drives a state machine. **Author the
rig to match the contract below exactly** — names are case-sensitive — then export to
`public/brand/owl.riv` and flip the toggle on `/lobby-pilot` to "Rive (rigged)".

---

## The contract the code expects (do not rename)

| Thing | Name | Type | Drives |
|---|---|---|---|
| State machine | `Owl` | — | the whole rig |
| Input | `greet` | **Trigger** | one-shot greet (head tilt + blink + small near-wing raise) |
| Input | `hover` | **Boolean** | subtle lean/perk while the pointer is over the owl |

`breathe` and `blink` are **not** inputs — they run automatically inside the idle state
(always-on). The code fires `greet` on click and sets `hover` on pointer-enter/leave. If an
input is absent the code no-ops gracefully, so you can ship `Owl` + `greet` first and add
`hover` later.

**Frame 0 must be the lit neutral pose** (eyes open, wings settled, body at rest). Reduced-motion
users never load Rive — they see the PNG still — but a clean frame 0 keeps the first painted
Rive frame correct.

---

## Prerequisites
- A **Rive Cadet seat** (approved — month-to-month $17/mo). The free tier cannot export `.riv`.
- The Rive editor (rive.app, runs in-browser or desktop).

---

## Step-by-step in the Rive editor

1. **New file → import image.** Drag in `public/brand/owl-cream.png`. Set the artboard to a
   square that frames the owl (the runtime uses `Fit.Contain`, so exact size is forgiving).

2. **Create a mesh on the owl image.** Select the image → **Create Mesh**. Add vertices around
   the silhouette and a few interior points over: the **belly/chest** (for breathe), the **brow
   line just above each eye** (for blink), the **head/neck** (for the greet tilt), and the
   **visible near wing's shoulder** (for the greet wing-raise). ~20–30 vertices is plenty.

3. **Add bones (optional but cleaner for the head turn).** Add a short bone chain: a root at the
   body, one bone up to the head. Bind the head-region vertices to the head bone (weight-paint so
   the neck blends). This makes the greet head-tilt a single bone rotation instead of hand-moving
   vertices.

4. **Build the looping IDLE animation (~3.2s, calm):**
   - **Breathe:** keyframe the belly/chest vertices (or a subtle whole-body scale 1.00 → 1.015 →
     1.00) over 3.2s, ease in/out. Barely perceptible.
   - **Blink:** on a timeline, every ~4–7s drop the upper-eyelid vertices down over the eyes for
     ~120ms and back. (Easiest: a second short "blink" animation layered additively, or bake a few
     blinks into the idle loop at irregular intervals so it doesn't feel metronomic.)
   - Keep it **slow and organic** — this is the brand's "barely perceptible" rule.

5. **Build the GREET animation (~0.6s one-shot):** head tilt ~+5° (rotate the head bone) + one
   blink + a small raise-and-settle of the near-wing shoulder vertices. Returns to neutral.

6. **(Optional) HOVER pose:** a tiny perk — head up ~2°, eyes widen a hair. A short additive
   animation or a state held while `hover` is true.

7. **State machine `Owl`:**
   - Default/entry state → **Idle** (the looping breathe/blink animation).
   - Add a **Trigger** input named `greet`. From **Any State**, on `greet`, transition to a
     **Greet** state (the one-shot), then auto-return to Idle when it completes. "Any State" lets
     the greet interrupt from anywhere and fall back to idle.
   - Add a **Boolean** input named `hover`. Idle ⇄ Hover gated on `hover == true/false` with a
     short blend (~150ms).

8. **Test in the editor's preview:** toggle `hover`, fire `greet`, confirm idle loops calmly and
   everything returns to neutral.

9. **Export → Download `.riv`.** Save it as **`public/brand/owl.riv`** in the repo. (The owl in
   `public/brand/` is NOT CI byte-protected — confirmed — so this is free of any gate. Only
   `public/art/lobby/otis/**` and `public/art/penthouse/ceo/**` are byte-locked.)

10. **See it live:** `npm run dev` → open `/lobby-pilot` → flip the companion engine toggle to
    **"Rive (rigged)"**. The owl should breathe/blink; click it to greet; hover to perk. If the
    `.riv` is missing or fails, the page silently keeps the flat PNG puppet.

---

## What this de-risk validates (and what it does not)

**Validates:** Rive instantiates under the app's strict CSP (we added `'wasm-unsafe-eval'` and
self-host the WASM at `/rive/rive.wasm`), the React→state-machine input bridge (`greet`/`hover`),
SSR-safety (client-only island via `next/dynamic({ssr:false})`), LCP hygiene (PNG paints first,
WASM mounts after first paint), and reduced-motion (PNG still, no WASM). It confirms the calm
*feel* before any art spend.

**Does NOT do:** a real wing-flap or a flying-with-wingbeats pose — a 3/4 folded-wing single image
can't fake that. That needs the **regenerated, layered, occlusion-inpainted master** (front-facing,
wings slightly spread). Decide whether to commit to that *after* seeing this feel — that gate is
intentionally deferred.

---

## Operational notes
- The runtime WASM is self-hosted: `npm run rive:wasm` re-copies it from `node_modules` after any
  Rive upgrade (keep the file version-matched to `@rive-app/react-canvas`).
- One rig, then the cast: once `Owl` proves out, the same state-machine + input contract
  (`idle`/`greet`/`hover`, plus `talk`/`thinking` later) clones to the 8 floor agents. Standardise
  the regen→key→layer→inpaint→PSD step as an ArtLab modality so the cast stays visually coherent.
