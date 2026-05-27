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
Estimated cost: 3.62 USD
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
	npm run art:generate -- cutout-readiness --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/full/gemini-api-plan.json
	npm run art:generate -- run-api --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/full/gemini-api-plan.json
	npm run art:generate -- cutout-auto --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/full/gemini-api-plan.json --slots <slot-id>
	npm run art:generate -- cutout-doctor --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/full/gemini-api-plan.json --strict
	npm run art:generate -- status --bridge /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-real-rembg-canary-v1/generation/gemini-api-v3/full/gemini-api-plan.json
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

## Slot 2: api-lane-01__otis-turnaround

Lane: api-lane-01
Base slot: otis-turnaround
Prompt hash: f4fa8077fae8750f
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-turnaround/otis__turnaround__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production packet sheet image for Tower slot otis-turnaround.
Use Nano Banana 2 only. Create one image file only; this sheet may contain the multiple approved Otis views required by the slot.
Target output: 4K production packet sheet, portrait 9:16 framing, with consistent scale and generous safe padding.
Use the premium-simple-backdrop-v1 contract: high subject/background separation, no patterned walls, no furniture overlap, no same-color clothing/background collisions, full-body framing, and generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Do not draw contact shadows, ground shadows, halo, glow, haze, ambient spill, or floor-plane lighting that touches or merges with the body silhouette.
Keep the foreground cleanly separated from the backdrop so local cutout, edge refinement, and strict alpha QA can run deterministically before mastering.
No text, logo, watermark, UI, frame, or labels. Multiple Otis figures are allowed only as required by this sheet; keep identity consistent across every view.
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

## Slot 3: api-lane-01__otis-expression-sheet

Lane: api-lane-01
Base slot: otis-expression-sheet
Prompt hash: e1e2321a163ad83a
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-expression-sheet/otis__expression-sheet__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production packet sheet image for Tower slot otis-expression-sheet.
Use Nano Banana 2 only. Create one image file only; this sheet may contain the multiple approved Otis views required by the slot.
Target output: 4K production packet sheet, portrait 9:16 framing, with consistent scale and generous safe padding.
Use the premium-simple-backdrop-v1 contract: high subject/background separation, no patterned walls, no furniture overlap, no same-color clothing/background collisions, full-body framing, and generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Do not draw contact shadows, ground shadows, halo, glow, haze, ambient spill, or floor-plane lighting that touches or merges with the body silhouette.
Keep the foreground cleanly separated from the backdrop so local cutout, edge refinement, and strict alpha QA can run deterministically before mastering.
No text, logo, watermark, UI, frame, or labels. Multiple Otis figures are allowed only as required by this sheet; keep identity consistent across every view.
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

## Slot 4: api-lane-01__otis-outfit-variants

Lane: api-lane-01
Base slot: otis-outfit-variants
Prompt hash: 99d313103a7ab53e
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-outfit-variants/otis__outfit-variants__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production packet sheet image for Tower slot otis-outfit-variants.
Use Nano Banana 2 only. Create one image file only; this sheet may contain the multiple approved Otis views required by the slot.
Target output: 4K production packet sheet, portrait 9:16 framing, with consistent scale and generous safe padding.
Use the premium-simple-backdrop-v1 contract: high subject/background separation, no patterned walls, no furniture overlap, no same-color clothing/background collisions, full-body framing, and generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Do not draw contact shadows, ground shadows, halo, glow, haze, ambient spill, or floor-plane lighting that touches or merges with the body silhouette.
Keep the foreground cleanly separated from the backdrop so local cutout, edge refinement, and strict alpha QA can run deterministically before mastering.
No text, logo, watermark, UI, frame, or labels. Multiple Otis figures are allowed only as required by this sheet; keep identity consistent across every view.
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

## Slot 5: api-lane-01__otis-regular-idle

Lane: api-lane-01
Base slot: otis-regular-idle
Prompt hash: 092fbab88a23dd8c
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-regular-idle/otis__regular__idle__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-regular-idle.
Outfit: regular.
Pose: idle.
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

## Slot 6: api-lane-01__otis-regular-greeting

Lane: api-lane-01
Base slot: otis-regular-greeting
Prompt hash: 48420d3946d91646
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-regular-greeting/otis__regular__greeting__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-regular-greeting.
Outfit: regular.
Pose: greeting.
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

## Slot 7: api-lane-01__otis-regular-listening

Lane: api-lane-01
Base slot: otis-regular-listening
Prompt hash: e775b9df334f1903
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-regular-listening/otis__regular__listening__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-regular-listening.
Outfit: regular.
Pose: listening.
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

## Slot 8: api-lane-01__otis-regular-thinking

Lane: api-lane-01
Base slot: otis-regular-thinking
Prompt hash: 5813550fe86cf772
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-regular-thinking/otis__regular__thinking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-regular-thinking.
Outfit: regular.
Pose: thinking.
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

## Slot 9: api-lane-01__otis-regular-talking

