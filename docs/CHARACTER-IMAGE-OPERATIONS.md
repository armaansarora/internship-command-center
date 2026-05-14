# Character Image Operations

This is the start-here runbook for any Codex session that needs to continue character image work, answer what has been done, or strengthen the pipeline.

For all future Tower visual work, start with the Creative Production Engine:

```bash
npm run art:studio
```

Use `npm run art:operate` only when the active asset is a Season 1 character and the engine has reached the character-art operator stage. Every phase must run the Housekeeping Gate and the Continuous Improvement Gate.

## Current State

- Locked style: `tower-flat-plus-depth-v1`.
- Locked tone: `Professional Scars`.
- Runtime model: high-resolution pose sprites plus subtle `CharacterStage` motion.
- Production gate: no character art enters `public/art` or the approved manifest until Armaan says exactly `approved for app`.
- Otis Vale is the first promoted pilot: run `.artlab/runs/otis/2026-05-14-otis-pilot/run.json`.
- Otis is usable in the app now, but the run ledger must keep its source warning visible: the pilot sources were prototype-sized and upscaled into 4K masters (`source-long-edge-below-4096`, `source-upscaled-to-master`).
- Active priority: redo Otis from scratch through `.artlab/runs/otis/2026-05-14-otis-native-v2/run.json`, using the same approved design but native high-resolution sources.
- Next new character after Otis v2: Mara Voss (`ceo`).

## First Commands

To continue work and materialize the next strict action packet, start with:

```bash
npm run art:operate
```

To inspect the current state without creating an operator packet, run:

```bash
npm run art:status
```

For machine-readable handoff:

```bash
npm --silent run art:status -- --json
```

To wipe volatile old run binaries while keeping provenance and live app assets, run:

```bash
npm run art:clean -- <characterId> --run-id <run-id>
```

Then read only the files needed for the question:

- `CLAUDE.md` for Tower-wide doctrine and commands.
- `STRUCTURE.md` for file locations.
- `docs/ART-BIBLE.md` for style rules and prompt references.
- `docs/CHARACTER-BIBLE.md` for character canon.
- `docs/CHARACTER-ART-PIPELINE.md` for approval gates.
- `docs/CHARACTER-ASSET-HANDOFF.md` for current implementation details.
- `docs/CHARACTER-IMAGE-PROMPTS.md` for generation prompt packets.
- `.artlab/README.md` for art lab layout rules.

## If Armaan Says Continue Generating Images

1. Run `npm run art:operate`.
2. Open the generated `next-action.json`, `next-action.md`, and any prompt packet under `.artlab/operators/<characterId>/<runId>/`.
3. Follow only the action named in the operator packet.
4. If the packet says `generate-concept-board`, generate exactly 12 options from the generated concept prompt and wait for the initial design choice.
5. After the initial design is chosen, let the operator create the run from the approved identity.

For Otis v2, the initial identity is already approved and the replacement run is already planned:

```bash
npm run art:operate -- --run .artlab/runs/otis/2026-05-14-otis-native-v2/run.json
```

For a new character, use:

```bash
npm run art:operate -- --character ceo --run-id 2026-05-14-mara-voss-pilot --identity-ref .artlab/characters/ceo/references/identity/<approved-file>.png
```

6. Use the generated prompt packet under `.artlab/runs/<characterId>/<runId>/prompts/batch-prompt-packet.md`.
7. Ingest generated sheets and sources into the run. Never put generation output directly in `public/art`.
8. Run split, master, QA, and review:

```bash
npm run art:split -- <run.json> --source-asset <pose-sheet-id>
npm run art:master -- <run.json>
npm run art:qa -- <run.json>
npm run art:review -- <run.json>
```

9. Show Armaan the final upload-ready board only after QA passes.
10. Promote only after the exact phrase:

```bash
npm run art:promote -- <run.json> --approval-phrase "approved for app"
```

11. Run browser QA for `/lobby` and `/lobby/onboarding` when the promoted character affects those pages.

## If Armaan Asks What Has Been Done

Answer from these sources, in this order:

- `npm run art:status`
- `npm run art:operate`
- `.artlab/runs/otis/2026-05-14-otis-native-v2/run.json`
- `.artlab/runs/<characterId>/<runId>/run.json`
- `src/lib/visual-assets/approved-character-assets.generated.json`
- `.artlab/characters/<characterId>/ARTIFACTS.md`
- browser QA ledgers under `.artlab/runs/<characterId>/<runId>/browser-qa/`

Do not answer from memory if the status command is cheap to run.

## If Armaan Asks Whether The Quality Is Good Enough

Inspect the final board and run ledger before answering. A technically passing run can still be visually rejected.

Quality failures that block approval:

- soft, blurry, pixelated, or visibly upscaled source art
- fake-perfect model faces, bodies, hair, teeth, or jawlines
- non-human proportions unless the character canon explicitly calls for them
- cropped hands, feet, props, or silhouette
- haloing around transparent edges
- outfit drift across variants
- identity drift across poses
- weak mobile read at app scale
- mismatched Tower style or too much realism

## Self-Improvement Loop

Every character run should leave the pipeline stronger than it found it.

- If the agent does a manual workaround twice, add or improve a script command.
- If a failure could recur, add a test that would catch it.
- If a future session could misunderstand a step, update this runbook or the handoff doc.
- If a QA warning is accepted temporarily, keep it visible in the run ledger and status output.
- If a browser issue is found, fix the runtime route/component and add the smallest regression test that protects it.
- If a new asset class appears, extend the typed manifest before assets enter production.

## Current Non-Negotiables

- Preserve the four lobby backgrounds in `public/lobby/bg-1.jpg` through `public/lobby/bg-4.jpg`.
- Use approved raster character art, not hand-authored local SVG character art.
- Keep `CharacterStage` as the runtime layer for pose, outfit, state, and motion.
- Keep generated drafts in `.artlab`; keep approved app derivatives in `public/art`.
- For replacement work, clean volatile old run images with `npm run art:clean`; do not delete current live `public/art` files until the replacement run is approved and promoted.
- Keep all production assets manifest-gated.
- Do not add runtime image generation or paid API generation unless Armaan explicitly approves that separate product decision.
