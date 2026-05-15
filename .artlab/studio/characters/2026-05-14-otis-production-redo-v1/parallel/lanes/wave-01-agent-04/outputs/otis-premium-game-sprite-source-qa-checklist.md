# Otis Premium Game Sprite Source QA Checklist

Lane: wave-01-agent-04
Purpose: QA guardrail for any source image generated from the premium game-sprite prompt packet.

## Immediate Source Preflight

- File is an individual source sprite, not a contact sheet.
- Long edge is at least 4096 px before any upscaling.
- Full body is visible with no cropped hair, shoes, hands, ledger, keys, or coat hem.
- Background is real transparent alpha. If not, the fallback background must be perfectly flat and removable.
- Character has 20-30 percent safe padding on all sides.
- No checkerboard, paper texture, floor, wall, shadow plate, text, watermark, or second character.

## Identity QA

- Reads as Otis Vale, not a new concierge.
- Older human face, gray wavy hair, round glasses, white beard, kind tired eyes.
- Slight belly and natural asymmetry remain visible.
- Burgundy wardrobe family remains consistent with the approved reference.
- Ledger and brass keys remain present and correctly scaled.
- Summer-light and winter-layered variants look like outfit edits of the same person, not different characters.

## Premium Game Sprite QA

- Large silhouette shapes read before small line detail.
- 170 x 290 preview still reads as Otis in the Lobby UI.
- 85 x 145 preview still shows head/beard mass, torso shape, ledger block, and stable stance.
- Depth is subtle and graphic, not photographic.
- Interior textures do not create noise at mobile scale.
- Face is warm and lived-in, not waxy, young, fake-perfect, heroic, or mascot-like.

## Pose QA

- idle: calm, centered, usable as the default Lobby presence.
- greeting: hand gesture reads at mobile scale without cropping.
- listening: forward attention reads without tiny facial-detail dependence.
- thinking: glasses or beard gesture is clear but not theatrical.
- talking: explanatory hand shape does not create noisy finger tangles.
- alert: focused and upright, not startled or combat-ready.
- working: ledger interaction is readable without hiding the face or torso.

## Promotion Blockers

- Any source below 4096 px long edge.
- Any missing alpha, uneven background, or visible halo.
- Any pose sheet returned as production source.
- Any identity drift across outfit or pose.
- Any loss of the approved soft human warmth.
- Any mascot, toy, Santa costume, superhero, or ultra-real rendering.
