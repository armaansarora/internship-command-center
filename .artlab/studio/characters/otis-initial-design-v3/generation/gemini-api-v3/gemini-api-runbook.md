# Gemini API Generation Runbook

Run: `otis-initial-design-v3`
Asset: Otis (character)
Adapter: Gemini API
Phase: initial-design
Model: `gemini-3.1-flash-image-preview` (Nano Banana 2)
Resolution: 4K
Aspect ratio: 9:16
Parallel lanes: 5
Max concurrency: 5
Estimated cost: 0.76 USD
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
npm run art:generate -- run-api --plan /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-initial-design-v3/generation/gemini-api-v3/gemini-api-plan.json
npm run art:generate -- status --bridge /Users/armaanarora/Documents/The Tower/.artlab/studio/characters/otis-initial-design-v3/generation/gemini-api-v3/gemini-api-plan.json
```

## Slots

## Slot 1: api-lane-01__otis-design

Lane: api-lane-01
Base slot: otis-design
Prompt hash: 4305ca46ab618d95
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-initial-design-v3/gemini-api-v3/api-lane-01/otis-design/otis__design__source-v001__api-lane-01.png`

Prompt:

```text
Generate exactly one initial character concept image for Tower slot otis-design.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: high-resolution portrait 9:16 character identity concept, suitable for choosing a direction before any production pack exists.
Use a simple solid neutral approval background, not green chroma matte, transparency, checkerboard, a room, a wall, a floor, or a scene.
This is an identity concept board, so prioritize silhouette, face, outfit read, and Tower taste over production alpha extraction.
Style quality: premium web-game dialogue sprite; crisp non-photoreal character render; high-contrast lobby lighting; rich burgundy/brass/deep navy palette; detailed fabric seams/buttons/hair/beard; sharp readable silhouette; polished modern game UI character art.
Reject these looks: no storybook illustration; no children’s book; no watercolor; no muted pastel palette; no beige editorial board; no flat vector simplicity; no low-detail soft linework; no generic cozy illustration.
Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Initial Concept Generation Directive

Run: otis-initial-design-v3
Asset type: character
Budget cap: 10.00 USD

## Brief

Generate five prompt-only initial Otis designs from scratch.

## Generation Contract

- Generate exactly five prompt-only initial concept options by expanding this one base slot across five API lanes.
- Do not attach reference images; this is the identity-discovery phase.
- Keep all outputs in .artlab inbox/staging folders.
- Do not write to public/art and do not update production manifests.
- Final app promotion remains locked behind Armaan saying exactly: approved for app

## Required Outputs

- 5 initial prompt-only concept options before identity approval
- approved identity reference with visual DNA notes
- turnaround sheet: front, 3/4 front, side, 3/4 back, and back
- expression sheet matched to the character bible
- outfit variants preserved as edits of the approved design
- native high-resolution individual sprite sources for idle, greeting, listening, thinking, talking, alert, and working
- pose/contact sheets only as optional review aids unless every split cell passes source preflight
- staged transparent sprites with normal, @2x, and @3x derivatives

## Acceptance Checks

- the approved identity remains recognizable across outfits, poses, and expressions
- natural human imperfections are preserved; no fake-perfect AI model look
- no cropped hands, feet, props, or haloing in staged sprites
- all staged files remain outside public/art until final approval

## Hard Style Notes

- No text, logo, watermark, UI, frame, label, duplicate character, or contact sheet.
## Initial-Concept Style Quality Contract

Use this as a reusable quality contract for character identity concept boards before any production pack exists.

Positive style anchors:
- premium web-game dialogue sprite
- crisp non-photoreal character render
- high-contrast lobby lighting
- rich burgundy/brass/deep navy palette
- detailed fabric seams/buttons/hair/beard
- sharp readable silhouette
- polished modern game UI character art

Negative style anchors:
- no storybook illustration
- no children’s book
- no watercolor
- no muted pastel palette
- no beige editorial board
- no flat vector simplicity
- no low-detail soft linework
- no generic cozy illustration

Humanity rule:
- Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.


## Otis Canon Notes

- Otis Vale is the warm front desk steward of a luxury internship command-center skyscraper.
- Visual DNA: tall soft silhouette, calm vertical posture, burgundy livery or vest-cardigan hybrid, brass keycard ring, guest ledger or bell, warm face, grounded hands near the desk.
- Palette and world fit: burgundy, brass, ivory, and deep navy; distinct from executive agents and not CEO gold.
- Required spread: vary age impression, uniform cut, posture, warmth, and silhouette across the five lanes.
- Forbidden traits: no generic hotel stock-photo smile, no mascot proportions, no bowtie caricature, no magical gatekeeper costume, no superhero styling.
- No readable text on props; ledger pages, books, and labels must be blank or abstract.



API lane mandate (Warm Classic Concierge): Explore a grounded, warmly professional lobby concierge with old-hotel charm, soft human imperfection, and an immediately readable hospitality silhouette.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 2: api-lane-02__otis-design

Lane: api-lane-02
Base slot: otis-design
Prompt hash: 000c3e45aec3dda3
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-initial-design-v3/gemini-api-v3/api-lane-02/otis-design/otis__design__source-v001__api-lane-02.png`

