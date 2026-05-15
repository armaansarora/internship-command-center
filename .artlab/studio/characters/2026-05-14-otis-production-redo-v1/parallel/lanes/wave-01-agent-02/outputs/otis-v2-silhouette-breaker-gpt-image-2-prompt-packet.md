# Otis v2 Silhouette Breaker Prompt Packet

laneId: wave-01-agent-02
parentRunId: 2026-05-14-otis-production-redo-v1
asset: Otis Vale
strategy: Silhouette Breaker / Wide Divergence
artifactType: GPT Image 2 prompt and art direction packet
approvalState: exploratory lane output only

## Lane Thesis

Keep the approved soft Santa concierge identity, but test whether Otis can read faster at small app scale through asymmetric posture, clearer negative space, and more human weight. This lane should not make a new Otis. It should make the same Otis less mannequin-perfect: slight belly, relaxed shoulders, one hip or knee quietly carrying weight, warm face with lived-in asymmetry, hands that feel useful instead of posed.

Strongest direction: **Asymmetric Threshold Keeper**. Otis remains tall, soft, burgundy-and-brass, and unhurried, but each sprite gets a readable silhouette hook: ledger tucked under one arm, one hand holding the elevator path open, key ring hanging at the hip, or bell hand resting low near the desk line. The warmth comes from service posture, not a stock-photo smile.

## Identity Lock

Use the approved Otis Vale identity reference as the first and highest-priority visual input when GPT Image 2 supports image references. Preserve:

- older male Lobby Concierge, late 60s to early 70s
- silver-white hair, full rounded white beard and moustache
- kind tired eyes, visible smile lines, ruddy cheeks, mild facial asymmetry
- slight belly, sturdy gentle build, relaxed shoulders, grounded stance
- soft Santa-adjacent human warmth without Christmas costume
- burgundy livery or vest-cardigan hybrid, brass detail, ivory shirt, deep navy or charcoal grounding
- premium adult web-game sprite in `tower-flat-plus-depth-v1`

Do not preserve accidental defects from the pilot. Preserve identity, not softness, low resolution, haloing, cropped limbs, or upscaled edges.

## Style Lock

Premium flat-plus-depth Tower character sprite: clean raster shapes, subtle dimensional polish, adult professional proportions, strong mobile-readable silhouette, controlled rim light, soft fabric folds, crisp alpha edge, no ultra-realism, no vector mascot, no generic hotel-stock grin.

Lighting should imply the Lobby palette without creating a background: burgundy, brass, ivory, deep navy, soft warm highlights, no visible room plate, no text, no logo, no watermark.

## Production Source Contract

Generate **one full-body sprite per image**, not a seven-pose sheet, unless the coordinator explicitly changes the source strategy. The previous sheet and individual probes failed source preflight, so each output must target native source quality:

- transparent PNG or a perfectly removable neutral background if alpha is unavailable
- target long edge 4096 px or larger at generation/export time
- full body centered with 10 to 14 percent safe padding
- both hands visible, both feet visible, no cropped props
- clean edge with no glow halo
- no fake text or decorative symbols on clothing, ledger, pin, bell, or key ring

## Master Prompt Shell

```text
Using the approved Otis Vale identity reference as the strict face, body, and outfit anchor, create a native 4096 px or larger full-body transparent production sprite of Otis Vale, the Lobby Concierge of The Tower. Keep the approved soft Santa-adjacent human warmth, silver-white hair, rounded white beard, kind tired eyes, ruddy cheeks, smile lines, natural skin texture, mild facial asymmetry, slight belly, relaxed shoulders, sturdy gentle stance, burgundy concierge wardrobe, brass details, ivory shirt, and deep navy or charcoal grounding.

Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, subtle controlled depth, warm professional Tower luxury, crisp alpha edge, natural fabric folds, natural human imperfection. Full-body character only, no background, no text, no logo, no watermark, 10 to 14 percent safe padding, both hands and both feet visible.

Silhouette direction: {silhouetteDirection}
Outfit variant: {outfitVariant}
Pose: {poseDefinition}
Readability requirement: the pose must still read as Otis at 96 px tall, with a clear outer contour and useful negative space around arms, props, belly, and coat.
```

## Universal Negative Prompt

```text
Do not create a celebrity likeness. Do not make Otis young, thin, bodybuilder-like, plastic-skinned, perfectly symmetrical, fashion-model sharp, childish, cartoon mascot-like, Christmas Santa, wizard, fantasy innkeeper, clownish, or exaggeratedly obese. No red Santa costume, no bowtie caricature, no CEO gold palette, no superhero costume, no generic hotel stock photo smile, no photoreal render, no background scene, no text, no logo, no readable letters, no fake badge text, no watermark, no cropped hands, no cropped feet, no hidden fingers, no extra fingers, no duplicate arms, no distorted face, no glow halo, no blurry edge, no prop fused into the body, no low-resolution source, no multi-pose sheet for production source.
```

