# Gemini API Generation Runbook

Run: `2026-05-19-mara-voss-character`
Asset: Mara (character)
Adapter: Gemini API
Phase: production-pack
Model: `gemini-3.1-flash-image-preview` (Nano Banana 2)
Resolution: 4K
Aspect ratio: 9:16
Parallel lanes: 1
Max concurrency: 5
Estimated cost: 3.17 USD
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
	npm run art:generate -- cutout-readiness --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/full/gemini-api-plan.json
	npm run art:generate -- run-api --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/full/gemini-api-plan.json
	npm run art:generate -- cutout-auto --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/full/gemini-api-plan.json --slots <slot-id>
	npm run art:generate -- cutout-doctor --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/full/gemini-api-plan.json --strict
	npm run art:generate -- status --bridge .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/full/gemini-api-plan.json
	```

## Slots

## Slot 1: api-lane-01__mara-regular-idle

Lane: api-lane-01
Base slot: mara-regular-idle
Prompt hash: 495ff133bb7cd890
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-regular-idle/mara__regular__idle__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: regular - approved base outfit, closest to the winning concept, with no costume redesign.
Pose/expression state: idle - neutral composed full-body stance, calm face, ready for default app presence.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 2: api-lane-01__mara-regular-greeting

Lane: api-lane-01
Base slot: mara-regular-greeting
Prompt hash: f8491c0f7264484b
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-regular-greeting/mara__regular__greeting__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: regular - approved base outfit, closest to the winning concept, with no costume redesign.
Pose/expression state: greeting - controlled welcoming expression and restrained open gesture, approachable without losing authority.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 3: api-lane-01__mara-regular-listening

Lane: api-lane-01
Base slot: mara-regular-listening
Prompt hash: 90b1e477a68a6ec9
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-regular-listening/mara__regular__listening__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: regular - approved base outfit, closest to the winning concept, with no costume redesign.
Pose/expression state: listening - attentive listening expression, slight forward focus, hands contained and readable.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 4: api-lane-01__mara-regular-thinking

Lane: api-lane-01
Base slot: mara-regular-thinking
Prompt hash: a7072760ff08d332
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-regular-thinking/mara__regular__thinking__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: regular - approved base outfit, closest to the winning concept, with no costume redesign.
Pose/expression state: thinking - strategic reflective expression, subtle hand or chin-adjacent gesture without obscuring the face.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 5: api-lane-01__mara-regular-talking

Lane: api-lane-01
Base slot: mara-regular-talking
Prompt hash: 3996c2d15dfd6216
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-regular-talking/mara__regular__talking__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: regular - approved base outfit, closest to the winning concept, with no costume redesign.
Pose/expression state: talking - mid-explanation expression, one clean conversational gesture, mouth shape suitable for dialogue state.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 6: api-lane-01__mara-regular-alert

Lane: api-lane-01
Base slot: mara-regular-alert
Prompt hash: 786fe888d3c4b680
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-regular-alert/mara__regular__alert__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: regular - approved base outfit, closest to the winning concept, with no costume redesign.
Pose/expression state: alert - decisive high-priority attention, sharper posture, focused eyes, no panic or melodrama.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 7: api-lane-01__mara-regular-working

Lane: api-lane-01
Base slot: mara-regular-working
Prompt hash: 51e325f1b07881cf
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-regular-working/mara__regular__working__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: regular - approved base outfit, closest to the winning concept, with no costume redesign.
Pose/expression state: working - active executive work state with a small held folder, tablet, or brief as a cutout-safe prop.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 8: api-lane-01__mara-summer-light-idle

Lane: api-lane-01
Base slot: mara-summer-light-idle
Prompt hash: c79f10713a0b8486
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-summer-light-idle/mara__summer-light__idle__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: summer-light - lighter warm-weather edit of the approved outfit, fewer layers, same identity and role read.
Pose/expression state: idle - neutral composed full-body stance, calm face, ready for default app presence.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 9: api-lane-01__mara-summer-light-greeting

Lane: api-lane-01
Base slot: mara-summer-light-greeting
Prompt hash: 139aba539a663201
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-summer-light-greeting/mara__summer-light__greeting__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: summer-light - lighter warm-weather edit of the approved outfit, fewer layers, same identity and role read.
Pose/expression state: greeting - controlled welcoming expression and restrained open gesture, approachable without losing authority.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 10: api-lane-01__mara-summer-light-listening

Lane: api-lane-01
Base slot: mara-summer-light-listening
Prompt hash: ebc76360658dbfcd
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-summer-light-listening/mara__summer-light__listening__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: summer-light - lighter warm-weather edit of the approved outfit, fewer layers, same identity and role read.
Pose/expression state: listening - attentive listening expression, slight forward focus, hands contained and readable.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 11: api-lane-01__mara-summer-light-thinking

Lane: api-lane-01
Base slot: mara-summer-light-thinking
Prompt hash: 24a0f6fb203b6cf4
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-summer-light-thinking/mara__summer-light__thinking__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: summer-light - lighter warm-weather edit of the approved outfit, fewer layers, same identity and role read.
Pose/expression state: thinking - strategic reflective expression, subtle hand or chin-adjacent gesture without obscuring the face.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 12: api-lane-01__mara-summer-light-talking

Lane: api-lane-01
Base slot: mara-summer-light-talking
Prompt hash: b7f22f1845fc0d4b
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-summer-light-talking/mara__summer-light__talking__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: summer-light - lighter warm-weather edit of the approved outfit, fewer layers, same identity and role read.
Pose/expression state: talking - mid-explanation expression, one clean conversational gesture, mouth shape suitable for dialogue state.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 13: api-lane-01__mara-summer-light-alert

Lane: api-lane-01
Base slot: mara-summer-light-alert
Prompt hash: d5fafa01ad663316
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-summer-light-alert/mara__summer-light__alert__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: summer-light - lighter warm-weather edit of the approved outfit, fewer layers, same identity and role read.
Pose/expression state: alert - decisive high-priority attention, sharper posture, focused eyes, no panic or melodrama.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 14: api-lane-01__mara-summer-light-working

Lane: api-lane-01
Base slot: mara-summer-light-working
Prompt hash: ade0a9bb51a0d8b6
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-summer-light-working/mara__summer-light__working__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: summer-light - lighter warm-weather edit of the approved outfit, fewer layers, same identity and role read.
Pose/expression state: working - active executive work state with a small held folder, tablet, or brief as a cutout-safe prop.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 15: api-lane-01__mara-winter-layered-idle

Lane: api-lane-01
Base slot: mara-winter-layered-idle
Prompt hash: 408c1fefd6c689c2
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-winter-layered-idle/mara__winter-layered__idle__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: winter-layered - heavier cold-weather edit of the approved outfit, layered but still app-readable.
Pose/expression state: idle - neutral composed full-body stance, calm face, ready for default app presence.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 16: api-lane-01__mara-winter-layered-greeting

Lane: api-lane-01
Base slot: mara-winter-layered-greeting
Prompt hash: fecc99384623b757
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-winter-layered-greeting/mara__winter-layered__greeting__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: winter-layered - heavier cold-weather edit of the approved outfit, layered but still app-readable.
Pose/expression state: greeting - controlled welcoming expression and restrained open gesture, approachable without losing authority.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 17: api-lane-01__mara-winter-layered-listening

Lane: api-lane-01
Base slot: mara-winter-layered-listening
Prompt hash: bb50826c7192ca89
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-winter-layered-listening/mara__winter-layered__listening__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: winter-layered - heavier cold-weather edit of the approved outfit, layered but still app-readable.
Pose/expression state: listening - attentive listening expression, slight forward focus, hands contained and readable.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 18: api-lane-01__mara-winter-layered-thinking

Lane: api-lane-01
Base slot: mara-winter-layered-thinking
Prompt hash: 1e12fa6327ad6766
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-winter-layered-thinking/mara__winter-layered__thinking__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: winter-layered - heavier cold-weather edit of the approved outfit, layered but still app-readable.
Pose/expression state: thinking - strategic reflective expression, subtle hand or chin-adjacent gesture without obscuring the face.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 19: api-lane-01__mara-winter-layered-talking

Lane: api-lane-01
Base slot: mara-winter-layered-talking
Prompt hash: c3a5b75d529443eb
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-winter-layered-talking/mara__winter-layered__talking__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: winter-layered - heavier cold-weather edit of the approved outfit, layered but still app-readable.
Pose/expression state: talking - mid-explanation expression, one clean conversational gesture, mouth shape suitable for dialogue state.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 20: api-lane-01__mara-winter-layered-alert

Lane: api-lane-01
Base slot: mara-winter-layered-alert
Prompt hash: 1dadda2171be05bb
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-winter-layered-alert/mara__winter-layered__alert__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: winter-layered - heavier cold-weather edit of the approved outfit, layered but still app-readable.
Pose/expression state: alert - decisive high-priority attention, sharper posture, focused eyes, no panic or melodrama.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 21: api-lane-01__mara-winter-layered-working

Lane: api-lane-01
Base slot: mara-winter-layered-working
Prompt hash: eaae415999457e95
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-full/api-lane-01/mara-winter-layered-working/mara__winter-layered__working__source-v001__api-lane-01.png`

Prompt:

```text
# Mara Approved Production Pack
Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.
Approved concept slot: api-lane-01__initial-character-concept
Approved concept image: /Users/armaanarora/Documents/The Tower/.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png
Generate the final app-ready full-body character sprite pack for Mara, using the approved concept as the identity reference.
Required character pack matrix: 3 outfit variants x 7 pose/expression states = 21 individual source images.
Outfit variants: regular, summer-light, winter-layered. Pose/expression states: idle, greeting, listening, thinking, talking, alert, working.
This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.
Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.
Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.
Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.
Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.
Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.
## Character Sprite Slot Contract
Character: Mara
Outfit variant: winter-layered - heavier cold-weather edit of the approved outfit, layered but still app-readable.
Pose/expression state: working - active executive work state with a small held folder, tablet, or brief as a cutout-safe prop.
Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.
Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.
Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.
Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

API lane mandate (Canonical Safe): Stay closest to the approved identity and generate the cleanest production-safe version.
Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.
Use no external image search or grounding unless the run plan explicitly enables it.
```
