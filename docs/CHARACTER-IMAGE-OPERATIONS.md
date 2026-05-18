# Character Image Operations

This is the start-here runbook for any Codex or Claude session that continues Tower character image work.

## Current State

- Locked style: `tower-flat-plus-depth-v1`.
- Locked tone: `Professional Scars`.
- Runtime model: high-resolution pose sprites plus subtle `CharacterStage` motion.
- Production gate: no character art enters `public/art` or the approved manifest until Armaan says exactly `approved for app`.
- Fresh-start reset is active: no Season 1 character has approved production sprites right now.
- Otis Vale is the first production pilot and must be generated from scratch, not from previous Otis reference images.
- Mara Voss (`ceo`) remains the next character after Otis is fully approved and promoted.
- The four Lobby backgrounds in `public/lobby/bg-1.jpg` through `public/lobby/bg-4.jpg` are protected and untouched.

## First Commands

For the guided Creative Production Engine session:

```bash
npm run art:produce -- --request "<what Armaan wants to add or continue>"
```

For read-only status:

```bash
npm run art:status
```

For machine-readable handoff:

```bash
npm --silent run art:status -- --json
```

Use `npm run art:operate` only when the active asset is a Season 1 character and the engine has reached the strict character-art operator stage.

## If Armaan Says Continue Generating Images

1. Run `npm run art:studio`.
2. Confirm the fresh-start status in plain language: no approved character art, Otis is first, Lobby backgrounds remain.
3. Ask what is being added or changed today if the request is not already clear.
4. For Otis from scratch, create exactly five prompt-only initial concepts with five concurrent lanes. Do not attach old Otis reference images.
5. Show the five initial designs and wait for Armaan to pick one direction.
6. After the initial design is approved, generate the production pack: turnaround, outfit variants, expressions, poses, masters, derivatives, QA, and final board.
7. Show only one final upload-ready board for approval.
8. Promote only after the exact phrase:

```bash
npm run art:promote -- <run.json> --approval-phrase "approved for app"
```

Production paid generation is canary-gated. After an initial design is chosen, production packs must generate one representative canary slot, repair it locally if possible, verify the canary gate, and only then run the full pack. Whole-pack retries are banned; use slot-only regeneration for named failures.

9. Run browser QA for `/lobby` and `/lobby/onboarding` when Otis is promoted.

## Character Factory Rules

- Initial character design is exactly five prompt-only images by default.
- The five initial concepts must run concurrently when using the API path.
- Production packs happen only after one initial design is chosen.
- Gemini API runs use Nano Banana 2 through the generation adapter when API spending is explicitly approved.
- API keys must come from `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or macOS Keychain service `tower-gemini-api-key`; never write keys into repo files.
- Gemini does not reliably return real transparent backgrounds. Production character prompts should use a flat `#00ff00` chroma matte, then run local alpha extraction.
- Failed slots are repaired or regenerated individually. Do not rerun a whole pack because one image failed.
- Generated outputs stay in `.artlab` until final promotion.
- `src/lib/visual-assets/approved-character-assets.generated.json` stays empty until a full character board is approved for app.

## If Armaan Asks What Has Been Done

Answer from these sources, in this order:

- `npm run art:status`
- `.artlab/README.md`
- `docs/CREATIVE-PRODUCTION-ENGINE.md`
- `docs/CHARACTER-ART-PIPELINE.md`
- `docs/CHARACTER-ASSET-HANDOFF.md`
- `src/lib/visual-assets/approved-character-assets.generated.json`

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
- missing image files or broken preview references

## Self-Improvement Loop

Every character run should leave the pipeline stronger than it found it.

- If the agent does a manual workaround twice, add or improve a script command.
- If a failure could recur, add a test that would catch it.
- If a future session could misunderstand a step, update this runbook or the handoff doc.
- If a QA warning is accepted temporarily, keep it visible in the run ledger and status output.
- If a browser issue is found, fix the runtime route/component and add the smallest regression test that protects it.
- If a new asset class appears, extend the typed manifest before assets enter production.
- If generated sheets are too low-resolution for native sprite source, switch the run to individual-sprite source ingestion before continuing.

## Current Non-Negotiables

- Preserve the four lobby backgrounds in `public/lobby/bg-1.jpg` through `public/lobby/bg-4.jpg`.
- Use approved raster character art, not hand-authored local SVG character art.
- Keep `CharacterStage` as the runtime layer for pose, outfit, state, and motion.
- Keep generated drafts in `.artlab`; keep approved app derivatives in `public/art`.
- Keep all production assets manifest-gated.
- Do not show a review board as clean if any image fails to load.
- Do not add runtime image generation unless Armaan explicitly approves that separate product decision.