Prompt:

```text
Generate exactly one initial character concept image for Tower slot otis-design.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: high-resolution portrait 9:16 character identity concept, suitable for choosing a direction before any production pack exists.
Use a simple solid neutral approval background, not green chroma matte, transparency, checkerboard, a room, a wall, a floor, or a scene.
This is an identity concept board, so prioritize silhouette, face, outfit read, and Tower taste over production alpha extraction.
Style quality: premium web-game dialogue sprite; crisp non-photoreal character render; high-contrast lobby lighting; rich burgundy/brass/deep navy palette; detailed fabric seams/buttons/hair/beard; sharp readable silhouette; polished modern game UI character art.
Reject these looks: no storybook illustration; no children’s book; no watercolor; no muted pastel palette; no beige editorial board; no flat vector simplicity; no low-detail soft linework; no generic cozy illustration.
Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Initial Concept Generation Directive

Run: otis-initial-design-v3
Asset type: character
Budget cap: 10.00 USD

## Brief

Generate five prompt-only initial Otis designs from scratch.

## Generation Contract

- Generate exactly five prompt-only initial concept options by expanding this one base slot across five API lanes.
- Do not attach reference images; this is the identity-discovery phase.
- Keep all outputs in .artlab inbox/staging folders.
- Do not write to public/art and do not update production manifests.
- Final app promotion remains locked behind Armaan saying exactly: approved for app

## Required Outputs

- 5 initial prompt-only concept options before identity approval
- approved identity reference with visual DNA notes
- turnaround sheet: front, 3/4 front, side, 3/4 back, and back
- expression sheet matched to the character bible
- outfit variants preserved as edits of the approved design
- native high-resolution individual sprite sources for idle, greeting, listening, thinking, talking, alert, and working
- pose/contact sheets only as optional review aids unless every split cell passes source preflight
- staged transparent sprites with normal, @2x, and @3x derivatives

## Acceptance Checks

- the approved identity remains recognizable across outfits, poses, and expressions
- natural human imperfections are preserved; no fake-perfect AI model look
- no cropped hands, feet, props, or haloing in staged sprites
- all staged files remain outside public/art until final approval

## Hard Style Notes

- No text, logo, watermark, UI, frame, label, duplicate character, or contact sheet.
## Initial-Concept Style Quality Contract

Use this as a reusable quality contract for character identity concept boards before any production pack exists.

Positive style anchors:
- premium web-game dialogue sprite
- crisp non-photoreal character render
- high-contrast lobby lighting
- rich burgundy/brass/deep navy palette
- detailed fabric seams/buttons/hair/beard
- sharp readable silhouette
- polished modern game UI character art

Negative style anchors:
- no storybook illustration
- no children’s book
- no watercolor
- no muted pastel palette
- no beige editorial board
- no flat vector simplicity
- no low-detail soft linework
- no generic cozy illustration

Humanity rule:
- Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.


## Otis Canon Notes

- Otis Vale is the warm front desk steward of a luxury internship command-center skyscraper.
- Visual DNA: tall soft silhouette, calm vertical posture, burgundy livery or vest-cardigan hybrid, brass keycard ring, guest ledger or bell, warm face, grounded hands near the desk.
- Palette and world fit: burgundy, brass, ivory, and deep navy; distinct from executive agents and not CEO gold.
- Required spread: vary age impression, uniform cut, posture, warmth, and silhouette across the five lanes.
- Forbidden traits: no generic hotel stock-photo smile, no mascot proportions, no bowtie caricature, no magical gatekeeper costume, no superhero styling.
- No readable text on props; ledger pages, books, and labels must be blank or abstract.



API lane mandate (Retired Showman): Explore a more theatrical former-performer energy: expressive posture, memorable proportions, charming eccentricity, and premium Tower restraint without becoming goofy.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 3: api-lane-03__otis-design

Lane: api-lane-03
Base slot: otis-design
Prompt hash: 79624523c81fc6de
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-initial-design-v3/gemini-api-v3/api-lane-03/otis-design/otis__design__source-v001__api-lane-03.png`

