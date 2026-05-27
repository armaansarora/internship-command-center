# Gemini API Generation Runbook

Run: `2026-05-19-mara-voss-character`
Asset: Mara (character)
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
	- Gemini sources must use the `premium-simple-backdrop-v1` contract so the local fail-closed cutout compiler can separate the foreground cleanly.
	- Cutout order is provider source, local cutout, `edge-refinement-v1`, alpha QA, then master/upscale/derive.
	- Production mode is offline by default for cutout models. Missing cached model evidence blocks the slot instead of downloading silently.
	- Every output lands in the labeled inbox first. Nothing goes to `public/art` until QA passes and Armaan says exactly `approved for app`.
	- If any output is below the source contract, regenerate that slot only. Do not expand waste.

## Commands

	```bash
	npm run art:generate -- cutout-readiness --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/gemini-api-plan.json
	npm run art:generate -- run-api --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/gemini-api-plan.json
	npm run art:generate -- cutout-auto --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/gemini-api-plan.json --slots <slot-id>
	npm run art:generate -- cutout-doctor --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/gemini-api-plan.json --strict
	npm run art:generate -- status --bridge .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3/gemini-api-plan.json
	```

## Slots

## Slot 1: api-lane-01__initial-character-concept

Lane: api-lane-01
Base slot: initial-character-concept
Prompt hash: d6c5ec8c646c7c20
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Character role: CEO of The Tower's C-Suite floor.
Style: tower-flat-plus-depth-v1, premium web-game dialogue sprite, adult professional energy, Professional Scars tone.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Avoid fake-perfect AI model polish, generic fashion editorial posing, superhero styling, text, labels, UI, logos, and watermarks.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full subject and all expected props fully inside frame; leave visible breathing room around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

Shared initial-concept lane quality floor: Every initial concept lane must hit the same minimum quality/detail floor: Lane 05-level material detail, fabric seams, buttons, hair/beard rendering, brass highlights, confident contrast, dimensional lighting, and high-resolution premium game-sprite finish.
Initial-concept lane variation rule: Lane variation is only for identity direction: silhouette, age impression, posture, personality, uniform cut, props, warmth, and eccentricity. Lane variation must not change rendering quality, amount of detail, sharpness, contrast, or polish.
Unique identity mandate (Warm Classic Concierge): Explore a grounded, warmly professional lobby concierge with old-hotel charm, soft human imperfection, and an immediately readable hospitality silhouette.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 2: api-lane-02__initial-character-concept

Lane: api-lane-02
Base slot: initial-character-concept
Prompt hash: c736553505cb6c4a
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3/api-lane-02/initial-character-concept/mara-initial-concept__api-lane-02.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Character role: CEO of The Tower's C-Suite floor.
Style: tower-flat-plus-depth-v1, premium web-game dialogue sprite, adult professional energy, Professional Scars tone.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Avoid fake-perfect AI model polish, generic fashion editorial posing, superhero styling, text, labels, UI, logos, and watermarks.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full subject and all expected props fully inside frame; leave visible breathing room around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

Shared initial-concept lane quality floor: Every initial concept lane must hit the same minimum quality/detail floor: Lane 05-level material detail, fabric seams, buttons, hair/beard rendering, brass highlights, confident contrast, dimensional lighting, and high-resolution premium game-sprite finish.
Initial-concept lane variation rule: Lane variation is only for identity direction: silhouette, age impression, posture, personality, uniform cut, props, warmth, and eccentricity. Lane variation must not change rendering quality, amount of detail, sharpness, contrast, or polish.
Unique identity mandate (Retired Showman): Explore a more theatrical former-performer energy: expressive posture, memorable proportions, charming eccentricity, and premium Tower restraint without becoming goofy.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 3: api-lane-03__initial-character-concept

Lane: api-lane-03
Base slot: initial-character-concept
Prompt hash: 9726dcee602ab93d
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3/api-lane-03/initial-character-concept/mara-initial-concept__api-lane-03.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Character role: CEO of The Tower's C-Suite floor.
Style: tower-flat-plus-depth-v1, premium web-game dialogue sprite, adult professional energy, Professional Scars tone.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Avoid fake-perfect AI model polish, generic fashion editorial posing, superhero styling, text, labels, UI, logos, and watermarks.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full subject and all expected props fully inside frame; leave visible breathing room around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

Shared initial-concept lane quality floor: Every initial concept lane must hit the same minimum quality/detail floor: Lane 05-level material detail, fabric seams, buttons, hair/beard rendering, brass highlights, confident contrast, dimensional lighting, and high-resolution premium game-sprite finish.
Initial-concept lane variation rule: Lane variation is only for identity direction: silhouette, age impression, posture, personality, uniform cut, props, warmth, and eccentricity. Lane variation must not change rendering quality, amount of detail, sharpness, contrast, or polish.
Unique identity mandate (Neighborhood Elder): Explore a softer community-anchor Otis: rounder body, lived-in face, gentle patience, familiar front-desk warmth, and natural non-model humanity.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 4: api-lane-04__initial-character-concept

Lane: api-lane-04
Base slot: initial-character-concept
Prompt hash: d84305a97285f0eb
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3/api-lane-04/initial-character-concept/mara-initial-concept__api-lane-04.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Character role: CEO of The Tower's C-Suite floor.
Style: tower-flat-plus-depth-v1, premium web-game dialogue sprite, adult professional energy, Professional Scars tone.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Avoid fake-perfect AI model polish, generic fashion editorial posing, superhero styling, text, labels, UI, logos, and watermarks.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full subject and all expected props fully inside frame; leave visible breathing room around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

Shared initial-concept lane quality floor: Every initial concept lane must hit the same minimum quality/detail floor: Lane 05-level material detail, fabric seams, buttons, hair/beard rendering, brass highlights, confident contrast, dimensional lighting, and high-resolution premium game-sprite finish.
Initial-concept lane variation rule: Lane variation is only for identity direction: silhouette, age impression, posture, personality, uniform cut, props, warmth, and eccentricity. Lane variation must not change rendering quality, amount of detail, sharpness, contrast, or polish.
Unique identity mandate (Elegant Old Guard): Explore a sharper old-world professional Otis: polished tailoring, brass details, dignified stance, silver hair, and quiet authority softened by kindness.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 5: api-lane-05__initial-character-concept

Lane: api-lane-05
Base slot: initial-character-concept
Prompt hash: 55bb3b57a3aae431
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3/api-lane-05/initial-character-concept/mara-initial-concept__api-lane-05.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Character role: CEO of The Tower's C-Suite floor.
Style: tower-flat-plus-depth-v1, premium web-game dialogue sprite, adult professional energy, Professional Scars tone.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Avoid fake-perfect AI model polish, generic fashion editorial posing, superhero styling, text, labels, UI, logos, and watermarks.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full subject and all expected props fully inside frame; leave visible breathing room around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

Shared initial-concept lane quality floor: Every initial concept lane must hit the same minimum quality/detail floor: Lane 05-level material detail, fabric seams, buttons, hair/beard rendering, brass highlights, confident contrast, dimensional lighting, and high-resolution premium game-sprite finish.
Initial-concept lane variation rule: Lane variation is only for identity direction: silhouette, age impression, posture, personality, uniform cut, props, warmth, and eccentricity. Lane variation must not change rendering quality, amount of detail, sharpness, contrast, or polish.
Unique identity mandate (Cozy Oddball Mentor): Explore a lovable offbeat mentor Otis: unusual but human silhouette, memorable glasses or small motif, gentle humor, and sprite-ready charm.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```
