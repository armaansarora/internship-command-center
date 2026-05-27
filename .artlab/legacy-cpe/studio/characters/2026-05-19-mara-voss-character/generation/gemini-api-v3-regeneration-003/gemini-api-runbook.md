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
	npm run art:generate -- cutout-readiness --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-003/gemini-api-plan.json
	npm run art:generate -- run-api --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-003/gemini-api-plan.json
	npm run art:generate -- cutout-auto --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-003/gemini-api-plan.json --slots <slot-id>
	npm run art:generate -- cutout-doctor --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-003/gemini-api-plan.json --strict
	npm run art:generate -- status --bridge .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-003/gemini-api-plan.json
	```

## Slots

## Slot 1: api-lane-01__initial-character-concept

Lane: api-lane-01
Base slot: initial-character-concept
Prompt hash: ac7d0a0ce11469e4
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Asset contract: Tower character concept. Match the approved Otis/Tower character visual language: premium stylized high-detail app/game character art.
Use the shared style envelope from the generation plan for style, quality, camera/framing, lighting, and Tower-world fit.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Design variation belongs only in silhouette, age read, hair, face, wardrobe, palette, posture, accessories, personality, and Tower role archetype.
Avoid generic fashion editorial posing, superhero styling, text, labels, logos, watermarks, and copied likenesses.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

## Shared Tower Character Style Envelope
Style target: premium stylized high-detail app/game character art in the Otis-compatible Tower character style.
Rendering language: crisp painterly raster forms, controlled dimensional depth, detailed fabric construction, expressive face detail, polished hair rendering, and clean material edges.
Camera/framing: full-body 9:16 character concept, straight-on three-quarter app sprite view, generous breathing room, no cropped hair, hands, feet, or held tools.
Lighting: controlled Tower lobby lighting with confident contrast, soft brass highlights, and clear foreground/background separation.
Tower-world fit: adult professional energy, Professional Scars tone, luxury internship command-center taste, grounded specificity, no generic office stock-asset gloss.
Shared quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
The style envelope is identical for every lane. Only the lane design card may vary.
## End Shared Tower Character Style Envelope

Design variation matrix:
Allowed variation axes: silhouette; age read; hair shape/length/texture; facial structure; wardrobe category; color palette; posture/body language; accessories/tools; personality read; Tower role archetype.
Locked across lanes: rendering style, finish quality, camera/framing, lighting, backdrop discipline, source model, and Tower-world fit.
Do not collapse all lanes into the same suit, same short hair, same corporate leader silhouette, or same role archetype.

Shared initial-concept lane quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
Initial-concept lane variation rule: Variation is allowed only inside these character-design axes: silhouette, age read, hair shape/length/texture, facial structure, wardrobe category, color palette, posture/body language, accessories/tools, personality read, Tower role archetype. Do not vary rendering style, quality, camera/framing, lighting, source model, or Tower-world fit.

Lane design card:
- label: Knife-Edge Chairwoman
- silhouette: tall narrow angular column with razor-straight shoulders
- age read: early 50s
- hair shape/length/texture: long silver-black blunt bob tucked behind one ear
- facial structure: high cheekbones, long nose, watchful eyes, precise mouth
- wardrobe category: asymmetric architectural coat over structured tunic and wide trousers
- color palette: ink black, oxblood, antique brass
- posture/body language: still upright command, one hand clasping the other
- accessories/tools: thin brass keycard stack and dark glass tablet
- personality read: controlled, intimidating, exacting
- Tower role archetype: C-Suite founder-operator

Unique character design mandate (Knife-Edge Chairwoman): C-Suite founder-operator: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 2: api-lane-02__initial-character-concept

Lane: api-lane-02
Base slot: initial-character-concept
Prompt hash: 835c3f5479cae42a
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-02/initial-character-concept/mara-initial-concept__api-lane-02.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Asset contract: Tower character concept. Match the approved Otis/Tower character visual language: premium stylized high-detail app/game character art.
Use the shared style envelope from the generation plan for style, quality, camera/framing, lighting, and Tower-world fit.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Design variation belongs only in silhouette, age read, hair, face, wardrobe, palette, posture, accessories, personality, and Tower role archetype.
Avoid generic fashion editorial posing, superhero styling, text, labels, logos, watermarks, and copied likenesses.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

## Shared Tower Character Style Envelope
Style target: premium stylized high-detail app/game character art in the Otis-compatible Tower character style.
Rendering language: crisp painterly raster forms, controlled dimensional depth, detailed fabric construction, expressive face detail, polished hair rendering, and clean material edges.
Camera/framing: full-body 9:16 character concept, straight-on three-quarter app sprite view, generous breathing room, no cropped hair, hands, feet, or held tools.
Lighting: controlled Tower lobby lighting with confident contrast, soft brass highlights, and clear foreground/background separation.
Tower-world fit: adult professional energy, Professional Scars tone, luxury internship command-center taste, grounded specificity, no generic office stock-asset gloss.
Shared quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
The style envelope is identical for every lane. Only the lane design card may vary.
## End Shared Tower Character Style Envelope

Design variation matrix:
Allowed variation axes: silhouette; age read; hair shape/length/texture; facial structure; wardrobe category; color palette; posture/body language; accessories/tools; personality read; Tower role archetype.
Locked across lanes: rendering style, finish quality, camera/framing, lighting, backdrop discipline, source model, and Tower-world fit.
Do not collapse all lanes into the same suit, same short hair, same corporate leader silhouette, or same role archetype.

Shared initial-concept lane quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
Initial-concept lane variation rule: Variation is allowed only inside these character-design axes: silhouette, age read, hair shape/length/texture, facial structure, wardrobe category, color palette, posture/body language, accessories/tools, personality read, Tower role archetype. Do not vary rendering style, quality, camera/framing, lighting, source model, or Tower-world fit.

Lane design card:
- label: War-Room Rainmaker
- silhouette: compact athletic forward-leaning triangle
- age read: late 30s
- hair shape/length/texture: coiled shoulder-length curls pulled to one side
- facial structure: square jaw, tired bright eyes, strong brow, alert expression
- wardrobe category: rolled-sleeve silk blouse, cropped utility vest, tailored cargo trousers
- color palette: deep navy, warm copper, ivory
- posture/body language: mid-stride crisis-command energy with decisive hands
- accessories/tools: annotated tablet, stylus, emergency floor badge
- personality read: restless, brilliant, direct
- Tower role archetype: deal-room crisis commander

Unique character design mandate (War-Room Rainmaker): deal-room crisis commander: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 3: api-lane-03__initial-character-concept

Lane: api-lane-03
Base slot: initial-character-concept
Prompt hash: caa774dbae2aaebd
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-03/initial-character-concept/mara-initial-concept__api-lane-03.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Asset contract: Tower character concept. Match the approved Otis/Tower character visual language: premium stylized high-detail app/game character art.
Use the shared style envelope from the generation plan for style, quality, camera/framing, lighting, and Tower-world fit.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Design variation belongs only in silhouette, age read, hair, face, wardrobe, palette, posture, accessories, personality, and Tower role archetype.
Avoid generic fashion editorial posing, superhero styling, text, labels, logos, watermarks, and copied likenesses.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

## Shared Tower Character Style Envelope
Style target: premium stylized high-detail app/game character art in the Otis-compatible Tower character style.
Rendering language: crisp painterly raster forms, controlled dimensional depth, detailed fabric construction, expressive face detail, polished hair rendering, and clean material edges.
Camera/framing: full-body 9:16 character concept, straight-on three-quarter app sprite view, generous breathing room, no cropped hair, hands, feet, or held tools.
Lighting: controlled Tower lobby lighting with confident contrast, soft brass highlights, and clear foreground/background separation.
Tower-world fit: adult professional energy, Professional Scars tone, luxury internship command-center taste, grounded specificity, no generic office stock-asset gloss.
Shared quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
The style envelope is identical for every lane. Only the lane design card may vary.
## End Shared Tower Character Style Envelope

Design variation matrix:
Allowed variation axes: silhouette; age read; hair shape/length/texture; facial structure; wardrobe category; color palette; posture/body language; accessories/tools; personality read; Tower role archetype.
Locked across lanes: rendering style, finish quality, camera/framing, lighting, backdrop discipline, source model, and Tower-world fit.
Do not collapse all lanes into the same suit, same short hair, same corporate leader silhouette, or same role archetype.

Shared initial-concept lane quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
Initial-concept lane variation rule: Variation is allowed only inside these character-design axes: silhouette, age read, hair shape/length/texture, facial structure, wardrobe category, color palette, posture/body language, accessories/tools, personality read, Tower role archetype. Do not vary rendering style, quality, camera/framing, lighting, source model, or Tower-world fit.

Lane design card:
- label: Velvet Strategist
- silhouette: soft-power hourglass with draped diagonal lines
- age read: mid 40s
- hair shape/length/texture: waist-length black braid with a brass clasp
- facial structure: oval face, sharp eyes, full mouth, calm assessing gaze
- wardrobe category: luxe wrap jacket, long split skirt, structured boots
- color palette: plum, deep teal, brushed gold
- posture/body language: relaxed contrapposto, one hand holding a closed folio
- accessories/tools: fountain pen, contract folio, slim signet ring
- personality read: seductive strategist, patient, dangerous
- Tower role archetype: boardroom dealmaker

Unique character design mandate (Velvet Strategist): boardroom dealmaker: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 4: api-lane-04__initial-character-concept

Lane: api-lane-04
Base slot: initial-character-concept
Prompt hash: 5c2fd628ef7e2639
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-04/initial-character-concept/mara-initial-concept__api-lane-04.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Asset contract: Tower character concept. Match the approved Otis/Tower character visual language: premium stylized high-detail app/game character art.
Use the shared style envelope from the generation plan for style, quality, camera/framing, lighting, and Tower-world fit.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Design variation belongs only in silhouette, age read, hair, face, wardrobe, palette, posture, accessories, personality, and Tower role archetype.
Avoid generic fashion editorial posing, superhero styling, text, labels, logos, watermarks, and copied likenesses.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

## Shared Tower Character Style Envelope
Style target: premium stylized high-detail app/game character art in the Otis-compatible Tower character style.
Rendering language: crisp painterly raster forms, controlled dimensional depth, detailed fabric construction, expressive face detail, polished hair rendering, and clean material edges.
Camera/framing: full-body 9:16 character concept, straight-on three-quarter app sprite view, generous breathing room, no cropped hair, hands, feet, or held tools.
Lighting: controlled Tower lobby lighting with confident contrast, soft brass highlights, and clear foreground/background separation.
Tower-world fit: adult professional energy, Professional Scars tone, luxury internship command-center taste, grounded specificity, no generic office stock-asset gloss.
Shared quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
The style envelope is identical for every lane. Only the lane design card may vary.
## End Shared Tower Character Style Envelope

Design variation matrix:
Allowed variation axes: silhouette; age read; hair shape/length/texture; facial structure; wardrobe category; color palette; posture/body language; accessories/tools; personality read; Tower role archetype.
Locked across lanes: rendering style, finish quality, camera/framing, lighting, backdrop discipline, source model, and Tower-world fit.
Do not collapse all lanes into the same suit, same short hair, same corporate leader silhouette, or same role archetype.

Shared initial-concept lane quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
Initial-concept lane variation rule: Variation is allowed only inside these character-design axes: silhouette, age read, hair shape/length/texture, facial structure, wardrobe category, color palette, posture/body language, accessories/tools, personality read, Tower role archetype. Do not vary rendering style, quality, camera/framing, lighting, source model, or Tower-world fit.

Lane design card:
- label: Glasshouse Technocrat
- silhouette: short precise rectangular silhouette with clean geometric edges
- age read: mid 30s
- hair shape/length/texture: asymmetric pixie undercut with one glossy wave
- facial structure: sharp brow, narrow chin, intense eyes, controlled expression
- wardrobe category: monochrome jumpsuit, translucent long coat, geometric belt
- color palette: charcoal, cool white, signal red
- posture/body language: one hand in pocket, the other marking a system diagram
- accessories/tools: AR monocle, red stylus, tiny brass cuff
- personality read: coldly inventive, surgical, future-facing
- Tower role archetype: systems CEO

Unique character design mandate (Glasshouse Technocrat): systems CEO: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 5: api-lane-05__initial-character-concept

Lane: api-lane-05
Base slot: initial-character-concept
Prompt hash: 12e7f416f53c8f84
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-003/api-lane-05/initial-character-concept/mara-initial-concept__api-lane-05.png`