Prompt:

```text
Generate exactly one initial character concept image for Tower slot otis-design.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: high-resolution portrait 9:16 character identity concept, suitable for choosing a direction before any production pack exists.
Use a simple solid neutral approval background, not green chroma matte, transparency, checkerboard, a room, a wall, a floor, or a scene.
This is an identity concept board, so prioritize silhouette, face, outfit read, and Tower taste over production alpha extraction.
Style quality: premium web-game dialogue sprite; crisp non-photoreal character render; high-contrast lobby lighting; rich burgundy/brass/deep navy palette; detailed fabric seams/buttons/hair/beard; sharp readable silhouette; polished modern game UI character art.
Reject these looks: no storybook illustration; no children’s book; no watercolor; no muted pastel palette; no beige editorial board; no flat vector simplicity; no low-detail soft linework; no generic cozy illustration.
Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Initial Concept Generation Directive

Run: otis-initial-design-v3
Asset type: character
Budget cap: 10.00 USD

## Brief

Generate five prompt-only initial Otis designs from scratch.

## Generation Contract

- Generate exactly five prompt-only initial concept options by expanding this one base slot across five API lanes.
- Do not attach reference images; this is the identity-discovery phase.
- Keep all outputs in .artlab inbox/staging folders.
- Do not write to public/art and do not update production manifests.
- Final app promotion remains locked behind Armaan saying exactly: approved for app

## Required Outputs

- 5 initial prompt-only concept options before identity approval
- approved identity reference with visual DNA notes
- turnaround sheet: front, 3/4 front, side, 3/4 back, and back
- expression sheet matched to the character bible
- outfit variants preserved as edits of the approved design
- native high-resolution individual sprite sources for idle, greeting, listening, thinking, talking, alert, and working
- pose/contact sheets only as optional review aids unless every split cell passes source preflight
- staged transparent sprites with normal, @2x, and @3x derivatives

## Acceptance Checks

- the approved identity remains recognizable across outfits, poses, and expressions
- natural human imperfections are preserved; no fake-perfect AI model look
- no cropped hands, feet, props, or haloing in staged sprites
- all staged files remain outside public/art until final approval

## Hard Style Notes

- No text, logo, watermark, UI, frame, label, duplicate character, or contact sheet.
## Initial-Concept Style Quality Contract

Use this as a reusable quality contract for character identity concept boards before any production pack exists.

Positive style anchors:
- premium web-game dialogue sprite
- crisp non-photoreal character render
- high-contrast lobby lighting
- rich burgundy/brass/deep navy palette
- detailed fabric seams/buttons/hair/beard
- sharp readable silhouette
- polished modern game UI character art

Negative style anchors:
- no storybook illustration
- no children’s book
- no watercolor
- no muted pastel palette
- no beige editorial board
- no flat vector simplicity
- no low-detail soft linework
- no generic cozy illustration

Humanity rule:
- Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.


## Otis Canon Notes

- Otis Vale is the warm front desk steward of a luxury internship command-center skyscraper.
- Visual DNA: tall soft silhouette, calm vertical posture, burgundy livery or vest-cardigan hybrid, brass keycard ring, guest ledger or bell, warm face, grounded hands near the desk.
- Palette and world fit: burgundy, brass, ivory, and deep navy; distinct from executive agents and not CEO gold.
- Required spread: vary age impression, uniform cut, posture, warmth, and silhouette across the five lanes.
- Forbidden traits: no generic hotel stock-photo smile, no mascot proportions, no bowtie caricature, no magical gatekeeper costume, no superhero styling.
- No readable text on props; ledger pages, books, and labels must be blank or abstract.



API lane mandate (Neighborhood Elder): Explore a softer community-anchor Otis: rounder body, lived-in face, gentle patience, familiar front-desk warmth, and natural non-model humanity.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 4: api-lane-04__otis-design

Lane: api-lane-04
Base slot: otis-design
Prompt hash: 6b70444f9e6ab53d
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-initial-design-v3/gemini-api-v3/api-lane-04/otis-design/otis__design__source-v001__api-lane-04.png`

