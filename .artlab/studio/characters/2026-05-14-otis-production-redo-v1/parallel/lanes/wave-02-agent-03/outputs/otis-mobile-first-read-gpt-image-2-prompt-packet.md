# Otis Mobile First Read GPT Image 2 Prompt Packet

Lane: wave-02-agent-03  
Parent run: 2026-05-14-otis-production-redo-v1  
Asset: Otis Vale  
Status: exploratory prompt artifact, not approved for app

## Lane Thesis

Otis should read first as a threshold keeper on a phone: sturdy, warm, a little imperfect, and immediately recognizable before material detail matters. The production prompts should bias toward a strong full-body shape, face readability at 144 CSS px, gestures that survive compression, and a source frame that will not collide with Lobby text or mobile safe areas.

## Identity Lock

- Soft Santa concierge identity without becoming a seasonal Santa costume.
- Older human concierge, late 50s to early 60s, warm eyes, lived-in face, natural beard, slightly rounded belly, sturdy legs, relaxed shoulders.
- Premium game-sprite material quality: clean painterly 3D/2.5D finish, rich but simplified fabrics, readable edges, no noisy micro-detail.
- Threshold-keeper attitude: gentle authority, welcoming boundary, "you may enter when ready" warmth.
- Human imperfection must remain visible: subtle asymmetry, textured beard, realistic posture, slight belly, soft hands, friendly fatigue.

## Global Production Constraints

Use these constraints on every GPT Image 2 production probe:

- Transparent full-body character sprite, single character only, no background, no text, no labels.
- Native high-resolution source target, 4096 x 4096 or highest available square master.
- Entire body visible with 18% to 22% transparent padding on all sides.
- Hands, feet, beard, coat hem, belly, and props fully inside frame.
- Character faces 3/4 front unless the pose explicitly requires a different view.
- Lighting is soft and consistent across variants, with a clean rim only if it survives transparent staging.
- No crop, no halo, no duplicate limbs, no broken fingers, no smeared facial features.

## Negative Prompt Anchor

Do not create: skinny fashion model, fake-perfect AI model face, childlike mascot, red Santa suit, Christmas hat, candy cane, toy-shop aesthetic, anime style, flat vector icon, photoreal celebrity likeness, horror doorman, messy painterly blur, tiny unreadable hands, over-detailed medals, text, logo, labels, cropped feet, cropped hands, cropped props, extreme wide stance, hard black outline, noisy fabric pattern, exaggerated belly caricature.

## Probe 01: Mini-Read Silhouette Gate

Purpose: prove Otis is recognizable at 96 to 144 CSS px before generating the full pose matrix.

Copy-paste prompt:

```text
Create a transparent full-body production sprite of Otis Vale, an older soft Santa-like concierge and threshold keeper for a premium AI internship command center called The Tower. He is warm and human, late 50s to early 60s, with kind eyes, a natural full white-and-silver beard, slightly rounded belly, sturdy legs, soft hands, and lived-in facial imperfections. He wears a premium lobby concierge outfit: deep oxblood waistcoat, warm ivory shirt, charcoal trousers, polished but comfortable shoes, small brass key ring at the belt, and restrained gold trim.

Pose: idle threshold keeper. 3/4 front view, feet planted shoulder-width, one hand resting near the key ring, the other relaxed open at his side. His silhouette must be readable as a warm concierge at 96 CSS px tall: rounded beard, slight belly, waistcoat block, sturdy legs, and open hand shape. Keep all props below shoulder height so the top third of the frame remains quiet for mobile text overlays.

Style: premium clean game sprite, painterly 2.5D materials, crisp large shapes, simplified fabric detail, expressive face, adult and grounded. Transparent background. Single character only. Full body visible. 18% to 22% transparent padding on every side. No text, no labels, no background.
```

Pass pressure:

- At 96 CSS px, the outline must not collapse into a generic suited person.
- At 144 CSS px, the beard, belly, waistcoat, and open hand must be separately readable.
- Any important pixel inside 8% of the source edge fails.

## Probe 02: Expression Read Gate

Purpose: stress whether Otis can communicate state changes on a small phone without needing captions.

Copy-paste prompt:

