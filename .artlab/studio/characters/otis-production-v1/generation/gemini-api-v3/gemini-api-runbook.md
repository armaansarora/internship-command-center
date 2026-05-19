# Gemini API Generation Runbook

Run: `otis-production-v1`
Asset: Otis (character)
Adapter: Gemini API
Phase: production-pack
Model: `gemini-3.1-flash-image-preview` (Nano Banana 2)
Resolution: 4K
Aspect ratio: 9:16
Parallel lanes: 1
Max concurrency: 5
Estimated cost: 3.62 USD
Budget cap: 10.00 USD

## Hard Rules

- API key is read only from `GEMINI_API_KEY` or `GOOGLE_API_KEY` or macOS Keychain service `tower-gemini-api-key`.
- Never write API keys into this repo, command flags, run JSON, prompt decks, receipts, or screenshots.
- This plan disables Google Search grounding by default to avoid surprise search charges and external-source attribution obligations.
- Initial design plans are exactly five prompt-only concepts: one base slot x five concurrent lanes, with no reference images.
- Production packs must be generated after design approval with `--phase production-pack`.
- Gemini sources should use a solid `#00ff00` chroma matte for local alpha extraction; fake checkerboard transparency is rejected.
- Every output lands in the labeled inbox first. Nothing goes to `public/art` until QA passes and Armaan says exactly `approved for app`.
- If any output is below the source contract, regenerate that slot only. Do not expand waste.

## Commands

```bash
npm run art:generate -- run-api --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-production-v1/generation/gemini-api-v3/gemini-api-plan.json
npm run art:generate -- status --bridge /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-production-v1/generation/gemini-api-v3/gemini-api-plan.json
```

## Slots

## Slot 1: api-lane-01__otis-turnaround

Lane: api-lane-01
Base slot: otis-turnaround
Prompt hash: f8210d982a16cd11
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-turnaround/otis__turnaround__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production packet sheet image for Tower slot otis-turnaround.
Use Nano Banana 2 only. Create one image file only; this sheet may contain the multiple approved Otis views required by the slot.
Target output: 4K production packet sheet, portrait 9:16 framing, with consistent scale and generous safe padding.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, or labels. Multiple Otis figures are allowed only as required by this sheet; keep identity consistent across every view.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 2: api-lane-01__otis-expression-sheet

Lane: api-lane-01
Base slot: otis-expression-sheet
Prompt hash: a1b1fad17757534a
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-expression-sheet/otis__expression-sheet__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production packet sheet image for Tower slot otis-expression-sheet.
Use Nano Banana 2 only. Create one image file only; this sheet may contain the multiple approved Otis views required by the slot.
Target output: 4K production packet sheet, portrait 9:16 framing, with consistent scale and generous safe padding.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, or labels. Multiple Otis figures are allowed only as required by this sheet; keep identity consistent across every view.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 3: api-lane-01__otis-outfit-variants

Lane: api-lane-01
Base slot: otis-outfit-variants
Prompt hash: 65f8c95232f0bcd0
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-outfit-variants/otis__outfit-variants__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production packet sheet image for Tower slot otis-outfit-variants.
Use Nano Banana 2 only. Create one image file only; this sheet may contain the multiple approved Otis views required by the slot.
Target output: 4K production packet sheet, portrait 9:16 framing, with consistent scale and generous safe padding.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, or labels. Multiple Otis figures are allowed only as required by this sheet; keep identity consistent across every view.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 4: api-lane-01__otis-regular-idle

Lane: api-lane-01
Base slot: otis-regular-idle
Prompt hash: ed85d722d54958db
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-regular-idle/otis__regular__idle__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-regular-idle.
Outfit: regular.
Pose: idle.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 5: api-lane-01__otis-regular-greeting

Lane: api-lane-01
Base slot: otis-regular-greeting
Prompt hash: fc5d8746e99c3fa6
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-regular-greeting/otis__regular__greeting__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-regular-greeting.
Outfit: regular.
Pose: greeting.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 6: api-lane-01__otis-regular-listening

Lane: api-lane-01
Base slot: otis-regular-listening
Prompt hash: 8363377950dac82b
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-regular-listening/otis__regular__listening__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-regular-listening.
Outfit: regular.
Pose: listening.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 7: api-lane-01__otis-regular-thinking

Lane: api-lane-01
Base slot: otis-regular-thinking
Prompt hash: 6dc76e848bf84bdf
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-regular-thinking/otis__regular__thinking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-regular-thinking.
Outfit: regular.
Pose: thinking.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 8: api-lane-01__otis-regular-talking

