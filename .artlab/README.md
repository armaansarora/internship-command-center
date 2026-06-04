# Tower Art Lab

`.artlab` is the non-production workshop for Tower creative production. It is where generated concepts, references, run ledgers, QA previews, staged derivatives, browser-session downloads, and review boards live before anything reaches the app.

## Current State

The studio was reset on 2026-05-15. Since that reset, Otis completed the production pilot and is now the protected Lobby baseline.

- Otis is promoted in `public/art/lobby/otis/` and recorded in `src/lib/visual-assets/approved-character-assets.generated.json`.
- The Otis studio run `otis-real-rembg-canary-v1` is closed after housekeeping, continuous-improvement, promotion, and browser QA evidence.
- Lobby backgrounds remain protected: `public/lobby/bg-1.jpg` through `public/lobby/bg-4.jpg`.
- New characters still start from scratch unless their current run-state names an approved identity reference.
- The next likely production character is Mara Voss (`ceo`), but do not start her until Armaan asks.

## Start Here

For a new visual request, use the ArtLab router rather than hand-placing files:

```bash
npm run artlab -- produce "let's make Mara"
```

For read-only status:

```bash
npm run artlab -- status
```

For queue and health diagnostics:

```bash
npm run artlab -- queue
npm run artlab -- health
npm run artlab -- doctor
```

For daemon supervision:

```bash
npm run artlab:daemon -- status
```

The engine routes characters, backgrounds, screens, UI surfaces, animations, props, scenes, shaders, and marketing visuals through `.artlab/engine/...` run state.

## Image Generation Rules

- Drafts and generated sources start in `.artlab`, never in `public/art`.
- Initial character design uses exactly 5 total prompt-only images unless Armaan changes the rule.
- Character concept lanes share one locked Tower/Otis-compatible style envelope. Variation happens only through lane design cards for silhouette, age read, hair, face, wardrobe, palette, posture, accessories, personality, and Tower role archetype.
- Concept QA blocks `direction-review-ready` if style coherence or design diversity fails; repeated same-code failures mark the board `style-failed` and superseded before regeneration.
- UI, environment, prop, icon, shader, animation, scene, and marketing assets use asset-specific contracts instead of inheriting character style rules.
- Normal routable requests do not stop for `approve direction` before those images exist; the first normal human gate is the initial concept review board.
- Before initial images exist, `human-action.json` appears only for true blockers such as missing secrets, budget/provider blocks, active locks, corrupt state, unsafe-to-run, or an unclear brief.
- Production packs happen only after initial design approval.
- Final promotion requires Armaan's exact phrase: `approved for app`.
- Only the coordinator can promote, clean shared state, or update manifests.
- Gemini API runs read keys only from `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or macOS Keychain service `tower-gemini-api-key`.
- Gemini API runs use `api-run.lock` and `api-run-state.json` so duplicate agents do not double-spend against the same plan.
- Do not write API keys into repo files, command flags, receipts, prompt decks, screenshots, or run JSON.
- Gemini does not reliably produce production-ready transparent foregrounds; use `premium-simple-backdrop-v1`, run local cutout before mastering, and keep production cutout offline/fail-closed unless cached model and license evidence is present.
- If a generated image fails to load, decodes poorly, lacks expected files, has broken preview references, or fails strict doctor, repair or regenerate before showing it as clean.

## Parallel Mode

ArtLab owns run parallelism through its queue, daemon, leases, and per-run state. Do not hand-launch competing `produce` or `continue` commands against the same run; enqueue once, then inspect with `status`, `queue`, `health`, and `doctor`. Promotion remains coordinator-owned and still requires the exact human phrase `approved for app`.

## Required Gates

Every phase must run:

- Housekeeping Gate: inventory created files, delete loose junk, keep only used artifacts, and confirm no unapproved asset entered `public/art`.
- Continuous Improvement Gate: record slow steps, errors, confusing points, quality failures, and engine rewrite needs in the run ledgers. Repeated friction must become code, tests, or a stricter command-level guard.
- Asset Doctor Gate before final approval boards and promotion.

## Layout

```text
.artlab/
  README.md
  engine/
    runs/<run-id>/
      run-state.json
      progress.json
      events.jsonl
      slot-leases/
    inbox/cli/
    queue/
    ledgers/
  characters/
    <character-id>/
  runs/
    <character-id>/<run-id>/
  browser-sessions/
```

Those folders are recreated by the engine as needed.