Prompt:

```text
Generate exactly one initial character concept image for Tower slot otis-design.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: high-resolution portrait 9:16 character identity concept, suitable for choosing a direction before any production pack exists.
Use a simple solid neutral approval background, not green chroma matte, transparency, checkerboard, a room, a wall, a floor, or a scene.
This is an identity concept board, so prioritize silhouette, face, outfit read, and Tower taste over production alpha extraction.
Style quality: premium web-game dialogue sprite; crisp non-photoreal character render; high-contrast lobby lighting; rich burgundy/brass/deep navy palette; detailed fabric seams/buttons/hair/beard; sharp readable silhouette; polished modern game UI character art.
Reject these looks: no storybook illustration; no children’s book; no watercolor; no muted pastel palette; no beige editorial board; no flat vector simplicity; no low-detail soft linework; no generic cozy illustration.
Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Initial Concept Generation Directive

Run: otis-initial-design-v3
Asset type: character
Budget cap: 10.00 USD

## Brief

Generate five prompt-only initial Otis designs from scratch.

## Generation Contract

- Generate exactly five prompt-only initial concept options by expanding this one base slot across five API lanes.
- Do not attach reference images; this is the identity-discovery phase.
- Keep all outputs in .artlab inbox/staging folders.
- Do not write to public/art and do not update production manifests.
- Final app promotion remains locked behind Armaan saying exactly: approved for app

## Required Outputs

- 5 initial prompt-only concept options before identity approval
- approved identity reference with visual DNA notes
- turnaround sheet: front, 3/4 front, side, 3/4 back, and back
- expression sheet matched to the character bible
- outfit variants preserved as edits of the approved design
- native high-resolution individual sprite sources for idle, greeting, listening, thinking, talking, alert, and working
- pose/contact sheets only as optional review aids unless every split cell passes source preflight
- staged transparent sprites with normal, @2x, and @3x derivatives

## Acceptance Checks

- the approved identity remains recognizable across outfits, poses, and expressions
- natural human imperfections are preserved; no fake-perfect AI model look
- no cropped hands, feet, props, or haloing in staged sprites
- all staged files remain outside public/art until final approval

## Hard Style Notes

- No text, logo, watermark, UI, frame, label, duplicate character, or contact sheet.
## Initial-Concept Style Quality Contract

Use this as a reusable quality contract for character identity concept boards before any production pack exists.

Positive style anchors:
- premium web-game dialogue sprite
- crisp non-photoreal character render
- high-contrast lobby lighting
- rich burgundy/brass/deep navy palette
- detailed fabric seams/buttons/hair/beard
- sharp readable silhouette
- polished modern game UI character art

Negative style anchors:
- no storybook illustration
- no children’s book
- no watercolor
- no muted pastel palette
- no beige editorial board
- no flat vector simplicity
- no low-detail soft linework
- no generic cozy illustration

Humanity rule:
- Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.


## Otis Canon Notes

- Otis Vale is the warm front desk steward of a luxury internship command-center skyscraper.
- Visual DNA: tall soft silhouette, calm vertical posture, burgundy livery or vest-cardigan hybrid, brass keycard ring, guest ledger or bell, warm face, grounded hands near the desk.
- Palette and world fit: burgundy, brass, ivory, and deep navy; distinct from executive agents and not CEO gold.
- Required spread: vary age impression, uniform cut, posture, warmth, and silhouette across the five lanes.
- Forbidden traits: no generic hotel stock-photo smile, no mascot proportions, no bowtie caricature, no magical gatekeeper costume, no superhero styling.
- No readable text on props; ledger pages, books, and labels must be blank or abstract.



API lane mandate (Elegant Old Guard): Explore a sharper old-world professional Otis: polished tailoring, brass details, dignified stance, silver hair, and quiet authority softened by kindness.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 5: api-lane-05__otis-design

Lane: api-lane-05
Base slot: otis-design
Prompt hash: af1f2274306b6af2
Expected file: `/Users/armaanarora/Documents/The Tower/.artlab/inbox/character/otis-initial-design-v3/gemini-api-v3/api-lane-05/otis-design/otis__design__source-v001__api-lane-05.png`

Prompt:

```text
Generate exactly one initial character concept image for Tower slot otis-design.
Use Nano Banana 2 only. Create one image only, not a contact sheet.
Target output: high-resolution portrait 9:16 character identity concept, suitable for choosing a direction before any production pack exists.
Use a simple solid neutral approval background, not green chroma matte, transparency, checkerboard, a room, a wall, a floor, or a scene.
This is an identity concept board, so prioritize silhouette, face, outfit read, and Tower taste over production alpha extraction.
Style quality: premium web-game dialogue sprite; crisp non-photoreal character render; high-contrast lobby lighting; rich burgundy/brass/deep navy palette; detailed fabric seams/buttons/hair/beard; sharp readable silhouette; polished modern game UI character art.
Reject these looks: no storybook illustration; no children’s book; no watercolor; no muted pastel palette; no beige editorial board; no flat vector simplicity; no low-detail soft linework; no generic cozy illustration.
Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.
No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.
Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.
Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.
# Otis Initial Concept Generation Directive

