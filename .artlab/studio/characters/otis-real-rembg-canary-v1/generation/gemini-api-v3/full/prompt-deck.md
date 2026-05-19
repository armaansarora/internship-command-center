# 01 api-lane-01__otis-winter-layered-working

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `e2d8963ad73dc181`

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

# 02 api-lane-01__otis-turnaround

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `f4fa8077fae8750f`

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

# 03 api-lane-01__otis-expression-sheet

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `e1e2321a163ad83a`

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

# 04 api-lane-01__otis-outfit-variants

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `99d313103a7ab53e`

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

# 05 api-lane-01__otis-regular-idle

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `092fbab88a23dd8c`

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

# 06 api-lane-01__otis-regular-greeting

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `48420d3946d91646`

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

# 07 api-lane-01__otis-regular-listening

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `e775b9df334f1903`

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

# 08 api-lane-01__otis-regular-thinking

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `5813550fe86cf772`

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

# 09 api-lane-01__otis-regular-talking

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `508973b95e72c9d7`

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

# 10 api-lane-01__otis-regular-alert

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `11884c5302e417e8`

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

# 11 api-lane-01__otis-regular-working

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `c020a7763946de3b`

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

# 12 api-lane-01__otis-summer-light-idle

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `df302bb159e11513`

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

# 13 api-lane-01__otis-summer-light-greeting

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `a1d6dc5ef8a8d71f`

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

# 14 api-lane-01__otis-summer-light-listening

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `2599fda54ee70ac7`

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

# 15 api-lane-01__otis-summer-light-thinking

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `6055f1deaab64cc5`

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

# 16 api-lane-01__otis-summer-light-talking

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `a510a0bddfec42c4`

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

# 17 api-lane-01__otis-summer-light-alert

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `99a4abb4a1e8d891`

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

# 18 api-lane-01__otis-summer-light-working

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `c8da4f700aace988`

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

# 19 api-lane-01__otis-winter-layered-idle

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `3f44bd1b65866051`

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

# 20 api-lane-01__otis-winter-layered-greeting

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `8647c19131073d50`

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

# 21 api-lane-01__otis-winter-layered-listening

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `982acb3cab225223`

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

# 22 api-lane-01__otis-winter-layered-thinking

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `7f21929597561860`

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

# 23 api-lane-01__otis-winter-layered-talking

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `a9b00e6629d755c9`

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

# 24 api-lane-01__otis-winter-layered-alert

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `95c185c27435d278`

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