## Silhouette Directions

### A. Asymmetric Threshold Keeper

Best production candidate. Otis stands in a soft contrapposto: one shoulder lower, one hand open at elevator height, the other hand low near his slight belly or key ring. The outside contour forms a warm doorway shape without literal doors. This keeps him welcoming, unhurried, and readable.

Prompt insert:

```text
Asymmetric threshold-keeper silhouette: Otis has a calm vertical body shape with a subtle weight shift, one shoulder slightly lower, one open hand angled outward as if making space for the guest to enter, the other hand relaxed low near his slight belly or brass key ring. Clear negative space between the raised forearm and torso. Warm service posture, not theatrical.
```

### B. Ledger Under Arm

Tests a side-weighted silhouette. A slim guest ledger tucked under one arm makes him less centered and more specific, while keeping the other hand free and readable. Useful for `working`, `listening`, and `thinking`.

Prompt insert:

```text
Side-weighted ledger silhouette: Otis holds a plain dark guest ledger tucked under one arm, creating a broad soft body mass on one side and a relaxed open hand on the other. The ledger has no visible text or logo. His slight belly and rounded vest remain visible. Avoid stiff accountant posture; keep front-desk warmth.
```

### C. Bell-And-Key Low Anchor

Tests lower-body readability and natural belly/hand placement. One hand rests near a small brass bell or key ring, with elbows low and shoulders soft. This should be the least dramatic option but the most human.

Prompt insert:

```text
Bell-and-key low-anchor silhouette: Otis keeps both elbows low and relaxed, one hand near a small plain brass bell or key ring at waist height, the other hand gently open. His slight belly, rounded vest shape, and grounded feet create the read. The prop is small, textless, and never intersects fingers or jacket.
```

## Outfit Variant Guardrails

### regular

Deep oxblood concierge waistcoat or vest-cardigan hybrid under a soft charcoal jacket, ivory shirt, dark charcoal trousers, comfortable polished shoes, restrained brass buttons or pin, optional muted teal pocket square. This must be the default recognizable Otis.

### summer-light

Same identity and palette, lighter edit: oxblood vest-cardigan or waistcoat without heavy jacket, ivory shirt with open collar or rolled sleeves, brass pin/key ring retained, dark breathable trousers, comfortable shoes. Do not turn him into a waiter, retiree-on-vacation, or generic office greeter.

### winter-layered

Same identity and palette, heavier edit: charcoal or deep navy overcoat/cardigan layer over oxblood waistcoat, ivory shirt, brass detail, scarf only if restrained and textless. Keep the slight belly and soft posture visible; avoid fantasy innkeeper, Santa coat, or costume cloak.

## Seven Pose Definitions For This Lane

### idle

Quiet front-desk presence, 3/4 front view, relaxed weight shift, slight belly visible, shoulders soft, hands low and useful. Use **Bell-And-Key Low Anchor** unless another lane needs contrast.

### greeting

Warm open-handed invitation, one hand lifted with clear negative space, the other relaxed near key ring or belly. Use **Asymmetric Threshold Keeper**.

### listening

Head slightly tilted, one hand lightly touching ledger or vest edge, other hand relaxed. Avoid crossed arms. Use **Ledger Under Arm** or **Bell-And-Key Low Anchor**.

### thinking

Mildly narrowed kind eyes, hand at beard or chin without hiding mouth shape, ledger tucked under opposite arm, weight shifted. Use **Ledger Under Arm**.

### talking

One hand open at chest height, the other low, mouth gently active without caricature. Use **Asymmetric Threshold Keeper**.

### alert

Still warm but more upright, one hand slightly raised as if pausing a guest before the elevator, key ring or bell hand low. Avoid alarmed, angry, or security-guard energy. Use **Asymmetric Threshold Keeper**.

### working

Writing or checking a plain guest ledger at waist height, no visible text, shoulders rounded, slight belly and full body still visible. Use **Ledger Under Arm** or a low desk-implied gesture without rendering a desk.

## Recommended Probe Order

1. `regular / greeting / Asymmetric Threshold Keeper`
2. `regular / idle / Bell-And-Key Low Anchor`
3. `summer-light / listening / Ledger Under Arm`
4. `winter-layered / alert / Asymmetric Threshold Keeper`

Only expand into the full 21-sprite pack after the coordinator confirms native resolution and alpha/background preflight on at least one probe.

## Coordinator Notes

This lane intentionally pushes silhouette more than outfit novelty. If selected, merge its posture language with the safest canonical face/outfit lock from other lanes. The main blocker is still source generation quality: a beautiful direction is not promotable unless the source passes native 4K, alpha/flatness, padding, and app-scale QA.
