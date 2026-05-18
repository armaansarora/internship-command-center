# Tower Character Image Prompts

This is the generation-ready prompt pack for the next phase. It does not approve or store final assets. Its job is to make every character image start from the same locked system: `tower-flat-plus-depth-v1`, Professional Scars, character-specific visual DNA, and hard approval gates.

## Global Prompt Rules

- Use the approved Creative Production Engine generation adapter for the run. Current Otis fresh-start uses the Gemini API Nano Banana 2 path with the configured local key and budget cap.
- Generate concept boards first. Do not generate production poses before a winner reference, turnaround, outfit variant sheet, and expression sheet are approved.
- Ask for exactly 5 prompt-only concept options when making a concept board.
- Use the character's canon, visual DNA, and negative prompt together. Do not use celebrity names, actor names, named fictional characters, logos, fake text, or brand-confusable styling.
- Every character must have three outfit variants: `regular`, `summer-light`, and `winter-layered`.
- Outfit variants are edits of the approved clothing the character already wears, not new outfits, new palettes, or alternate identities.
- Production sprites start as 4K transparent masters with a target long edge of 4096px, full-body framing, safe padding, and the exact outfit-variant path in `docs/CHARACTER-ASSET-HANDOFF.md`.
- The active repo has no approved character art. Otis starts from prompt-only initial concepts, then a production pack after one design is approved.

## Otis Vale

characterId: otis

Concept board prompt ref: art-bible:otis-concept-board-v1

Pose pack prompt ref: art-bible:otis-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Otis Vale, Lobby Concierge of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, flat forms with subtle depth. He is the warm front desk steward of a luxury internship command-center skyscraper: burgundy, brass, ivory, deep navy, calm hands, knowing eyes, brass bell or guest ledger. Vary age impression, uniform cut, posture, warmth, and silhouette while preserving unhurried competence. Solid neutral approval background, no fake checkerboard. No text, logo, watermark, mascot proportions, bowtie caricature, generic hotel-stock smile, or CEO gold palette.

Pose pack prompt: Using approved Otis Vale identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} 4K production master. Preserve exact face, hair, burgundy wardrobe, brass detail, proportions, warm stillness, natural human softness, and concierge props. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, target long edge 4096px, generous safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, identity drift, fake-perfect hair, overly muscular body, sharp model jawline, or plastic AI face.

Negative prompt: mascot concierge, bowtie caricature, generic hotel stock photo, CEO gold palette, superhero costume, fake text, logo, watermark, celebrity likeness.

## Mara Voss

characterId: ceo

Concept board prompt ref: art-bible:mara-voss-concept-board-v1

Pose pack prompt ref: art-bible:mara-voss-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Mara Voss, CEO of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. She is a commanding crisis strategist with controlled power: architectural tailoring, immaculate dark suit, one ivory/oxblood/gold accent, geometric hair shape, skyline-glass authority, composed face, still posture. Vary silhouette, suit cut, age impression, stance, hair geometry, and executive warmth while preserving formidable restraint. No celebrity likeness, named-character styling, villain queen, photorealism, flashy jewelry overload, or startup blazer softness.

Pose pack prompt: Using approved Mara Voss identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact architectural silhouette, face, hair, dark tailoring, controlled accent, and composed stillness. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: celebrity likeness, named-character styling, villain queen, photoreal render, flashy jewelry, soft startup blazer, superhero pose, fake text.

## Rafe Calder

characterId: cro

Concept board prompt ref: art-bible:rafe-calder-concept-board-v1

Pose pack prompt ref: art-bible:rafe-calder-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Rafe Calder, CRO of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. He is a competitive application demolition expert: forward lean, athletic tension, rolled sleeves, loosened tie or tactical jacket, loud shoes, red pen or stylus, expressive brows, pipeline-board energy. Vary posture, intensity, wardrobe cut, age impression, and prop handling while preserving loud useful pressure. No finance-bro stock pose, luxury flex, generic salesman grin, superhero stance, or full tactical armor.

Pose pack prompt: Using approved Rafe Calder identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact face, hair, forward-leaning silhouette, rolled sleeves, red edit prop, and restless pressure. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: finance-bro stock pose, generic salesman grin, luxury flex, superhero stance, tactical armor, fake text, logo, watermark.

