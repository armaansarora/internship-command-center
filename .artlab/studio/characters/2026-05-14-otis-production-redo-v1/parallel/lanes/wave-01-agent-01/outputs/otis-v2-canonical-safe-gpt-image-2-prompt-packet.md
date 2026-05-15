# Otis v2 Canonical Safe Prompt Packet

Lane: wave-01-agent-01
Parent run: 2026-05-14-otis-production-redo-v1
Strategy: Canonical Safe
Artifact type: GPT Image 2 production prompt and art direction packet
Approval state: draft lane output, not promoted

## Strongest Direction

Keep Otis Vale almost exactly on canon: a warm older Tower concierge with soft Santa-adjacent kindness, a slight belly, lived-in facial asymmetry, and quiet operational competence. The one useful new angle is "threshold keeper": Otis reads as the person who gently holds the elevator, door, or next step open for the user. This gives the seven poses a consistent emotional through-line without changing his identity.

This lane should be used as the identity-lock lane. Other lanes can push silhouette, sprite energy, or material simplification; this one protects recognizability, warmth, body proportions, and production consistency.

## Source Contract For Every Production Sprite

- Generate one sprite per source image. Do not generate a seven-pose sheet as production source.
- Native source must have long edge at least 4096 px before any derivative processing.
- Prefer transparent RGBA output. If transparency is unavailable, use a separate clean mask workflow; avoid chroma-key as the primary path because earlier probes failed flatness.
- Full body must be visible with 10 to 14 percent safe padding on all sides.
- Hands, feet, props, beard edge, and jacket hem must be fully inside frame.
- Keep face, beard mass, belly, shoulder slope, height, and posture consistent across all 21 sprite sources.
- No public/art write. These are draft source prompts only until coordinator review and final approval.

## Identity Lock

Use the approved Otis Vale identity reference as the strict face and body anchor. If an approved reference image is available to GPT Image 2, attach it as the first and highest-priority reference. If no image reference is available, use this text identity lock:

Warm older male Tower concierge, late 60s to early 70s, soft Santa-adjacent human warmth without holiday costume, silver-white hair, full rounded white beard and moustache, kind slightly tired eyes, ruddy cheeks, visible smile lines, a slightly bulbous nose, natural skin texture, mild facial asymmetry, slightly rounded belly, relaxed shoulders, sturdy but gentle stance, premium adult character sprite, lived-in and trustworthy rather than cute mascot or flawless model.

## Visual Style

Premium semi-realistic app character sprite with painterly 3D polish, soft realistic fabric, clean readable silhouette, restrained Tower luxury details, brass accents, oxblood and charcoal base colors with small teal or cream accents, crisp alpha edges, adult and immersive tone. The rendering should feel like an elegant digital concierge character for a serious AI internship command center, not a children's cartoon, not a Christmas illustration, and not a generic corporate mascot.

## Universal Positive Prompt Core

Create a native 4096 px or larger transparent PNG source sprite of Otis Vale, the approved Tower concierge character. Full-body centered character only, no background, no text, no logo, 10 to 14 percent safe padding, both hands visible, both feet visible, crisp edges, consistent face and body from the approved reference. Otis is a warm older male concierge with silver-white hair, full rounded white beard, kind tired eyes, ruddy cheeks, natural skin texture, slight belly, relaxed shoulders, and lived-in human imperfections. Premium semi-realistic painterly 3D app sprite, adult, warm, trustworthy, elegant, quiet Tower luxury, brass details, natural fabric folds, subtle asymmetry, not fake-perfect.

## Universal Negative Prompt Core

Do not create a celebrity likeness. Do not make Otis young, thin, bodybuilder-like, plastic-skinned, fashion-model perfect, childish, cartoon mascot-like, holiday Santa, wizard, fantasy innkeeper, clownish, or exaggeratedly obese. No Christmas suit, no red Santa costume, no toy aesthetic, no background scene, no text, no logo, no labels, no cropped hands, no cropped feet, no hidden fingers, no extra fingers, no duplicate arms, no distorted face, no blurry alpha edge, no glow halo, no props intersecting the body, no low-resolution sheet, no multi-pose sheet for production source.

## Outfit Variants

### Outfit A: Regular Concierge

Deep oxblood concierge waistcoat under a soft charcoal jacket, cream shirt, dark charcoal trousers, polished but comfortable shoes, small brass Tower pin, muted teal pocket square, subtle brass buttons. This is his default in-app Otis look: warm, premium, recognizable, and low-noise at app scale.

### Outfit B: Formal Lobby Host

Midnight navy ceremonial concierge jacket with restrained oxblood lapel facing, brass trim, cream shirt, charcoal trousers, brass Tower pin, slightly more polished shoes. Same body and face. This variant is for higher-stakes greetings and ceremonial Tower moments, but it must not become a costume.

### Outfit C: After-Hours Operator

Cream shirt with sleeves neatly rolled, charcoal vest, oxblood suspenders mostly hidden by the vest, key ring or slim service ledger as a small prop, charcoal trousers, same shoes. Same body and face. This is Otis when he is quietly working behind the scenes, still warm and trustworthy.

## Required Pose Prompts

Use the relevant outfit paragraph plus the universal positive and negative prompt cores for each image.

### idle

Otis stands in a relaxed front-facing three-quarter stance, shoulders slightly rounded, hands loosely folded over his slight belly, gentle closed-mouth smile, weight naturally shifted to one foot, calm threshold-keeper presence.

### greeting

Otis offers a warm open-handed greeting, one hand lifted palm up as if inviting the user into the elevator or lobby, other arm relaxed, soft smile, eye contact, generous but not theatrical.

### listening

Otis tilts his head slightly with attentive eyes, one hand resting lightly near his chest or jacket lapel, the other relaxed by his side, mouth neutral, posture showing patient attention.

### thinking

Otis looks mildly thoughtful, one hand touching the side of his beard with visible natural fingers, brows gently knit, slight smile still present, as if weighing the right next step for the user.

### talking

Otis is mid-explanation, one hand gesturing in a small calm arc, mouth slightly open, face warm and confident, body steady and readable at app scale.

### alert

Otis stands a little taller with a protective but calm expression, one hand raised in a gentle wait gesture, the other hand near his jacket button or service ledger, concerned without panic.

### working

Otis holds a slim service ledger or small tablet at waist height, looking focused but approachable, both hands visible and not merged with the prop, body still fully readable and not cropped.

## Reference Sheet Prompts

These are for review and identity control only. Do not split them into production sprites unless every cell passes source preflight.

### Turnaround Review Sheet

Generate a high-resolution review sheet of Otis Vale in Outfit A, showing five full-body views on a plain transparent or neutral studio background: front, three-quarter front, side, three-quarter back, back. Keep the same face, beard, belly, shoulders, clothing, and proportions in every view. Clear spacing between views, no crop, no text labels burned into the image unless coordinator requests labels separately.

### Expression Review Sheet

Generate a high-resolution review sheet of Otis Vale from chest up in Outfit A with eight expressions: calm idle, warm greeting, attentive listening, thoughtful, speaking, protective alert, working focus, gently amused. Same face identity, same beard and hair, natural asymmetry, no exaggerated cartoon emotion.

## Coordinator Recommendation

Start with Outfit A individual sprites for idle, greeting, and working. Run source preflight immediately before generating the remaining 18 sprites. If any of the first three fail native long-edge, alpha, hands, feet, or identity consistency, stop the batch and revise the source strategy before spending generation budget.