Prompt:

```text
# Mara Initial Character Concepts

Request: Make Mara Voss as a Tower character sprite from scratch: the CEO of the C-Suite, adult professional energy, tower-flat-plus-depth-v1, Professional Scars tone, initial prompt-only character direction.

Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.
No old references, no identity reference images, no previous character art, and no external image grounding.
Asset contract: Tower character concept. Match the approved Otis/Tower character visual language: premium stylized high-detail app/game character art.
Use the shared style envelope from the generation plan for style, quality, camera/framing, lighting, and Tower-world fit.
The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.
Design variation belongs only in silhouette, age read, hair, face, wardrobe, palette, posture, accessories, personality, and Tower role archetype.
Avoid generic fashion editorial posing, superhero styling, text, labels, logos, watermarks, and copied likenesses.

Cutout backdrop contract (premium-simple-backdrop-v1): Use a premium simple backdrop with high subject/background separation. Use no patterned walls. Use no furniture or objects overlapping the body, hair, hands, feet, or held props. Avoid same-color collisions between clothing, props, and background. Use no cast or contact shadows touching or merging with the subject. Use full-body framing with generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
Keep the full character and all expected tools fully inside frame; leave visible breathing room around hair, fingers, glasses, keys, badges, pens, feet, and held tools.
Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.
Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.

## Shared Tower Character Style Envelope
Style target: premium stylized high-detail app/game character art in the Otis-compatible Tower character style.
Rendering language: crisp painterly raster forms, controlled dimensional depth, detailed fabric construction, expressive face detail, polished hair rendering, and clean material edges.
Camera/framing: full-body 9:16 character concept, straight-on three-quarter app sprite view, generous breathing room, no cropped hair, hands, feet, or held tools.
Lighting: controlled Tower lobby lighting with confident contrast, soft brass highlights, and clear foreground/background separation.
Tower-world fit: adult professional energy, Professional Scars tone, luxury internship command-center taste, grounded specificity, no generic office stock-asset gloss.
Shared quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
The style envelope is identical for every lane. Only the lane design card may vary.
## End Shared Tower Character Style Envelope

Design variation matrix:
Allowed variation axes: silhouette; age read; hair shape/length/texture; facial structure; wardrobe category; color palette; posture/body language; accessories/tools; personality read; Tower role archetype.
Locked across lanes: rendering style, finish quality, camera/framing, lighting, backdrop discipline, source model, and Tower-world fit.
Do not collapse all lanes into the same suit, same short hair, same corporate leader silhouette, or same role archetype.

Shared initial-concept lane quality floor: Every character concept lane must keep the same premium finish: high-detail material construction, face and hair specificity, confident contrast, controlled dimensional lighting, crisp edges, and polished app/game character art quality.
Initial-concept lane variation rule: Variation is allowed only inside these character-design axes: silhouette, age read, hair shape/length/texture, facial structure, wardrobe category, color palette, posture/body language, accessories/tools, personality read, Tower role archetype. Do not vary rendering style, quality, camera/framing, lighting, source model, or Tower-world fit.

Lane design card:
- label: Old-Money Firebrand
- silhouette: broad grounded cape-backed silhouette with regal weight
- age read: late 50s
- hair shape/length/texture: natural silver coils shaped into a sculptural crown
- facial structure: strong nose, deep smile lines, calm direct gaze
- wardrobe category: structured capelet, high-neck knit, pleated trousers
- color palette: forest green, cream, antique brass
- posture/body language: feet planted, chin lifted, pointer angled toward the viewer
- accessories/tools: cane-like pointer, signet ring, embossed floor dossier
- personality read: warm menace, inherited power, reformer fire
- Tower role archetype: dynasty reformer

Unique character design mandate (Old-Money Firebrand): dynasty reformer: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```
