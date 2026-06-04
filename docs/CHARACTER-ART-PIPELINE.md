# Tower Character Art Pipeline

This document defines how Season 1 character images move from story canon to app-safe production assets. It is intentionally approval-gated: the project can explore aggressively, but only approved assets enter `public/art` and `src/lib/visual-assets/manifest.ts`.

## Batch Factory Model

The pipeline now optimizes for two human approvals per character:

1. Initial character design approval: Armaan picks one identity reference from the concept board.
2. Final upload-ready board approval: Armaan reviews the complete staged sprite set and uses the exact phrase `approved for app`.

Everything between those gates is internal factory work. Agents and scripts generate production packets, split sheets, create 4K masters, export derivatives, run QA, and regenerate failed slots without asking for repeated approvals. Intermediate sheets can be rejected by the factory, but they are not new Armaan approval gates unless the character identity itself breaks.

## Locked Style

- Style name: `tower-flat-plus-depth-v1`
- Rendering: premium web-game sprite, clean raster shapes, strong silhouette, restrained depth, controlled rim/highlight, adult professional energy.
- Format target: true-alpha PNG or WebP, full body, stable frame, safe padding, no text.
- Master target: one 4K true-alpha master per approved pose and outfit variant, target long edge 4096px.
- Production target: optimized default, `@2x`, and `@3x` WebP derivatives generated from the 4K master.
- Production source target: native high-resolution individual sprite sources. Pose sheets can be used for review or consistency, but not as production source when splitting would make each pose too small.
- Production posture: straight-on or 3/4 front unless a pose definition requires otherwise.
- Background policy: true alpha for production sprites. For Gemini API source generation, prompt with `premium-simple-backdrop-v1`, run local cutout on the original provider source, then edge refinement and alpha QA before mastering; fake checkerboard transparency is a hard reject.
- Tone: Professional Scars. Characters are funny because they are competent in incompatible ways, not because they are caricatures.
- Outfit policy: every character has `regular`, `summer-light`, and `winter-layered` variants. These are wardrobe edits of the approved outfit, not new costumes, new palettes, or alternate identities.
- Image path: use the Creative Production Engine generation adapter layer. For the v3 paid automation path, use `gemini-api` locked to Nano Banana 2 (`gemini-3.1-flash-image-preview`) with five concurrent lanes, 4K, and budget caps. Initial design is exactly five total prompt-only images; production packs after design approval must use `--phase production-pack`. The no-API-billing fallback remains `gemini-subscription-browser` with Gemini Pro / Nano Banana through Armaan's subscription; use ChatGPT subscription generation only as fallback.
- Gemini API secret policy: API keys are read only from local `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or macOS Keychain service `tower-gemini-api-key` and are never stored in repo files, command flags, plans, prompt decks, receipts, or screenshots.
- Gemini API run hardening: paid runs use `api-run.lock` to prevent duplicate concurrent spend, write `api-run-state.json` for selected/skipped/retried slots, skip clean receipts on rerun, retry warning receipts as versioned attempts up to `--max-attempts`, apply request timeouts, retry transient provider/network failures, reject stale plans without an explicit phase, and refuse to continue when projected cost exceeds the approved budget.
- Asset Doctor Gate: after generated images or a review board exists, run `npm run art:generate doctor -- --plan <gemini-api-plan.json> --board <review-board.html>`. Before final upload-ready approval, add `--strict`. `completed-with-warnings` and doctor warnings are not production-ready.
- Generation UI lock: production prompts run in Pro, Thinking, Redo with Pro, or highest-quality available mode. Fast mode is draft-only. Style presets are off by default (`none/default`) and must be recorded if used. Color block is forbidden for Tower character production because it fights the approved premium web-game sprite direction.
- Subscription UI source reality: Pro downloads may still be below native 4K. That does not lower the bar; it means the run keeps source-size warnings visible and either passes the local master/derivative QA honestly or switches source strategy.
- Browser isolation: Gemini or ChatGPT subscription UI generation must use an isolated Tower Art Studio Playwright Chromium profile created by `npm run art:browser`, not the user's daily Chrome profile. True parallel five-lane image generation is now the Gemini API adapter path, not a manual multi-tab browser workflow.

## Quality Bar

Quality cannot be negotiated downstream. The image system is allowed to move slowly, regenerate, or throw away attractive boards if the resulting production sprites are not clean enough for the live app.

Reject or redo the work when:

- A concept is pretty but does not hold up as a readable game sprite.
- A source sheet fails separation, has overlapping characters, uneven scale, or cramped crop room.
- A transparent sprite shows green fringe, haloing, chopped edges, missing detail, prop clipping, or accidental fragments from neighboring poses.
- A sprite is only available as a small board crop or low-resolution prototype rather than a 4K transparent master.
- A derivative set is incomplete: default, `@2x`, and `@3x` must all exist before manifest approval.
- The character becomes fake-perfect, model-like, too muscular, too symmetrical, or less human than the approved identity.
- The model quality mode was Fast or the UI style preset was changed without being recorded in the bridge.
- The image was generated through Armaan's daily Chrome profile instead of an isolated Tower Art Studio browser session.
- The output leans into a generic preset style instead of the approved character identity and `tower-flat-plus-depth-v1`.
- The outfit variant becomes a new costume instead of an edit of the approved clothing system.
- The sprite only works in isolation and feels weak inside `/lobby`, `/lobby/onboarding`, or the relevant floor.

The standard is simple: if the asset would make the Tower feel cheaper, it does not ship.

## Asset Locations

- Draft boards and rejected candidates: `.artlab/characters/<characterId>/`
- Batch run ledger: `.artlab/runs/<characterId>/<runId>/run.json`
- Batch prompt packet: `.artlab/runs/<characterId>/<runId>/prompts/batch-prompt-packet.md`
- Ingested generated sources: `.artlab/runs/<characterId>/<runId>/incoming/`
- Split pose sources: `.artlab/runs/<characterId>/<runId>/split/<outfitVariant>/<pose>.png`
- Concept boards: `.artlab/characters/<characterId>/concepts/<characterId>_concept-board_v001_grid.png`
- Approved identity reference: `.artlab/characters/<characterId>/model/<characterId>_winner-ref_v001.png`
- Turnarounds: `.artlab/characters/<characterId>/model/<characterId>_turnaround_v001.png`
- Outfit variant sheets: `.artlab/characters/<characterId>/outfits/<characterId>_outfit-variants_v001.png`
- Expression sheets: `.artlab/characters/<characterId>/expressions/<characterId>_expressions_v001.png`
- Pose candidates: `.artlab/characters/<characterId>/poses/<outfitVariant>/<characterId>_<outfitVariant>_<pose>_candidate-a_v001.png`
- Approved 4K masters: `.artlab/characters/<characterId>/masters/<outfitVariant>/<pose>.png`
- QA previews: `.artlab/characters/<characterId>/qa/<runId>/<outfitVariant>/<pose>-dark.png` and `.artlab/characters/<characterId>/qa/<runId>/<outfitVariant>/<pose>-light.png`
- Staged public derivatives: `.artlab/characters/<characterId>/staged-public/<runId>/art/<space>/<characterId>/<outfitVariant>/<pose>.webp`
- Final review board: `.artlab/runs/<characterId>/<runId>/review/final-upload-ready-board.html`
- Approved production sprites: `public/art/<space>/<characterId>/<outfitVariant>/<pose>.webp`
- Required retina derivatives: `public/art/<space>/<characterId>/<outfitVariant>/<pose>@2x.webp` and `public/art/<space>/<characterId>/<outfitVariant>/<pose>@3x.webp`

Previous Otis draft and canary artifacts remain provenance in `.artlab`. Promoted Otis is the current production baseline in `public/art/lobby/otis/`; replacement Otis work must be a new run and must pass the same two-gate workflow before changing `public/art` or the generated manifest.

Drafts do not enter `public/art`. Production files are never overwritten in place; a new approved version gets a new source artifact and then the manifest changes.

## Drop-In Contract

The runtime contract lives in `src/lib/visual-assets/production-contract.ts`.

- Season 1 has 12 characters, 3 outfit variants, and 7 poses, for 252 expected production sprite slots.
- `getExpectedCharacterSpriteSlots()` lists every future approved sprite slot.
- `getProductionSpriteSrc(characterId, pose, outfitVariant)` returns the exact app URL: `/art/<space>/<characterId>/<outfitVariant>/<pose>.webp`.
- `getProductionSpriteRenditions(characterId, pose, outfitVariant)` returns the default, `@2x`, and `@3x` derivative paths and dimensions.
- `toApprovedCharacterVisualAsset(slot)` builds the manifest shape once a file is approved.
- `getMissingApprovedCharacterSprites(VISUAL_ASSETS)` reports what is still absent from the approved manifest.

This means the image-generation phase should not invent filenames, dimensions, alt text, prompt refs, or manifest ids. It should produce approved files that satisfy the contract.

Current production baseline: Otis Vale is promoted with 21 approved sprite slots and 63 WebP renditions, and the generated manifest is `src/lib/visual-assets/approved-character-assets.generated.json`. Treat that as production truth unless Armaan explicitly asks to redo Otis.

## Batch Run Contract

The factory contract lives in `src/lib/visual-assets/art-run.ts`.

- `createCharacterArtRunPlan()` creates a run ledger with exactly two human approval gates.
- `run.expectedSprites` resolves the 21 required sprites for one character: 3 outfit variants x 7 poses.
- `run.sourceBatches` defines the production packet plus one pose sheet per outfit.
- `run.processedSprites` records source resolution, 4K master resolution, checksums, and QA state.
- `buildApprovedCharacterVisualAssetsFromRun()` creates manifest-ready entries only after QA passes and the run is promoted.
- Approved character manifest data is generated into `src/lib/visual-assets/approved-character-assets.generated.json`; `manifest.ts` imports that file beside the protected Lobby backgrounds.

Factory commands:

```bash
npm run artlab -- status
npm run artlab -- health
npm run artlab -- doctor
npm run artlab -- produce "Create five prompt-only initial Otis designs from scratch."
npm run artlab -- continue <runId>
npm run artlab -- answer <runId> "approve direction 3"
npm run artlab -- answer <runId> "approved for app"
npm run artlab -- show <runId>
```

Older `art:*` factory commands live only in legacy docs and should not be used for new runs.

## Runtime Motion Model

Characters render through `CharacterStage`, which sits above `CharacterSprite`. `CharacterStage` chooses the correct pose for the current state, applies the character's `motionProfile`, and freezes transform animation under `prefers-reduced-motion`.

V1 talking is not lip sync. A speaking character uses the approved `talking` pose plus subtle motion while dialogue or streaming text is active. The system remains open to later expression overlays or mouth frames, but the first production layer is high-quality static pose sprites with restrained runtime motion.

Motion profiles are personality-specific:

- `concierge-calm`: soft breathing, gentle greeting nod, slight listening lean.
- `executive-still`: controlled stillness with almost no visible movement.
- `war-room-kinetic`: sharper lean and quicker alert/talking pressure.
- Other profiles follow the same rule: movement comes from the character bible, not a generic animation preset.

## Internal Factory Gates

These gates are internal quality gates, not repeated Armaan approvals.

### Gate 1: Character bible readiness

The character must have an approved record in `docs/CHARACTER-BIBLE.md` with story, doctrine, relationships, visual DNA, forbidden traits, and prompt fragments.

### Gate 2: Exactly 5 concept options, one winner

Generate exactly 5 concepts for the character: one base identity prompt x five concurrent lanes. No identity reference image is attached at this stage, because references collapse variety. The board must vary silhouette, age impression, posture, wardrobe cut, warmth, realism level inside the locked style, and prop read. A concept board fails if the options are merely color swaps.

Armaan selects exactly one winner. The winner becomes the character identity reference. Reject the winner if it only works at large size, overlaps another cast silhouette, feels like a mascot, or breaks the building metaphor.

### Gate 3: Batch production packet

Generate front, 3/4 front, side, 3/4 back, and back views from the approved winner reference. Identity, wardrobe, proportions, palette, and face structure must remain stable.

Generate the three approved outfit variants from the approved identity and turnaround: `regular`, `summer-light`, and `winter-layered`. The summer and winter versions must edit the same clothing system the character already wears. Do not invent a new outfit, new job fantasy, new palette, or new silhouette. For Otis, this means: regular concierge layers, summer-light shirt/open-collar reduced-layer version, and winter-layered fuller jacket combo.

Generate neutral, warm, focused, concerned, pleased, skeptical, urgent, and thinking expressions from the approved model sheet. The character must remain recognizably the same person in every expression.

### Gate 4: Pose sheets

Generate the production pose pack only after the turnaround, expression sheet, and outfit variant sheet pass. Required poses are `idle`, `greeting`, `listening`, `thinking`, `talking`, `alert`, and `working` for each of `regular`, `summer-light`, and `winter-layered`. One character continuity owner should generate all poses for a single character so the identity does not drift.

### Gate 5: Scripted source ingest and splitting

Generated sheets are imported into the run ledger, split into deterministic per-pose sources, and preserved with checksums.

### Gate 6: Master, derivative, and automated QA

The scripts normalize 4K true-alpha masters, export default/`@2x`/`@3x` derivatives into staged public paths, and block promotion when slots, dimensions, alpha, prompt refs, checksums, or QA status are missing.

### Gate 7: Final upload-ready board

The review command builds one board showing every staged sprite on dark and light backgrounds. This is the second human approval gate.

Before Armaan sees this as an upload-ready board, run the Asset Doctor Gate with `--strict`. A board with missing, corrupt, external, inline, or warning-only image references is not upload-ready even if the HTML opens.

### Gate 8: Promotion and app preview

Only after the exact phrase `approved for app`, staged files are copied into `public/art` and generated manifest data is updated. Each manifest entry must include `src`, `width`, `height`, `role`, `approvalStatus: "approved"`, `promptRef`, `alt`, `characterId`, `outfitVariant`, `pose`, `sourceRunId`, `assetVersion`, `checksum`, `sourceResolution`, `masterResolution`, `qaStatus`, and `promotionDate`. Preview the asset in desktop and mobile frames before merging.

## Prompt Families

### Concept board

```text
Create exactly 5 distinct prompt-only concept options for {characterName}, {title} of The Tower, an immersive internship command-center skyscraper. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, flat forms with subtle controlled depth. Character canon: {characterBibleSummary}. Visual DNA: {visualDNA}. Role doctrine: {roleDoctrine}. Relationships and comedic engine: {relationshipsAndComedy}. Vary silhouette, posture, age impression, wardrobe cut, warmth, and expression while preserving the role. No text, logo, watermark, celebrity likeness, mascot proportions, superhero costume, sci-fi armor, or random props.
```

### Winner reference

```text
Using the approved concept {conceptId}, create one clean full-body identity reference for {characterName}. Preserve the exact silhouette, face DNA, hair DNA, wardrobe DNA, palette, canonical prop, and character attitude. Solid neutral approval background, safe padding, tower-flat-plus-depth-v1, no text, no logo, no watermark.
```

### Turnaround

```text
Using approved identity reference {refId}, create a model turnaround sheet for {characterName}. Preserve exact identity, face structure, hairstyle, wardrobe, palette, silhouette, and proportions. Views: front, 3/4 front, side, 3/4 back, back. Neutral expression, arms relaxed, consistent scale, neutral sheet background, tower-flat-plus-depth-v1, no text.
```

### Outfit variant sheet

```text
Using approved identity reference {refId} and approved turnaround {turnaroundId}, create the three approved outfit variants for {characterName}: regular, summer-light, and winter-layered. Preserve exact face, hair, body proportions, silhouette logic, palette family, and role identity. The variants must be edits of the approved outfit, not new costumes: regular keeps the approved base outfit, summer-light removes or opens layers while preserving the same clothing language, and winter-layered adds the heavier jacket/layer combo while preserving the same clothing language. Full-body neutral approval background, same scale, tower-flat-plus-depth-v1, no text, no logo, no watermark.
```

### Expression sheet

```text
Using approved identity reference {refId} and approved turnaround {turnaroundId}, create an expression sheet for {characterName}. Preserve exact identity, hairstyle, wardrobe, palette, and proportions. Expressions: neutral, warm, focused, concerned, pleased, skeptical, urgent, thinking. Head and upper torso only, consistent camera and lighting, tower-flat-plus-depth-v1, no text.
```

### Pose pack

```text
Using approved identity reference {refId}, approved turnaround {turnaroundId}, approved expression sheet {expressionId}, and approved outfit variant sheet {outfitSheetId}, create the {outfitVariant} {poseName} 4K production source for {characterName}. Use premium-simple-backdrop-v1 with high subject-background separation, no patterned walls, no furniture overlap, no same-color clothing-background collision, no touching shadows, full-body framing, same identity, same proportions, same palette family, approved {outfitVariant} wardrobe edit. Pose definition: {poseDefinition}. Target source frame: {sourceFrameWidth}x{sourceFrameHeight}, long edge at least 4096px, with safe padding around hair, hands, props, and feet. Style: tower-flat-plus-depth-v1. No checkerboard, no background scene, no text, no logo, no watermark.
```

## Anti-Drift Rules

- After Gate 3, never regenerate a production asset from text alone.
- Every continuation prompt uses the approved identity reference.
- If an output improves the look but changes the identity, fork it as a new concept candidate rather than using it as a pose.
- Maintain a drift ledger per character: accepted changes, rejected changes, and why.
- Compare every candidate against the approved reference for silhouette, face, hair, wardrobe, palette, prop, and mobile read.
- Keep rejected drafts in `.artlab` until the character set is finalized, then archive or delete them as a separate cleanup task.

## Parallel Subagent Workflow

- Wave 0: Art director checks cast-level silhouette spread and style conflicts.
- Wave 1: Character-bible agents deepen individual character records without generating images.
- Wave 2: Concept agents generate one 5-option prompt-only board per character after bible approval.
- Wave 3: Continuity agents generate turnarounds, outfit variant sheets, and expression sheets only for approved winners.
- Wave 4: Pose agents work one character at a time, owning all three outfit variants and all seven poses for that character.
- Wave 5: QA agent checks prompt refs, dimensions, filenames, manifest entries, alt text, and approval status.
- Wave 6: Browser QA checks desktop, mobile, reduced motion, and floor lighting.

Subagents may not commit, deploy, touch secrets, or add unapproved files to the production manifest.

## First Pilot: Otis

Otis remains first because the Lobby already has canonical environmental art. Otis is now promoted, browser-QA verified, closed, and protected, so he is the first production regression baseline rather than a new generation target.

Next:

- Run `npm run artlab -- status`.
- Confirm Otis reports as `closed`, browser-QA verified, and protected as the promoted baseline.
- Use Otis as the first regression fixture for status, health, cleanup, manifest protection, and browser checks.
- Mara Voss (`ceo`) is the next unpromoted character unless Armaan explicitly asks to redo Otis.
