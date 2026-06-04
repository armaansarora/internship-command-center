# The Tower Visual Identity Morning Review

Status: current as of 2026-06-04.

## Outcome

The active additive identity pilot is the owl mascot, not the older Keystone-only direction. The pilot lives behind `/lobby-pilot`, is noindexed, and is public through an exact `PUBLIC_PATHS` entry in `src/lib/supabase/middleware.ts`. The live `/lobby` route and byte-protected character art remain untouched.

## Current Decision

- Locked mascot: the owl.
- Active render: `public/brand/owl-cream.png` for the dark UI.
- Reserved twin: `public/brand/owl-navy.png` for a future light UI.
- Implementation: `src/components/identity/Mascot.tsx`, `src/components/identity/TowerCompanion.tsx`, `src/components/identity/RiveOwl.tsx`, and `src/app/lobby-pilot/`.
- Decision source: `docs/research/mascots/MASCOT-DECISION.md`.
- Animation handoff: `docs/research/mascots/OWL-HANDOFF.md`.

## What Exists

- `/lobby-pilot` renders the owl hero, light/dark twin preview, and companion prototype.
- The companion can run as a GSAP PNG puppet today.
- The Rive and video engines are wired as optional engines with visible status pills and PNG fallback.
- Brand assets under `public/brand/` include the cream and navy owl plus baked idle video files.

## Deferred Or Needs Review

- `public/brand/owl.riv` is still a human/export handoff; Rive mode falls back until that file exists and exposes an `Idle` animation.
- The navy owl still needs a clean transparent cutout before light mode uses it broadly.
- Do not replace production favicon/app icons from this pilot until Armaan explicitly approves the mascot direction for app-wide identity.
- The older Keystone research remains useful as secondary visual language, but it is no longer the active mascot decision.

## Override Instructions

To change the mascot decision, update `docs/research/mascots/MASCOT-DECISION.md`, replace or add assets under `public/brand/`, then update the identity components and `/lobby-pilot` route. Keep the live lobby and byte-protected `public/art/**` assets unchanged until explicit approval.
