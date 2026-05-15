# Otis Premium Game Sprite GPT Image 2 Prompt Packet

Lane: wave-01-agent-04
Parent run: 2026-05-14-otis-production-redo-v1
Asset: Otis Vale, Lobby Concierge
Strategy: Premium Game Sprite / Wide Divergence
Status: Prompt and art-direction artifact only. No image source was generated in this lane.

## Strongest Direction

Make Otis feel like a premium playable web-game concierge sprite: mature, readable, generous, and useful on a UI stage. He should still be the approved soft Santa concierge design, but this lane pushes the render language toward clean raster forms, strong silhouette hierarchy, and subtle 2.5D game depth instead of painterly illustration or mascot charm.

The core read at mobile scale should be:

- rounded gray hair and beard mass
- warm round glasses and tired-kind eyes
- burgundy concierge torso shape with a slight belly
- dark trousers and sturdy brown shoes
- leather ledger rectangle near the chest
- key ring loop at the belt
- relaxed adult posture, never heroic or cute

## Visual DNA To Preserve

- Older human man, not a mascot, not a fantasy dwarf, not Santa in costume.
- Soft Santa warmth: kind eyes, generous face, white beard, rounded body, calm welcome.
- Slight belly and natural human asymmetry. Do not flatten him into an idealized model.
- Round glasses, wavy gray hair, full white beard, lived-in face, gentle smile lines.
- Burgundy concierge wardrobe family, cream shirt, dark tie, dark trousers, worn brown shoes.
- Brass keys, small lapel pin, and a leather ledger/book as recurring identifiers.
- Motion personality: concierge-calm, steady, patient, capable.

## Render Contract

Use a polished game-sprite rendering approach:

- Clean raster shapes with controlled edge detail.
- Subtle depth: soft ambient occlusion in coat folds, under beard, under hands, and around the ledger.
- Simplified material reads: burgundy wool, cream cotton, leather ledger, brass keys, polished worn shoes.
- Confident contour and readable pose before interior texture.
- No ultra-realistic skin pores, no photographic lighting, no waxy AI model face.
- No childish cartoon proportions, chibi head, mascot gloves, button eyes, toy-like grin, or theme-park costume.
- No direct game franchise style copying. Use modern premium game readability only.

## Production Output Rules

Generate one individual sprite per output file. Do not generate a multi-pose sheet unless the coordinator explicitly asks for a review board only.

Required source target:

- Transparent PNG with real alpha channel preferred.
- Native 4K-class source, long edge at least 4096 px before derivatives.
- Full body visible, including hair, shoes, hands, ledger, keys, and props.
- Centered upright character with 20-30 percent transparent safe padding.
- 3/4 front view unless a pose specifically needs a small turn.
- No floor shadow baked into the character alpha unless it can be cleanly removed.
- If transparency is unavailable, use a single flat background only; avoid gradients, paper texture, and uneven chroma.

## Master GPT Image 2 Prompt

Create a full-body transparent PNG character sprite of Otis Vale, the Lobby Concierge for a premium web-game interface called The Tower. Otis is an older warm human man with wavy gray hair, round glasses, a full white beard, kind tired eyes, smile lines, a slightly rounded belly, and a calm lived-in presence. He wears refined burgundy concierge layers, a cream shirt, a dark tie, dark trousers, worn brown shoes, a small lapel pin, brass keys, and carries a dark leather ledger. Render him as a mature premium game sprite with clean raster shapes, excellent silhouette readability at mobile scale, subtle 2.5D depth, soft ambient occlusion, controlled painterly edges, and clear material separation. Keep the approved soft Santa warmth without making him Santa, a mascot, a toy, or a fake-perfect model. Full body, centered, 3/4 front, 20-30 percent transparent padding, native high resolution with long edge at least 4096 px, clean alpha, no crop, no text, no watermark.

Negative direction: no ultra-realism, no photography, no celebrity likeness, no cartoon mascot, no chibi proportions, no superhero pose, no exaggerated muscles, no plastic skin, no wax face, no perfect symmetrical model, no holiday costume, no red Santa suit, no childish smile, no giant head, no tiny feet, no cropped hands, no cropped shoes, no missing keys, no noisy background, no checkerboard background, no halo, no contact sheet, no multiple characters.

## Outfit Variants

Use these exact outfit variant names for downstream slot planning:

- regular: burgundy blazer over burgundy vest, cream shirt, dark tie, dark trousers, brown shoes, ledger and brass keys.
- summer-light: burgundy vest without blazer, rolled cream sleeves, loosened tie, dark trousers, brown shoes, ledger and brass keys.
- winter-layered: long burgundy coat, burgundy vest, dark scarf, cream shirt, dark tie, dark trousers, brown shoes, ledger and brass keys.

## Pose Addenda

Append one pose addendum to the master prompt for each individual generation.

- idle: relaxed upright stance, ledger held naturally against his chest with one arm, other hand near pocket or belt keys, soft closed-mouth smile.
- greeting: one hand lifted in a small welcoming wave, ledger tucked securely in the other arm, shoulders open, friendly but restrained.
- listening: slight forward lean, brows gently attentive, one hand near chin or ledger spine, calm eye contact, no theatrical reaction.
- thinking: gaze slightly down and aside, hand adjusting glasses or touching beard, ledger close to torso, thoughtful pause.
- talking: one hand making a small explanatory gesture, mouth lightly open, ledger held steady, composed concierge confidence.
- alert: posture a little straighter, eyes focused, ledger hugged closer, one hand raised subtly as if noticing something important, not alarmed.
- working: looking down at open ledger or small note, one hand writing or checking a page, still readable as full-body Otis.

## Slot Generation Plan

Generate in this order to control drift:

1. regular idle as identity lock
2. regular greeting
3. regular listening
4. regular thinking
5. regular talking
6. regular alert
7. regular working
8. summer-light idle, using regular idle identity as reference
9. remaining summer-light poses
10. winter-layered idle, using regular idle identity as reference
11. remaining winter-layered poses

After every idle slot, pause for identity check before generating its remaining six poses.

## Mobile Silhouette QA

Before any promotion candidate advances, downsample a preview to 170 x 290 and 85 x 145. It must still read as Otis without relying on facial detail:

- head and beard form remain distinct
- glasses are suggested, not lost in noise
- burgundy torso is the dominant mid-shape
- ledger is a clear prop block
- key ring remains a visible accent
- shoes and stance do not collapse into a dark blob
- pose reads without thin fingers or tiny facial expression being the only cue

## Rejection Triggers

Reject the generation if any of these occur:

- long edge below 4096 px
- no alpha channel or non-flat background when alpha was requested
- cropped hands, shoes, keys, ledger, hair, or coat hem
- fake-perfect younger face, influencer smile, or model-like symmetry
- mascot proportions, giant head, simplified toy body, or holiday costume
- over-rendered realism that will clash with Tower UI
- seven-pose contact sheet returned as a substitute for individual source sprites
- inconsistent face, beard, glasses, belly, or prop scale between poses
