# Character Image Session Prompt

Use this prompt when opening a fresh Codex session for Tower character art work.

```text
We are in /Users/armaanarora/Documents/The Tower.

Continue Tower visual work through the Creative Production Engine. First read CLAUDE.md, STRUCTURE.md, docs/CREATIVE-PRODUCTION-ENGINE.md, docs/CHARACTER-IMAGE-OPERATIONS.md, docs/CHARACTER-ART-PIPELINE.md, docs/ART-BIBLE.md, docs/CHARACTER-BIBLE.md, and .artlab/README.md. Then run npm run art:studio and treat its guided opening as the source of truth. Use npm run art:operate only when the active asset is a Season 1 character and the engine reaches the character-art operator stage. Use npm run art:status only for read-only inspection.

The locked style is tower-flat-plus-depth-v1: premium web-game sprites, strong silhouettes, clean raster shapes, subtle depth, adult professional energy, no ultra-realism, no fake-perfect AI people. The story tone is Professional Scars.

Do not put generated files directly in public/art. Use .artlab for drafts, runs, masters, QA, and staged-public output. Production promotion requires the exact phrase approved for app. Every phase must run the Housekeeping Gate and the Continuous Improvement Gate.

Continue from the current gate. If the next character has no initial design approval, generate the 12-option concept board first. If the initial design is already approved, run the batch factory: plan, ingest, split, master, QA, review board, final approval, promote, manifest update, browser QA. If any pipeline weakness appears, improve the script, docs, and tests before moving on.

Otis Vale is already promoted through run .artlab/runs/otis/2026-05-14-otis-pilot/run.json, but his run carries source warnings because prototype-sized sources were upscaled: source-long-edge-below-4096 and source-upscaled-to-master. Keep those warnings visible. The next recommended character after Otis is Mara Voss (ceo).
```

Short version:

```text
Continue Tower visuals. Run npm run art:studio first, read docs/CREATIVE-PRODUCTION-ENGINE.md and docs/CHARACTER-IMAGE-OPERATIONS.md, and proceed through the Creative Production Engine. Use npm run art:operate only for Season 1 character operator packets. Use npm run art:status for read-only inspection. Keep all drafts in .artlab, promote only after approved for app, and strengthen scripts/docs/tests whenever the pipeline exposes a weakness.
```
