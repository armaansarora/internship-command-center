# Otis v2 Generation Directive

Parent run: `2026-05-14-otis-production-redo-v1`
Coordinator status: 15/15 lanes complete
Promotion gate: blocked until native source images pass QA

## Synthesis

Otis v2 should be generated as **Threshold Keeper Otis**.

He is the warm older concierge of The Tower lobby: soft Santa-adjacent without being Santa, slightly rounded, lived-in, quietly prepared, and deeply human. His comedy is not goofy; it is warm overpreparedness. He anticipates what the user needs one beat early, then self-corrects with tiny adult micro-expressions.

He must read as a premium web-game sprite, not a fake-perfect AI person. The winning ingredients from the 15 lanes are:

- Approved soft Santa concierge identity, preserved exactly.
- Lived-in human imperfections: slight belly, kind tired eyes, relaxed uneven shoulders, imperfect groomed white beard and hair, natural older hands, warm asymmetrical smile.
- Threshold-keeper pose language: he is always gently opening the next step, not performing.
- Strong mobile silhouette with clean negative space and visible hands.
- Simple matte burgundy, ivory, charcoal, and restrained aged-brass material system.
- One useful prop at a time: keycard, small key ring, ledger, tablet, or tiny brass elevator-call button token.
- Lobby-compatible dramatic lighting: warm brass/ivory highlights with deep burgundy/navy mood, never muddy.
- CharacterStage-ready poses: stable feet, stable center of mass, small gestures, reduced-motion safe.

## Do Not Generate Full Pack Yet

Generate only the first three source probes. Stop and preflight before expanding.

1. `regular/idle`
2. `regular/greeting`
3. `regular/working`

Only after all three pass source and app-scale QA should the full 3 outfit x 7 pose pack proceed.

## Source Acceptance Contract

Each probe must be one individual full-body source file, not a multi-pose sheet.

- Preferred source format: transparent PNG with true alpha.
- Target source frame: `2400x4096`.
- Minimum long edge: `4096px`.
- Minimum short edge: `2300px`.
- Source must not be an upscaled low-resolution image.
- Safe padding at source frame: top 7%, right 11%, bottom 8%, left 11%.
- No cropped hands, feet, elbows, ledger corners, keycards, bells, coat hems, or shadow/grounding cues.
- No haloing on dark, light, checkerboard, or lobby-warm previews.
- Readable at 64, 96, 144, 192, and 256 CSS px.
- No production file may enter `public/art` until final approval says exactly `approved for app`.

## Master Prompt

Use the approved identity/outfit reference:

`.artlab/characters/otis/references/identity/otis_identity-outfit-variants_v001_reference.png`

Prompt:

```text
Create a single full-body transparent character sprite of Otis Vale, the warm older concierge and threshold keeper of The Tower lobby. Preserve the approved soft Santa-adjacent concierge identity without making him Santa: kind tired eyes behind simple glasses, imperfect groomed white beard and hair, relaxed uneven shoulders, slight belly, natural older hands, warm asymmetrical smile, and quiet overprepared competence. Premium clean web-game raster sprite, strong mobile-readable silhouette, subtle 2.5D depth, matte burgundy concierge fabric, ivory shirt, dark tailored trousers, restrained aged-brass detail, lived-in fabric creases, polished but human.

Pose: {POSE_PROMPT}
Outfit: {OUTFIT_PROMPT}

Full body, centered, true transparent background, generous safe padding around hair, beard, hands, feet, coat hem, and props. Lobby-compatible warm brass and ivory lighting with burgundy/deep navy mood, but no background. Keep one useful prop at most. Otis carries the moment; props stay small and readable.
```

Negative prompt:

```text
No celebrity likeness, no literal Santa costume, no red hat, no elf, no fantasy innkeeper, no mascot, no superhero, no Pixar, no Disney, no anime, no ultra-real portrait, no plastic toy finish, no perfect model face, no stock hotel smile, no huge belly caricature, no sloppy clothing, no ornate gold overload, no noisy embroidery, no cropped hands or feet, no malformed fingers, no unreadable props, no sharp weapon-like keys, no haloed edges, no busy background, no text, no logo, no watermark, no UI, no frame, no pose sheet, no multiple characters.
```

## First Three Probe Prompts

### Probe 1: Regular Idle

Slot: `otis-regular-idle`
Source filename: `otis__regular__idle__source-v001.png`

Pose prompt:

```text
Calm grounded idle stance, weight gently shifted, hands visible and relaxed near midline, slight belly readable, expression attentive and calm, no prop required.
```

Outfit prompt:

```text
Regular outfit: burgundy concierge jacket or cardigan with ivory shirt, dark tailored trousers, restrained brass name pin or keycard detail, simple polished dark shoes, matte fabric, no loud trim.
```

### Probe 2: Regular Greeting

Slot: `otis-regular-greeting`
Source filename: `otis__regular__greeting__source-v001.png`

Pose prompt:

```text
Small warm greeting gesture, one low open hand inviting the user through the threshold, other hand relaxed near his side or a small ledger, fingers clean and fully visible, gesture narrow enough for a 170 x 290 display frame.
```

Outfit prompt:

```text
Regular outfit: burgundy concierge jacket or cardigan with ivory shirt, dark tailored trousers, restrained brass name pin or keycard detail, simple polished dark shoes, matte fabric, no loud trim.
```

### Probe 3: Regular Working

Slot: `otis-regular-working`
Source filename: `otis__regular__working__source-v001.png`

Pose prompt:

```text
Working focus pose, holding or consulting a small guest ledger and keycard ring, props restrained and fully inside the safe frame, hands visible, eyes warm and prepared, face and slight belly silhouette not hidden by the prop.
```

Outfit prompt:

```text
Regular outfit: burgundy concierge jacket or cardigan with ivory shirt, dark tailored trousers, restrained brass name pin or keycard detail, simple polished dark shoes, matte fabric, no loud trim.
```

## Immediate QA After Each Probe

Run source preflight before generating more:

```bash
npm run art:preflight -- <source-file> --minimum-long-edge 4096 --json
```

If a probe uses chroma instead of true alpha, also run:

```bash
npm run art:preflight -- <source-file> --minimum-long-edge 4096 --chroma-key 00ff00 --json
```

Stop if any probe fails resolution, alpha/background, crop, hand integrity, identity lock, edge halo, or mobile readability.

## Promotion State

This directive is not app approval. It is the next generation step.

Current promotion blockers:

- No native high-resolution source images have been generated in this run.
- No source preflight has passed for Otis v2.
- No derivative export has happened for Otis v2.
- No dark/light/lobby QA board exists for Otis v2.
- No CharacterStage app-scale preview exists for Otis v2.
- Final production promotion still requires the exact phrase `approved for app`.