## Priya Sen

characterId: cfo

Concept board prompt ref: art-bible:priya-sen-concept-board-v1

Pose pack prompt ref: art-bible:priya-sen-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Priya Sen, CFO of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. She is a precise portfolio analyst with a conscience: compact composed posture, cool Observatory light, elegant practical tailoring, tablet ledger, annotated chart card, calm mathematical eyes. Vary silhouette, garment layering, face geometry, tablet/ledger pose, and degree of warmth while preserving exactness without coldness. No robot accountant, banker stock suit, abacus gimmick, spreadsheet clutter, or chart wallpaper baked into the sprite.

Pose pack prompt: Using approved Priya Sen identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact compact silhouette, face, hair, cool wardrobe, tablet-ledger prop, and precise calm. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: robot accountant, generic banker suit, abacus gimmick, spreadsheet background, cold machine posture, fake text.

## Dylan Shorts

characterId: coo

Concept board prompt ref: art-bible:dylan-shorts-concept-board-v1

Pose pack prompt ref: art-bible:dylan-shorts-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Dylan Shorts, COO of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. He is a calendar tyrant with chief-of-staff urgency: boxy confident stance, clipped gestures, utility blazer, crisp layers, tablet or clipboard, watch-check rhythm, orange operations accent. Vary silhouette, watch gesture, clipboard/tablet use, wardrobe cut, and calm-versus-urgent expression while preserving practical pressure. No bland project-manager stock art, panic sweat, military costume, messy corkboard chaos, or childish intern styling.

Pose pack prompt: Using approved Dylan Shorts identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact face, hair, utility wardrobe, orange accent, clipboard/tablet prop, and urgent calm. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: project-manager stock art, panic sweat, military costume, messy corkboard, intern styling, fake text.

## Vera Bloom

characterId: cmo

Concept board prompt ref: art-bible:vera-bloom-concept-board-v1

Pose pack prompt ref: art-bible:vera-bloom-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Vera Bloom, CMO of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. She is an elegant narrative strategist with editorial precision: expressive hands, poised torso, red pencil or fountain pen, paper stack, controlled warm accent, atelier confidence, warm Writing Room light. Vary hand pose, silhouette, wardrobe layering, expression, and prop use while preserving surgical taste. No beret stereotype, chaotic artist costume, glamour pose, ad-agency stock laptop pose, or fake text on pages.

Pose pack prompt: Using approved Vera Bloom identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact face, hair, editorial wardrobe, red pencil/fountain pen prop, and poised creative authority. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: beret stereotype, chaotic artist costume, glamour pose, stock laptop, fake page text, logo, watermark.

## Sol Navarro

characterId: cno

Concept board prompt ref: art-bible:sol-navarro-concept-board-v1

Pose pack prompt ref: art-bible:sol-navarro-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Sol Navarro, CNO of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. He is a warm relationship strategist with social precision: open shoulders, relaxed lounge posture, soft tailored jacket, brass-green accents, contact cards, phone, coffee note, approachable polish. Vary stance, jacket cut, smile intensity, prop arrangement, and age impression while preserving warmth without manipulation. No spammy sales posture, manipulative grin, party promoter outfit, heart motif, or random phone clutter.

Pose pack prompt: Using approved Sol Navarro identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact face, hair, relaxed jacket, brass-green palette, contact-card prop, and open social posture. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: spammy sales posture, manipulative grin, party promoter outfit, heart motif, random phone clutter, fake text.

## Dr. Inez Park

characterId: cpo

Concept board prompt ref: art-bible:inez-park-concept-board-v1

Pose pack prompt ref: art-bible:inez-park-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Dr. Inez Park, CPO of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. She is a behavioral scientist of ambition with rigorous care: precise posture, structured coat, soft sneakers, dossier, timer, whiteboard marker, laser pointer, focused eyebrow, clinical light softened by warmth. Vary stance, coat shape, prop use, expression, and degree of intensity while preserving supportive discipline. No lab-coat caricature, stern schoolteacher, medical costume, therapy-couch cue, or cold robot posture.

Pose pack prompt: Using approved Dr. Inez Park identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact face, hair, structured prep-lab wardrobe, dossier/timer prop, and rigorous supportive expression. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: lab-coat caricature, stern schoolteacher, medical costume, therapy couch, cold robot posture, fake text.

