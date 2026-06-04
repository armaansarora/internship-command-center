# The Tower Visual Identity Spec

Status: pilot spec, current as of 2026-06-04.

## Locked Pilot Mark

The current pilot mark is the owl mascot.

- Dark UI: cream owl at `public/brand/owl-cream.png`.
- Future light UI: navy owl at `public/brand/owl-navy.png`.
- Canonical component: `src/components/identity/Mascot.tsx`.
- Companion behavior: `src/components/identity/TowerCompanion.tsx`.
- Optional rig island: `src/components/identity/RiveOwl.tsx`.
- Review surface: `/lobby-pilot`.

## Invariants

- The owl is the friendly face of The Tower.
- Use the cream owl on navy or dark Tower surfaces.
- Use the navy owl only on light surfaces or in a clearly labeled light-mode preview.
- Keep the owl additive until Armaan approves app-wide replacement of any production identity assets.
- Keep live lobby assets and byte-protected character art untouched.
- Serve identity pilot assets through exact or asset-scoped public paths; do not widen auth bypasses with broad prefixes.

## Motion Grammar

- Idle: slow, barely perceptible breathing or float.
- Hover: subtle perk only.
- Greet: one warm click/tap response.
- Travel: calm glide between perches.
- Reduced motion: show the still owl without loading heavy animation engines.

## Engine Contract

- `engine="png"` is the production-safe fallback and works without extra assets.
- `engine="rive"` expects `public/brand/owl.riv` with an animation named exactly `Idle`.
- `engine="video"` expects `public/brand/owl-idle.webm` plus `public/brand/owl-idle.mov`.
- Missing or mis-authored heavy assets must fall back to the PNG owl and surface a visible status pill.

## Ship Gate

Before replacing favicon, app icons, or production navigation identity, verify:

- The selected asset reads clearly at small icon sizes on the target background.
- Dark and light variants both pass contrast and matting checks.
- `/lobby-pilot` still builds, is noindexed, and remains additive.
- `npm run build`, `npm run lint`, `npm test`, and `npx tsc --noEmit` pass.