```text
Create a transparent high-resolution expression reference sheet for Otis Vale, the older soft Santa-like concierge threshold keeper of The Tower. Use the same identity in every expression: warm eyes, natural white-and-silver beard, slight belly, sturdy concierge posture, human imperfections, premium oxblood-and-ivory lobby outfit. Show four clean 3/4 front full-body sprites on a transparent background with generous spacing and no labels.

Expressions and poses from left to right:
1. Greeting: warm smile, raised open palm below shoulder height, eyes bright.
2. Listening: soft closed-mouth attention, chin slightly tucked, one hand lightly at vest.
3. Thinking: brows gently knit, one hand near beard but not covering mouth, belly and stance still visible.
4. Alert: protective but kind, one hand lifted in a calm stop gesture, eyebrows raised, no panic.

Make the facial expression readable at 144 CSS px tall and the pose intent readable at 192 CSS px tall. Keep gesture shapes broad. Avoid tiny finger acting. No text, no labels, no background, no cropped hands or feet.
```

Pass pressure:

- If greeting/listening/thinking/alert require text to distinguish, fail.
- Thinking cannot hide the mouth or beard silhouette.
- Alert must feel protective, not angry or threatening.

## Probe 03: Safe Crop And Text Collision Gate

Purpose: prevent beautiful production sprites that break the mobile Lobby composition.

Copy-paste prompt:

```text
Create one transparent full-body production sprite of Otis Vale, the premium soft Santa-like concierge threshold keeper. He keeps his approved human warmth, natural beard, slight belly, lived-in face, sturdy frame, and oxblood concierge outfit. Pose: mobile-safe greeting. 3/4 front view, body angled slightly toward the viewer, right hand raised in a welcoming open palm that stays below his shoulder line, left hand near brass key ring, feet fully visible.

Composition rule: the top 30% of the image must stay visually quiet, with no hand, prop, headwear, tall cane, floating object, or dramatic silhouette spike above Otis's head. Keep the widest gesture inside the middle 55% of the frame. Leave generous transparent padding around the full body so the sprite can be placed at the bottom of a phone screen without clipping or covering headline/body text.

Style: premium clean game sprite, simplified rich materials, strong silhouette, transparent background, single character only, no text, no labels, full body, 18% to 22% transparent padding on all sides.
```

Pass pressure:

- Raised hand cannot reach into a typical mobile text block above the character.
- Source must allow bottom-center and bottom-right placement without cutting shoes.
- No prop can create a tall spike that steals attention from the headline.

## Probe 04: Gesture Clarity Gate

Purpose: ensure the seven required pose states are macro-readable, not dependent on tiny details.

Copy-paste prompt:

```text
Create a transparent high-resolution pose probe sheet for Otis Vale, The Tower's older soft Santa-like concierge threshold keeper. Use the same identity in every pose: natural white-and-silver beard, warm eyes, slight belly, sturdy legs, lived-in human face, premium oxblood waistcoat, ivory shirt, charcoal trousers, brass key ring. Show seven separated full-body sprites with no labels and enough spacing to crop each cleanly later.

Pose states:
1. Idle: feet planted, one relaxed open hand.
2. Greeting: open palm below shoulder height, warm smile.
3. Listening: attentive lean, hand at vest, soft eyes.
4. Thinking: hand near beard but face unobscured.
5. Talking: one broad conversational hand gesture, mouth visible.
6. Alert: calm stop gesture, protective stance, kind eyes.
7. Working: holding a compact clipboard or brass service tablet low at waist height, not covering belly or face.

Every pose must remain readable at 160 CSS px tall on a phone. Use broad arms, clear hand shapes, and uncluttered props. Transparent background, no text, no labels, no cropped hands, no cropped feet, no halo.
```

Pass pressure:

- Fail if two poses collapse into the same body language at 160 CSS px.
- Working prop must support the gesture, not become the silhouette.
- Talking must not look like greeting; alert must not look hostile.

## Outfit Variant Modifiers

Apply only after Probe 01 through Probe 04 pass.

### Variant A: Lobby Concierge

Deep oxblood waistcoat, warm ivory shirt, charcoal trousers, small brass key ring, polished comfortable shoes, restrained gold trim. Best for default Lobby and onboarding presence.

### Variant B: Formal Threshold Keeper

Deep bottle-green or midnight-navy concierge coat over ivory shirt, subtle brass piping, charcoal trousers, same beard/belly/posture, no ceremonial excess. Best for Penthouse or high-stakes guidance states.

### Variant C: Workday Steward

Rolled ivory sleeves, charcoal suspenders, warm slate vest, compact brass service tablet or clipboard at waist height, same soft Santa concierge face and slight belly. Best for working, sorting, or operations states.

## Full Pose Matrix Rule

For each outfit variant, generate individual native source images for:

- idle
- greeting
- listening
- thinking
- talking
- alert
- working

Do not rely on a contact sheet as the production source unless every split cell independently passes crop, resolution, alpha, and mobile preview QA.