## Mina Rook

characterId: cio

Concept board prompt ref: art-bible:mina-rook-concept-board-v1

Pose pack prompt ref: art-bible:mina-rook-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Mina Rook, CIO of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. She is a nocturnal pattern hunter with evidence-first restraint: sharp compact posture, watchful side-eye, dark utility layers, bright warning accent, glasses reflection, source cards, dossier tab, cool research glow. Vary silhouette, glasses shape, source-card prop, expression, and wardrobe layering while preserving difficult-to-surprise intelligence. No hacker hoodie, spy trench coat, cyberpunk visor, conspiracy-wall chaos, or fake text.

Pose pack prompt: Using approved Mina Rook identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact face, hair, sharp silhouette, glasses/source-card props, dark utility wardrobe, and cool research accent. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: hacker hoodie, spy trench coat, cyberpunk visor, conspiracy wall, fake text, logo, watermark.

## Etta Knox

characterId: trust

Concept board prompt ref: art-bible:etta-knox-concept-board-v1

Pose pack prompt ref: art-bible:etta-knox-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Etta Knox, Chief Trust Officer of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. She is governance authority whose strictness is protective care: squared stance, tiny smile, graphite and cream tailoring, oxblood trust accent, permission stamp, clipped tablet, redline card, audit seal. Vary stance, wardrobe geometry, stamp/tablet use, age impression, and expression while preserving calm veto authority. No police uniform, villain bureaucrat, courtroom cosplay, legal-scales gimmick, or cute lock mascot.

Pose pack prompt: Using approved Etta Knox identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact face, hair, squared posture, graphite/cream wardrobe, oxblood stamp accent, and permission-protective authority. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: police uniform, villain bureaucrat, courtroom cosplay, legal scales, cute lock mascot, fake text.

## Rowan Vale

characterId: archivist

Concept board prompt ref: art-bible:rowan-vale-concept-board-v1

Pose pack prompt ref: art-bible:rowan-vale-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Rowan Vale, Archivist of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. Rowan is a restless memory keeper with archive-and-elevator access: asymmetrical lean, half-turned posture, structured coat or cardigan, rolled sleeves, brass rail detail, pencil, tablet, tool ring, index card, elevator keycard. Vary silhouette, coat/cardigan shape, lean, prop use, and expression while preserving thoughtful kinetic mischief. No dusty wizard archivist, sepia nostalgia, inventor goggles, magical librarian costume, or childish mechanic.

Pose pack prompt: Using approved Rowan Vale identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact face, hair, asymmetrical posture, archive wardrobe, tool-ring/index-card prop, and elevator-system energy. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: dusty wizard archivist, sepia nostalgia, inventor goggles, magical librarian costume, childish mechanic, fake text.

## Nadia Flint

characterId: red-team

Concept board prompt ref: art-bible:nadia-flint-concept-board-v1

Pose pack prompt ref: art-bible:nadia-flint-pose-pack-v1

Concept board prompt: Create exactly 5 distinct prompt-only concept options for Nadia Flint, Red Team Counsel and Offer Evaluator of The Tower. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle depth. She is hostile-read counsel whose adversarial instinct is care: sharp angular posture, composed profile, expressive eyebrow, black/oxblood/white legal-review layers, closed folder, verdict card, legal pad, redline tab. Vary silhouette, folder/verdict-card use, expression, wardrobe cut, and stance while preserving calm consequence authority. No villain lawyer, courtroom costume, detective trench coat, horror lighting, or fake legal text.

Pose pack prompt: Using approved Nadia Flint identity reference, approved turnaround, and approved expression sheet, create the {outfitVariantName} {poseName} production sprite. Preserve exact face, hair, angular silhouette, oxblood/black/white wardrobe, verdict-card/folder prop, and calm hostile-read authority. Approved outfit variant: {outfitVariantDefinition}. Full-body on perfectly flat solid #00ff00 chroma matte for local alpha extraction, safe padding, tower-flat-plus-depth-v1. Pose definition: {poseDefinition}. No scene background, checkerboard, text, logo, watermark, or identity drift.

Negative prompt: villain lawyer, courtroom costume, detective trench coat, horror lighting, fake legal text, logo, watermark.
