# The Tower Companion — Animation brief (handoff for the next session)

**Read this first, then `MASCOT-DECISION.md`.** This is the spec for fully animating the owl. The mascot
direction is LOCKED (the owl); this doc is about turning the static sprite into a living, animated
companion.

---

## The vision (founder's words)
The owl is the user's **Tower assistant / familiar** — *"follows you and is always available to help,
like your trusty partner, your pet, your companion."* It must be **animated**: flying across the app,
idling with life, reacting. It rides with the user through the building (the floor agents are the *staff*;
the owl is *yours*).

## What already exists (start here — don't rebuild)
- **Assets:** `public/brand/owl-cream.png` (transparent cutout — the active mascot; minor fraying at the
  lower-right wingtip, invisible on dark) and `public/brand/owl-navy.png` (light-mode twin, still has its
  navy backdrop — needs a clean cutout when light mode is built). Pristine originals in
  `docs/research/mascots/selected/`.
- **`src/components/identity/Mascot.tsx`** — static owl, `<Mascot mode="dark"|"light" tile? />`.
- **`src/components/identity/TowerCompanion.tsx`** — the **Phase-1 prototype**: fixed-overlay owl that
  perches in a corner, idles (GSAP float + sway), and **glides** to a new corner when `perchIndex`
  changes; click → greeting bubble. Reduced-motion safe. Single static sprite as a puppet — **no
  wing-flap** (that's the whole point of this next phase).
- **`/lobby-pilot`** — heroes the owl + light/dark twin + the companion prototype ("Send it flying →").
- **Branch:** `identity/autopilot`. Additive — **not on main, not pushed, not deployed.** Live lobby +
  byte-protected character art untouched.
- **Middleware:** `/brand/*` is allow-listed in `src/lib/supabase/middleware.ts` (so assets serve without
  auth). Keystone/FloorMark fully deleted.

## The crux: how to actually animate a 2D sprite
We have ONE flat render. The honest options, cheapest → richest:

1. **GSAP "puppet" (current).** Move the whole sprite — float, glide, tilt. No flap/blink. Good enough
   for a calm v1, very on-brand, but limited.
2. **Rig into layers + Rive — RECOMMENDED.** Cut the owl into parts (body, left wing, right wing, head,
   eye/eyelid, tail, feet) and animate with a state machine. **Rive fits a *stateful companion* best**
   (idle / fly / greet / notify states with runtime triggers from React), runs via
   `@rive-app/react-canvas` (`"use client"` + WASM). This is how Duolingo-class mascots animate. Prior
   project research already leaned Rive for the (now-dead) glyph; the tooling reasoning still applies.
3. **Lottie.** After-Effects keyframe animation exported to JSON. Great for scripted sequences (a flight
   loop), weaker for interactive runtime states than Rive.
4. **Image-to-3D (premium, most work).** Run the chosen render through Meshy / Tripo / Rodin → a `.glb`,
   rig + animate in Blender, then either render sprite sequences or load in `@react-three/fiber`. Only if
   true 3D poses are wanted. **Note: there is no Blender in this environment and a premium owl can't be
   scripted from scratch — this is an external/tooling effort.**
5. **ArtLab SDK** already exposes a **`sprite-animation`** and **Lottie** modality — check it first
   (`artlab/canon_list`, `artlab/asset_pack_list kind=sprite-animation`, `artlab/generate`). It may be the
   in-house path to produce/promote the animated asset.

**Recommendation:** rig the cutout into layers and drive it with **Rive** (or Lottie if the founder
prefers an AE workflow). Before rigging, get a **cleaner transparent cutout** — regenerate the chosen owl
in GPT Image 2 on a **transparent / pure-chroma (magenta or green) background** (far cleaner than keying
the navy-baked PNG), ideally also a **front-facing, wings-slightly-spread** pose that's easier to rig than
the current 3/4 perched pose.

## Motion states to build (honor the brand: slow, organic, barely perceptible; no motion-sickness)
- **Idle:** breathe + slow blink + occasional head-turn / preen. Almost still.
- **Greet / summon:** look toward the user, small bob, open a dialogue.
- **Fly:** takeoff → calm glide arc → land/perch (the "follows you" motion across app navigation).
- **Notify:** a gentle wing-lift or soft glow (no red-alert harshness).
- **Thinking / talking:** subtle loop while the assistant is working / speaking.
- **Reduced-motion:** resolve every state to a designed, fully-lit still.

## Open product decisions — GET THESE FROM THE FOUNDER before building
1. **Behavior:** ambient (perches, you summon it) vs. active (auto-flies to your focus as you navigate).
2. **The "assistant":** a real chat/help surface (click → dialogue that can answer / route you, wired to
   the Vercel AI SDK) vs. personality-only for now.
3. **Animation bar for v1:** ship the calm **glide** across the app, or hold the global rollout until it's
   **rigged** (real flap + blinks).
4. **Global rollout:** the "follows you everywhere" version mounts in the **app shell** (every page) and
   touches main/live surfaces — needs explicit approval before shipping.

## Tech constraints (from CLAUDE.md)
Next 16 App Router · React 19 (`import type { JSX }`) · Tailwind v3 · GSAP **only** via `@/lib/gsap-init`
(tree-shaking contract) · `@/hooks/useReducedMotion` · palette navy `#1A1A2E` / gold `#C9A84C` / cream
`#F5F1E8` · no `any`, no console.logs, aria on interactive els · keep additive on a branch; don't touch
main or the live lobby without approval.

## Suggested first steps for the next session
1. Confirm the 4 open decisions with the founder.
2. Pick the tech (recommend **Rive**; Lottie as the AE alternative).
3. Produce a **clean, rig-friendly owl** (transparent regen) and cut it into layers.
4. Build **idle + fly + greet** states behind `/lobby-pilot` first (safe), reduced-motion included.
5. Only then wire the **global companion overlay** into the app shell — with approval.
