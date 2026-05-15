# GPT Image 2 Dramatic Lighting Prompt Packet

Lane: wave-02-agent-05  
Parent run: 2026-05-14-otis-production-redo-v1  
Asset: Otis Vale character sprite production probes  
Purpose: Stress-test dramatic lighting without losing the approved soft Santa concierge identity or app-scale readability.

## Non-Negotiable Base Identity

Use this identity block in every probe:

> Otis Vale, a warm older human concierge and threshold keeper for an elegant AI internship command center called The Tower. He has the approved soft Santa concierge identity: kind eyes, naturally imperfect face, full but tidy white beard and mustache, lived-in warmth, slight belly, sturdy approachable posture, premium hotel-concierge presence, human asymmetry, practical hands, and a strong mobile-readable silhouette. He is not a celebrity, not a fantasy wizard, not a toy, not a mascot, and not an ultra-realistic photo subject.

## Shared Sprite Requirements

- Produce native high-resolution production source, target 4096px or larger on the long edge.
- Full body, centered, full silhouette visible, feet and hands uncropped, 10 percent transparent-safe padding on all sides.
- Clean transparent background if available. If transparency is not available, use a perfectly flat single-color background with no shadows, gradients, texture, bloom, or rim spill touching the edge.
- Premium stylized game-sprite material: painterly but clean, slightly simplified forms, crisp readable planes, restrained texture, no photoreal skin pores, no plastic toy finish.
- Readable face at small UI scale. Eyes, nose bridge, mustache, beard edge, and smile line must remain legible at 128px tall.
- Lighting must imply the preserved lobby palette: brass, ivory, burgundy, and deep navy. Do not paint in the lobby background.
- No haloing, no glowing outline, no muddy dark sprite, no rim-only face, no horror lighting, no theatrical overacting.

## Probe A - Brass Threshold Key Light

Use when the coordinator wants the safest dramatic option.

```text
Create a transparent full-body production sprite of Otis Vale in his regular concierge outfit, idle pose, facing 3/4 front. Apply a warm brass key light from high front-left, soft ivory fill from front-right, and a very subtle deep navy contact shadow within the figure only. The light should feel like he is standing at the threshold of a grand brass-and-ivory lobby, but the output must remain a clean transparent character sprite with no background scene.

Keep Otis readable and humane: soft Santa concierge warmth, slight belly, natural facial asymmetry, tidy white beard, kind eyes, premium but approachable. Stylized premium game-sprite rendering, not photorealistic. Face is the brightest readable region after the shirt front; beard is warm ivory with visible shape separation; burgundy accents are rich but not black. Preserve full silhouette, hands, shoes, and padding.

Negative constraints: no ultra-realistic rendering, no celebrity likeness, no muddy dark values, no dramatic face obscuration, no halo or glow outline, no neon rim, no hard black shadows, no painted lobby background, no cropped hands or feet, no synthetic perfect model face.
```

Expected value: Best all-purpose lighting for the full 21-sprite pack because the face remains readable while the brass/ivory lobby mood is present.

## Probe B - Burgundy Lantern Side Drama

Use when testing whether a richer evening mood can survive mobile scale.

```text
Create a transparent full-body production sprite of Otis Vale in his greeting pose, facing 3/4 front with one practical welcoming hand raised. Apply a soft burgundy side bounce from camera-right, warm brass key light from camera-left, and restrained ivory fill directly on the face. The result should feel dramatic and premium, like warm lobby lamps reflecting off burgundy velvet, while still being a clean readable game sprite.

Otis must remain a human threshold keeper with soft Santa concierge warmth, slight belly, kind eyes, naturally imperfect features, and sturdy mobile silhouette. Keep the face clearly readable; do not let the burgundy side light stain the skin or beard into red mud. Beard should separate from jacket and background. Materials are clean premium sprite painting, not photorealistic.

Negative constraints: no dark red face, no horror underlighting, no nightclub look, no black crushed jacket, no haloing, no glow outline, no background, no cropped fingers, no perfect symmetrical AI-model face.
```