Lane: api-lane-01
Base slot: otis-regular-talking
Prompt hash: 4d24cfc60a4f8778
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-regular-talking/otis__regular__talking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-regular-talking.
Outfit: regular.
Pose: talking.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 9: api-lane-01__otis-regular-alert

Lane: api-lane-01
Base slot: otis-regular-alert
Prompt hash: 6aefb4eb8802b96d
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-regular-alert/otis__regular__alert__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-regular-alert.
Outfit: regular.
Pose: alert.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 10: api-lane-01__otis-regular-working

Lane: api-lane-01
Base slot: otis-regular-working
Prompt hash: f065e7970bdedd3c
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-regular-working/otis__regular__working__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-regular-working.
Outfit: regular.
Pose: working.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 11: api-lane-01__otis-summer-light-idle

Lane: api-lane-01
Base slot: otis-summer-light-idle
Prompt hash: d818d86541aa15c0
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-summer-light-idle/otis__summer-light__idle__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-summer-light-idle.
Outfit: summer-light.
Pose: idle.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 12: api-lane-01__otis-summer-light-greeting

Lane: api-lane-01
Base slot: otis-summer-light-greeting
Prompt hash: 6973383cca655898
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-summer-light-greeting/otis__summer-light__greeting__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-summer-light-greeting.
Outfit: summer-light.
Pose: greeting.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 13: api-lane-01__otis-summer-light-listening

Lane: api-lane-01
Base slot: otis-summer-light-listening
Prompt hash: 746b0ae1af4e6831
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-summer-light-listening/otis__summer-light__listening__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-summer-light-listening.
Outfit: summer-light.
Pose: listening.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 14: api-lane-01__otis-summer-light-thinking

Lane: api-lane-01
Base slot: otis-summer-light-thinking
Prompt hash: 69eb23c578dae862
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-summer-light-thinking/otis__summer-light__thinking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-summer-light-thinking.
Outfit: summer-light.
Pose: thinking.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 15: api-lane-01__otis-summer-light-talking

Lane: api-lane-01
Base slot: otis-summer-light-talking
Prompt hash: 1663051639e069b4
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-summer-light-talking/otis__summer-light__talking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-summer-light-talking.
Outfit: summer-light.
Pose: talking.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 16: api-lane-01__otis-summer-light-alert

Lane: api-lane-01
Base slot: otis-summer-light-alert
Prompt hash: fdb313bc10d7c793
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-summer-light-alert/otis__summer-light__alert__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-summer-light-alert.
Outfit: summer-light.
Pose: alert.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 17: api-lane-01__otis-summer-light-working

Lane: api-lane-01
Base slot: otis-summer-light-working
Prompt hash: 493e9e8070a452f9
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-summer-light-working/otis__summer-light__working__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-summer-light-working.
Outfit: summer-light.
Pose: working.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 18: api-lane-01__otis-winter-layered-idle

Lane: api-lane-01
Base slot: otis-winter-layered-idle
Prompt hash: f143eda7f9ed4741
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-winter-layered-idle/otis__winter-layered__idle__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-winter-layered-idle.
Outfit: winter-layered.
Pose: idle.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 19: api-lane-01__otis-winter-layered-greeting

Lane: api-lane-01
Base slot: otis-winter-layered-greeting
Prompt hash: c7c259285cbe16c7
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-winter-layered-greeting/otis__winter-layered__greeting__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-winter-layered-greeting.
Outfit: winter-layered.
Pose: greeting.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 20: api-lane-01__otis-winter-layered-listening

Lane: api-lane-01
Base slot: otis-winter-layered-listening
Prompt hash: ef6c614e78730a68
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-winter-layered-listening/otis__winter-layered__listening__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-winter-layered-listening.
Outfit: winter-layered.
Pose: listening.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 21: api-lane-01__otis-winter-layered-thinking

Lane: api-lane-01
Base slot: otis-winter-layered-thinking
Prompt hash: ec9f63a1d290b7ac
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-winter-layered-thinking/otis__winter-layered__thinking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-winter-layered-thinking.
Outfit: winter-layered.
Pose: thinking.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 22: api-lane-01__otis-winter-layered-talking

Lane: api-lane-01
Base slot: otis-winter-layered-talking
Prompt hash: 9ff304481f179ccf
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-winter-layered-talking/otis__winter-layered__talking__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-winter-layered-talking.
Outfit: winter-layered.
Pose: talking.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 23: api-lane-01__otis-winter-layered-alert

Lane: api-lane-01
Base slot: otis-winter-layered-alert
Prompt hash: df7860761da83e28
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-winter-layered-alert/otis__winter-layered__alert__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-winter-layered-alert.
Outfit: winter-layered.
Pose: alert.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 24: api-lane-01__otis-winter-layered-working