Lane: api-lane-01
Base slot: otis-regular-talking
Prompt hash: 508973b95e72c9d7
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-regular-talking/otis__regular__talking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-regular-talking.
Outfit: regular.
Pose: talking.
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

## Slot 10: api-lane-01__otis-regular-alert

Lane: api-lane-01
Base slot: otis-regular-alert
Prompt hash: 11884c5302e417e8
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-regular-alert/otis__regular__alert__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-regular-alert.
Outfit: regular.
Pose: alert.
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

## Slot 11: api-lane-01__otis-regular-working

Lane: api-lane-01
Base slot: otis-regular-working
Prompt hash: c020a7763946de3b
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-regular-working/otis__regular__working__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-regular-working.
Outfit: regular.
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

## Slot 12: api-lane-01__otis-summer-light-idle

Lane: api-lane-01
Base slot: otis-summer-light-idle
Prompt hash: df302bb159e11513
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-summer-light-idle/otis__summer-light__idle__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-summer-light-idle.
Outfit: summer-light.
Pose: idle.
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

## Slot 13: api-lane-01__otis-summer-light-greeting

Lane: api-lane-01
Base slot: otis-summer-light-greeting
Prompt hash: a1d6dc5ef8a8d71f
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-summer-light-greeting/otis__summer-light__greeting__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-summer-light-greeting.
Outfit: summer-light.
Pose: greeting.
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

## Slot 14: api-lane-01__otis-summer-light-listening

Lane: api-lane-01
Base slot: otis-summer-light-listening
Prompt hash: 2599fda54ee70ac7
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-summer-light-listening/otis__summer-light__listening__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-summer-light-listening.
Outfit: summer-light.
Pose: listening.
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

## Slot 15: api-lane-01__otis-summer-light-thinking

Lane: api-lane-01
Base slot: otis-summer-light-thinking
Prompt hash: 6055f1deaab64cc5
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-summer-light-thinking/otis__summer-light__thinking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-summer-light-thinking.
Outfit: summer-light.
Pose: thinking.
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

## Slot 16: api-lane-01__otis-summer-light-talking

Lane: api-lane-01
Base slot: otis-summer-light-talking
Prompt hash: a510a0bddfec42c4
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-summer-light-talking/otis__summer-light__talking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-summer-light-talking.
Outfit: summer-light.
Pose: talking.
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

## Slot 17: api-lane-01__otis-summer-light-alert

Lane: api-lane-01
Base slot: otis-summer-light-alert
Prompt hash: 99a4abb4a1e8d891
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-summer-light-alert/otis__summer-light__alert__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-summer-light-alert.
Outfit: summer-light.
Pose: alert.
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

## Slot 18: api-lane-01__otis-summer-light-working

Lane: api-lane-01
Base slot: otis-summer-light-working
Prompt hash: c8da4f700aace988
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-summer-light-working/otis__summer-light__working__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-summer-light-working.
Outfit: summer-light.
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

## Slot 19: api-lane-01__otis-winter-layered-idle

Lane: api-lane-01
Base slot: otis-winter-layered-idle
Prompt hash: 3f44bd1b65866051
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-winter-layered-idle/otis__winter-layered__idle__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-winter-layered-idle.
Outfit: winter-layered.
Pose: idle.
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

## Slot 20: api-lane-01__otis-winter-layered-greeting

Lane: api-lane-01
Base slot: otis-winter-layered-greeting
Prompt hash: 8647c19131073d50
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-winter-layered-greeting/otis__winter-layered__greeting__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-winter-layered-greeting.
Outfit: winter-layered.
Pose: greeting.
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

## Slot 21: api-lane-01__otis-winter-layered-listening

Lane: api-lane-01
Base slot: otis-winter-layered-listening
Prompt hash: 982acb3cab225223
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-winter-layered-listening/otis__winter-layered__listening__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-winter-layered-listening.
Outfit: winter-layered.
Pose: listening.
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

## Slot 22: api-lane-01__otis-winter-layered-thinking

Lane: api-lane-01
Base slot: otis-winter-layered-thinking
Prompt hash: 7f21929597561860
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-winter-layered-thinking/otis__winter-layered__thinking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-winter-layered-thinking.
Outfit: winter-layered.
Pose: thinking.
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

## Slot 23: api-lane-01__otis-winter-layered-talking

Lane: api-lane-01
Base slot: otis-winter-layered-talking
Prompt hash: a9b00e6629d755c9
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-winter-layered-talking/otis__winter-layered__talking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-winter-layered-talking.
Outfit: winter-layered.
Pose: talking.
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

## Slot 24: api-lane-01__otis-winter-layered-alert

Lane: api-lane-01
Base slot: otis-winter-layered-alert
Prompt hash: 95c185c27435d278
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-real-rembg-canary-v1/gemini-api-v3/api-lane-01/otis-winter-layered-alert/otis__winter-layered__alert__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production foreground asset image for Tower slot otis-winter-layered-alert.
Outfit: winter-layered.
Pose: alert.
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