Expected value: A stress probe for richer lobby atmosphere. Promote only if the 128px face check passes.

## Probe C - Deep Navy Back-Rim With Ivory Face Hold

Use to test the riskiest dramatic direction.

```text
Create a transparent full-body production sprite of Otis Vale in the listening pose, facing 3/4 front with relaxed attentive posture. Use a deep navy back-rim only as a narrow shape separator on the dark side of the coat, a soft brass key from high front-left, and a deliberate ivory face hold so the eyes, nose, mustache, and smile remain readable at mobile scale.

The mood should suggest The Tower lobby at night: deep navy depth, brass trim, ivory marble glow, and burgundy warmth in small accents. Do not make the figure dark overall. Otis remains the approved soft Santa concierge threshold keeper: warm older human, slight belly, natural imperfections, tidy white beard, approachable dignity, strong silhouette.

Negative constraints: no silhouette-only sprite, no rim-only face, no blue halo around the body, no smoke, no bloom, no realistic photography, no muddy navy coat, no cropped hands or feet, no background scene, no fantasy wizard lighting.
```

Expected value: Good if it gives depth without making the sprite vanish over deep navy UI. Block if navy rim becomes a glow outline.

## Probe D - Ivory Desk Glow For Working Pose

Use for desk-adjacent poses where the sprite needs calm authority.

```text
Create a transparent full-body production sprite of Otis Vale in the working pose, reading or holding a small concierge clipboard/tablet without covering his torso. Use soft ivory upward-adjacent desk glow kept below the chin, warm brass key light on the face, and minimal burgundy reflected warmth on one sleeve. Keep the lighting believable and calm, not spooky or theatrical.

Otis should feel like a premium human concierge helping at the threshold: soft Santa warmth, slight belly, natural facial variation, tidy beard, readable hands, grounded stance. Premium stylized game-sprite rendering with clean edges and strong small-size readability. The figure must work on ivory, burgundy, brass, and deep navy lobby backgrounds.

Negative constraints: no underlit horror face, no laptop-blue glow, no photorealistic portrait treatment, no extra fingers, no cropped prop, no halo, no scene background, no dark muddy beard.
```

Expected value: Useful pose-specific lighting for working/thinking states, but not a universal identity reference.

## Probe E - Outfit Lighting Consistency Mini Sheet

Use only after a single individual sprite proves the lighting family works.

```text
Create a three-column character lighting consistency sheet for Otis Vale, full-body 3/4 front idle pose repeated in three approved outfit variants: regular concierge outfit, formal tower-service outfit, and relaxed after-hours concierge outfit. Keep the exact same Otis identity, face, body proportions, slight belly, beard shape, posture, and silhouette across all three. Use the Brass Threshold Key Light recipe consistently: warm brass key, ivory face fill, tiny deep navy shape separation, and restrained burgundy accent warmth.

This is a production prompt probe, not a final pose sheet. The output must prove outfit material behavior and identity consistency. Clean premium game-sprite style, not ultra-realistic, not cartoon childish, not dark muddy. Use a flat neutral background only if transparency is unavailable. Full body, no cropping, no labels inside the image.

Negative constraints: no identity drift between columns, no different face ages, no fake-perfect model look, no chroma gradients, no haloing, no dark unreadable jacket, no background scene, no labels embedded in art.
```

Expected value: Diagnoses whether lighting causes outfit drift before the full seven-pose set.

## Recommended Production Order

1. Run Probe A as one individual idle sprite.
2. If Probe A passes source preflight and small-scale readability, run Probe B and Probe C as single-pose stress tests.
3. Adopt Probe A as the default lighting family unless Probe B clearly passes mobile checks without red-muddy skin.
4. Use Probe D only for working/thinking pose variants.
5. Use Probe E only after an individual source path can satisfy the native resolution contract.

## Prompt-Level Blockers

- Any output below native 4K-class source remains blocked for production regardless of lighting success.
- Any non-flat chroma or non-transparent background remains blocked for sprite ingest.
- Dramatic lighting is not allowed to hide identity. If the face cannot be read at 128px tall, reject the probe even if the full-size image is beautiful.