Lane: api-lane-01
Base slot: otis-winter-layered-working
Prompt hash: f48c12dbf1307497
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-production-v1/gemini-api-v3/api-lane-01/otis-winter-layered-working/otis__winter-layered__working__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one production source image for Tower slot otis-winter-layered-working.
Outfit: winter-layered.
Pose: working.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.
Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.
Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.
Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.
Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.
Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Production Pack Directive

Run phase: production-pack only. This is not initial design and not a new identity exploration.

Locked identity reference: `.artlab/characters/otis/model/otis_winner-ref_v001.png`, selected from Otis v4 Lane 05. Use no old references and do not redesign him.

## Identity Lock

Otis is the Tower lobby concierge and warm oddball mentor: older, kind, observant, slightly eccentric, and unmistakably human. Preserve his rounded lived-in face, warm eyes behind glasses, silver-brown hair, full beard, softened posture, and charming non-model imperfections. He should feel premium and memorable without becoming glamorous, heroic, plastic, or generic.

## Visual Standard

Every output must hit premium web-game dialogue sprite quality: crisp non-photoreal character rendering, sharp readable silhouette, high contrast, dimensional lobby-style lighting, rich material detail, and a confident Tower palette. Use burgundy, brass, deep navy, ivory, and restrained warm accents. Render detailed fabric seams, buttons, lapels, cuffs, glasses, hair, beard, brass highlights, and small concierge props with polished modern game UI character art quality.

Reject muted storybook illustration, children book rendering, watercolor, pastel beige editorial board styling, flat vector simplicity, low-detail soft linework, generic cozy illustration, low contrast, blurred features, and fake-perfect AI model people.

## Production Cleanroom

All generated assets must stay inside `.artlab`. Do not write public/art. Do not update the production manifest. Do not promote.

Use a perfectly flat solid `#00ff00` chroma matte source for local alpha extraction. Matte compliance is a hard technical requirement: every outer border pixel should be an unlit RGB(0,255,0) / `#00ff00` chroma fill. No checkerboard, transparency pattern, room, wall, floor, green-screen gradient, vignette, cast shadow on the background, contact shadow, halo, glow, haze, ambient spill, or scene. No green clothing, green props, green rim light, or green reflection. Keep character edges clean and fully separated from the matte.

No readable text, logo, watermark, UI frame, labels, crop marks, or extra unrelated characters. Keep hands, feet, hair, beard, coat hems, props, and shadows uncropped with generous safe padding.

## Required Production Packet Sheets

Turnaround sheet: same locked Otis identity across front, 3/4, side, and back views. Consistent proportions, glasses, beard, hair, burgundy concierge vest/jacket, ivory shirt, deep navy trousers/tie, brass details, and readable full-body silhouette. Multiple Otis views are allowed only for this sheet.

Expression sheet: same locked Otis identity across warm greeting, attentive listening, thoughtful pause, talking, alert concern, working focus, and gentle idle. Preserve face structure, glasses, beard, hair, age, and human imperfections across every expression. Multiple Otis heads/upper bodies are allowed only for this sheet.

Outfit variants sheet: same locked Otis identity across regular, summer-light, and winter-layered outfits. Variants may change clothing weight and accessories, not face, age, proportions, beard, hair, glasses, palette discipline, or quality. Multiple Otis figures are allowed only for this sheet.

## Sprite Set

Generate exactly 21 individual production sprites: regular, summer-light, and winter-layered outfits, each with idle, greeting, listening, thinking, talking, alert, and working poses.

Each sprite is a single full-body Otis on safe `#00ff00` matte, centered in portrait 9:16 framing, app-ready after alpha extraction. Pose variation should express function while preserving identity:

- idle: relaxed concierge stance, calm and available.
- greeting: welcoming hand gesture, warm but not theatrical.
- listening: attentive lean or hand near vest, focused on the user.
- thinking: thoughtful pause, one hand near beard or glasses, gentle concentration.
- talking: conversational gesture, mouth readable but natural.
- alert: concerned but composed, ready to help.
- working: handling a small concierge ledger, key, bell token, or tablet-like prop without readable text.

Regular outfit: burgundy concierge vest or tailored jacket, ivory shirt, deep navy tie/trousers, brass buttons and small bell/key motif.

Summer-light outfit: lighter breathable version with rolled or lighter sleeves, still burgundy/brass/deep navy and recognizably Otis. Do not become casual beachwear.

Winter-layered outfit: richer layered concierge coat/scarf/cardigan detail, deeper burgundy/navy, brass accents, still readable as the same lobby concierge.


API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```
