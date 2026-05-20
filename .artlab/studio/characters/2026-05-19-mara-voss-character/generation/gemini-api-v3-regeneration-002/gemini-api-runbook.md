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
	npm run art:generate -- cutout-readiness --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-002/gemini-api-plan.json
	npm run art:generate -- run-api --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-002/gemini-api-plan.json
	npm run art:generate -- cutout-auto --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-002/gemini-api-plan.json --slots <slot-id>
	npm run art:generate -- cutout-doctor --plan .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-002/gemini-api-plan.json --strict
	npm run art:generate -- status --bridge .artlab/studio/characters/2026-05-19-mara-voss-character/generation/gemini-api-v3-regeneration-002/gemini-api-plan.json
	```

## Slots

## Slot 1: api-lane-01__initial-character-concept

Lane: api-lane-01
Base slot: initial-character-concept
Prompt hash: 62093bf3e3a2127d
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-002/api-lane-01/initial-character-concept/mara-initial-concept__api-lane-01.png`

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
- label: Warm Classic Concierge
- silhouette: medium-tall rounded rectangle with relaxed shoulders and welcoming stance
- age read: late 50s to early 60s
- hair shape/length/texture: neat silver hair with compact side volume and a trimmed beard
- facial structure: soft square face, kind eyes, lived-in smile lines
- wardrobe category: heritage hotel cardigan layered over crisp concierge shirt
- color palette: deep navy, burgundy, antique brass, warm white
- posture/body language: open chest, one hand lifted in greeting, feet grounded
- accessories/tools: brass key ring, small lapel badge, folded welcome card
- personality read: warm, observant, quietly capable
- Tower role archetype: classic lobby guardian

Unique character design mandate (Warm Classic Concierge): classic lobby guardian: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 2: api-lane-02__initial-character-concept

Lane: api-lane-02
Base slot: initial-character-concept
Prompt hash: c0044fe7ea843e5e
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-002/api-lane-02/initial-character-concept/mara-initial-concept__api-lane-02.png`

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
- label: Retired Showman
- silhouette: slightly taller pear-shaped silhouette with expressive hands
- age read: early 60s
- hair shape/length/texture: swept-back silver hair with expressive brows and a tidy beard
- facial structure: longer face, lifted cheeks, animated eyes
- wardrobe category: restrained velvet concierge jacket with refined shirt and trousers
- color palette: wine, charcoal, brass, cream
- posture/body language: theatrical half-turn with one hand presenting the Tower
- accessories/tools: polished cane umbrella and brass watch chain
- personality read: charming, theatrical, still deeply competent
- Tower role archetype: old-stage host turned operator

Unique character design mandate (Retired Showman): old-stage host turned operator: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 3: api-lane-03__initial-character-concept

Lane: api-lane-03
Base slot: initial-character-concept
Prompt hash: 6e9d6fa8c8e39a9a
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-002/api-lane-03/initial-character-concept/mara-initial-concept__api-lane-03.png`

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
- label: Neighborhood Elder
- silhouette: shorter rounder body with soft shoulders and familiar warmth
- age read: mid 60s
- hair shape/length/texture: soft silver curls around the temples with a fuller beard
- facial structure: round face, broad nose, patient eyes, deep smile lines
- wardrobe category: comfortable premium knit blazer over concierge uniform pieces
- color palette: deep green, warm burgundy, muted brass, ivory
- posture/body language: gentle forward lean as if listening carefully
- accessories/tools: small notebook, pencil, old brass room tag
- personality read: patient, protective, community-rooted
- Tower role archetype: trusted front-desk elder

Unique character design mandate (Neighborhood Elder): trusted front-desk elder: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 4: api-lane-04__initial-character-concept

Lane: api-lane-04
Base slot: initial-character-concept
Prompt hash: b220a02022abaf23
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-002/api-lane-04/initial-character-concept/mara-initial-concept__api-lane-04.png`

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
- label: Elegant Old Guard
- silhouette: tall narrow column with precise shoulders and dignified balance
- age read: late 50s
- hair shape/length/texture: immaculate silver side part with short beard and clean edges
- facial structure: angular cheekbones, straight nose, composed mouth
- wardrobe category: formal old-world concierge tailoring with brass details
- color palette: black navy, oxblood, antique brass, white
- posture/body language: upright stillness, hands folded behind back
- accessories/tools: polished badge, white gloves tucked at wrist
- personality read: disciplined, dignified, quietly kind
- Tower role archetype: grand hotel old guard

Unique character design mandate (Elegant Old Guard): grand hotel old guard: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```

## Slot 5: api-lane-05__initial-character-concept

Lane: api-lane-05
Base slot: initial-character-concept
Prompt hash: a1dd8cb47f400087
Expected file: `.artlab/inbox/character/2026-05-19-mara-voss-character/gemini-api-v3-regeneration-002/api-lane-05/initial-character-concept/mara-initial-concept__api-lane-05.png`

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
- label: Cozy Oddball Mentor
- silhouette: compact asymmetrical silhouette with memorable glasses and soft layers
- age read: early 60s
- hair shape/length/texture: loose silver waves, soft beard, slightly eccentric grooming
- facial structure: oval face, warm eyes, distinctive nose, gentle asymmetry
- wardrobe category: premium layered cardigan, patterned scarf, tidy trousers
- color palette: plum, navy, brass, moss green
- posture/body language: relaxed lean with one eyebrow raised and a tiny smile
- accessories/tools: round glasses, key charm, annotated clipboard
- personality read: offbeat, brilliant, emotionally safe
- Tower role archetype: lovable mentor concierge

Unique character design mandate (Cozy Oddball Mentor): lovable mentor concierge: vary the character identity through the explicit lane design card while keeping the shared Tower character style envelope locked.
No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style.
Use no external image search or grounding unless the run plan explicitly enables it.
```
