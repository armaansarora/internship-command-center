# 01 api-lane-01__otis-winter-layered-working

Model: `gemini-3.1-flash-image-preview`
Image config: 9:16, 4K
Prompt hash: `65545daad3ba1bc5`

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

Named-slot regeneration source-framing override:
Regenerate only otis-winter-layered-working from the locked Otis identity. The character must be shown full-body head-to-toe in a single clean standing/working pose with both feet fully visible, both hands fully visible, beard and hair fully inside frame, and generous empty padding on all sides. Use a simple high-contrast premium backdrop with no scene elements. Forbid counters, desks, furniture, rails, columns, shelves, wall panels, props touching the body, any background object overlapping the silhouette, any object crossing hair, beard, fingers, keys, badge, held prop, clothing, or feet, floor shadows, contact shadows, cast shadows touching the character, cropped feet, cropped hands, cropped head, cropped beard, or cropped held props. Keep the subject fully separated from the backdrop with crisp foreground/background separation suitable for local rembg cutout. Do not add a counter, desk, railing, furniture edge, floor contact shadow, or environmental prop even if it makes the pose feel more natural.
```