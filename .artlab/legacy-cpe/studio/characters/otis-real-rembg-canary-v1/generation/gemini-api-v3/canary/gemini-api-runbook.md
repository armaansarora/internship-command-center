# Gemini API Generation Runbook

Run: `otis-real-rembg-canary-v1`
Asset: Otis (character)
Adapter: Gemini API
Phase: production-pack
Model: `gemini-3.1-flash-image-preview` (Nano Banana 2)
Resolution: 4K
Aspect ratio: 9:16
Parallel lanes: 1
Max concurrency: 1
Estimated cost: 0.15 USD
Budget cap: 10.00 USD

## Hard Rules

- API key is read only from `GEMINI_API_KEY` or `GOOGLE_API_KEY` or macOS Keychain service `tower-gemini-api-key`.
- Never write API keys into this repo, command flags, run JSON, prompt decks, receipts, or screenshots.
	- This plan disables Google Search grounding by default to avoid surprise search charges and external-source attribution obligations.
	- Initial design plans are exactly five prompt-only concepts: one base slot x five concurrent lanes, with no reference images.
	- Production packs must be generated after design approval with `--phase production-pack`.
	- Gemini sources must use the `premium-simple-backdrop-v1` contract so the local fail-closed cutout compiler can separate the foreground cleanly.
	- Cutout order is provider source, local cutout, `edge-refinement-v1`, alpha QA, then master/upscale/derive.
	- Production mode is offline by default for cutout models. Missing cached model evidence blocks the slot instead of downloading silently.
	- Every output lands in the labeled inbox first. Nothing goes to `public/art` until QA passes and Armaan says exactly `approved for app`.
	- If any output is below the source contract, regenerate that slot only. Do not expand waste.

## Commands

	```bash
	npm run art:generate -- cutout-readiness --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/canary/gemini-api-plan.json
	npm run art:generate -- run-api --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/canary/gemini-api-plan.json
	npm run art:generate -- cutout-auto --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/canary/gemini-api-plan.json --slots <slot-id>
	npm run art:generate -- cutout-doctor --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/canary/gemini-api-plan.json --strict
	npm run art:generate -- status --bridge /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/canary/gemini-api-plan.json
	```

## Slots

## Slot 1: api-lane-01__otis-winter-layered-working

Lane: api-lane-01
Base slot: otis-winter-layered-working
Prompt hash: e2d8963ad73dc181
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-winter-layered-working/otis__winter-layered__working__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-winter-layered-working.
Outfit: winter-layered.
Pose: working.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Use the premium-simple-backdrop-v1 contract: high subject/background separation, no patterned walls, no furniture overlap, no same-color clothing/background collisions, full-body framing, and generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Do not draw contact shadows, ground shadows, halo, glow, haze, ambient spill, or floor-plane lighting that touches or merges with the body silhouette.
Keep the foreground cleanly separated from the backdrop so local cutout, edge refinement, and strict alpha QA can run deterministically before mastering.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and all expected slot props fully uncropped with generous safe padding.
# Otis Real Rembg Canary Directive

Run phase: production-pack canary only. This is not initial design and not a full production spend.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Cutout Source Contract

Use `premium-simple-backdrop-v1`: a quiet simple non-patterned backdrop with high subject/background separation. No patterned walls, no furniture overlap, no same-color clothing/background collision, no shadows touching or merging with the body, no floor plane, no halo, no glow, no haze, and no ambient spill outside the body silhouette. Keep the full body centered in portrait 9:16 framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, coat hems, and held props.

The local cutout compiler owns transparency. Do not fake transparency, do not add checkerboard, do not include UI frames, and do not bake app shadows into the source. Tower will render runtime shadows after local cutout.

## Canary Target

The canary slot is selected from slot metadata so the shared directive does not accidentally make easy slots look difficult. The selected canary must be suitable for local rembg cutout, edge refinement, strict alpha QA, mastering, derived previews, and final review-board inspection.

## Full Pack Shape For Later

After this canary passes, the later full production packet remains: turnaround, expression sheet, outfit variants, and 21 individual sprites across regular, summer-light, and winter-layered outfits. Do not run that full pack now.


Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full subject and all expected props fully inside frame; leave visible breathing room around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```