Run: otis-initial-design-v3
Asset type: character
Budget cap: 10.00 USD

## Brief

Generate five prompt-only initial Otis designs from scratch.

## Generation Contract

- Generate exactly five prompt-only initial concept options by expanding this one base slot across five API lanes.
- Do not attach reference images; this is the identity-discovery phase.
- Keep all outputs in .artlab inbox/staging folders.
- Do not write to public/art and do not update production manifests.
- Final app promotion remains locked behind Armaan saying exactly: approved for app

## Required Outputs

- 5 initial prompt-only concept options before identity approval
- approved identity reference with visual DNA notes
- turnaround sheet: front, 3/4 front, side, 3/4 back, and back
- expression sheet matched to the character bible
- outfit variants preserved as edits of the approved design
- native high-resolution individual sprite sources for idle, greeting, listening, thinking, talking, alert, and working
- pose/contact sheets only as optional review aids unless every split cell passes source preflight
- staged transparent sprites with normal, @2x, and @3x derivatives

## Acceptance Checks

- the approved identity remains recognizable across outfits, poses, and expressions
- natural human imperfections are preserved; no fake-perfect AI model look
- no cropped hands, feet, props, or haloing in staged sprites
- all staged files remain outside public/art until final approval

## Hard Style Notes

- No text, logo, watermark, UI, frame, label, duplicate character, or contact sheet.
## Initial-Concept Style Quality Contract

Use this as a reusable quality contract for character identity concept boards before any production pack exists.

Positive style anchors:
- premium web-game dialogue sprite
- crisp non-photoreal character render
- high-contrast lobby lighting
- rich burgundy/brass/deep navy palette
- detailed fabric seams/buttons/hair/beard
- sharp readable silhouette
- polished modern game UI character art

Negative style anchors:
- no storybook illustration
- no children’s book
- no watercolor
- no muted pastel palette
- no beige editorial board
- no flat vector simplicity
- no low-detail soft linework
- no generic cozy illustration

Humanity rule:
- Keep natural human imperfections and lived-in specificity; avoid fake-perfect AI model people, plastic skin, superhero jawlines, and generic fashion-model polish.


## Otis Canon Notes

- Otis Vale is the warm front desk steward of a luxury internship command-center skyscraper.
- Visual DNA: tall soft silhouette, calm vertical posture, burgundy livery or vest-cardigan hybrid, brass keycard ring, guest ledger or bell, warm face, grounded hands near the desk.
- Palette and world fit: burgundy, brass, ivory, and deep navy; distinct from executive agents and not CEO gold.
- Required spread: vary age impression, uniform cut, posture, warmth, and silhouette across the five lanes.
- Forbidden traits: no generic hotel stock-photo smile, no mascot proportions, no bowtie caricature, no magical gatekeeper costume, no superhero styling.
- No readable text on props; ledger pages, books, and labels must be blank or abstract.



API lane mandate (Cozy Oddball Mentor): Explore a lovable offbeat mentor Otis: unusual but human silhouette, memorable glasses or small motif, gentle humor, and sprite-ready charm.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```
