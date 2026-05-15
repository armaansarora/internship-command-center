# Otis Dramatic Lighting QA Guard

Lane: wave-02-agent-05  
Scope: Lighting-only guardrails for Otis production probes.

## Pass-Fail Review Order

1. Source contract first: reject if the long edge is below 4096px, if required alpha is missing, or if a chroma background is not perfectly flat.
2. Crop and padding second: reject if hands, feet, beard, belly, prop, or coat edges are cropped or too close to the frame for derivatives.
3. Small-scale readability third: inspect at 256px, 192px, and 128px tall on ivory, brass, burgundy, and deep navy flats.
4. Edge safety fourth: inspect at 200 percent zoom over ivory, burgundy, and deep navy backgrounds for haloing, glow outlines, semi-transparent color fringe, or dirty matte remnants.
5. Identity fit last: reject any lighting that changes Otis from warm human threshold keeper into wizard, toy, horror host, photo-real Santa, or generic luxury butler.

## Lighting Acceptance Rules

- The face must be readable before the coat detail. Eyes, nose bridge, mustache, beard edge, and mouth line must survive at 128px tall.
- Brass can be the main warmth; ivory must protect facial readability; burgundy must stay an accent or reflected side bounce; deep navy must add depth without becoming the dominant value.
- Dramatic contrast is allowed only if Otis still feels welcoming. His warmth is a product trust requirement, not just a style preference.
- Beard values must separate from shirt, jacket, and face. A white beard cannot become a single muddy beige mass.
- Navy rim light must stay inside the painted silhouette. Any bright or blue edge outside the character is a blocker.
- No light bloom, no soft glow cloud, no painted shadow blob, and no lobby background elements in production sprite sources.
- Do not accept a full-size image that only works full-size. The mobile silhouette is the truth.

## Background Fit Checks

Use these flat review swatches for quick compositing:

| Swatch | Hex | What It Proves |
| --- | --- | --- |
| Ivory | `#F4EADC` | Face and beard do not vanish on light lobby surfaces. |
| Brass | `#B68A3A` | Warm highlights do not merge into trim-like UI. |
| Burgundy | `#5A1F2E` | Red bounce does not make the figure muddy. |
| Deep navy | `#091326` | Coat and rim separation work without haloing. |

## Probe-Specific Guardrails

### Brass Threshold Key

Pass if the sprite feels premium and readable on all four swatches. Reject if the whole figure turns uniformly golden or if the beard loses shape.

### Burgundy Lantern Side

Pass only if burgundy enriches the coat or side plane while the face remains warm ivory/brass. Reject if skin, beard, or eye sockets shift red-brown.

### Deep Navy Back-Rim

Pass only if the rim is a thin interior form separator. Reject immediately for blue haloing, black-crushed coat values, or silhouette-only face.

### Ivory Desk Glow

Pass only if the glow supports working/thinking poses without underlighting the eyes. Reject for spooky upward face shadows or blue tech-screen cast.

## Production Recommendation

Default to Brass Threshold Key for the first production candidate. Use Burgundy Lantern Side and Deep Navy Back-Rim as stress probes, not as the main pack recipe, until a real generated source passes the 128px face check and the transparent edge check.

## Promotion Blockers To Surface

- The current parent rejection ledger shows previous probes failed native source resolution and alpha/chroma requirements. Lighting success does not solve that production blocker.
- Dramatic lighting increases the risk of matte fringing and perceived haloing. Every candidate needs dark and light compositing before coordinator review.
- A single dramatic pose can pass while the full 21-sprite set drifts. Require a consistency mini sheet only after individual source generation can meet the resolution contract.
