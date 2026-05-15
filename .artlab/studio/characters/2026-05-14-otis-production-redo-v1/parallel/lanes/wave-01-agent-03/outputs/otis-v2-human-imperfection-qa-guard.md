# Otis v2 Human Imperfection QA Guard

Lane: wave-01-agent-03
Purpose: prevent fake-perfect AI Otis during coordinator generation and review.

## Promotion-Relevant Pass Conditions

- Identity remains the approved soft Santa concierge, not a new character.
- Soft belly is visible and consistent across all outfits, but never played as a gag.
- Face has natural asymmetry, warmth, and older human texture without becoming grotesque.
- Beard and hair are groomed but imperfect: uneven edges, subtle flyaways, no smooth helmet.
- Shoulders and stance feel relaxed and lived-in, not mannequin-straight.
- Clothes are premium Tower quality with believable creases, never dirty, cheap, or sloppy.
- Hands are anatomically clean in every pose, especially thinking, greeting, talking, and working.
- Full body source is uncropped with safe padding for transparent staging.

## Instant Rejects

- Otis becomes slim, athletic, young, or model-perfect.
- Face becomes symmetrical, airbrushed, plastic, or generic AI handsome.
- Beard becomes a perfect white mass with no individual irregularity.
- Belly disappears under the coat or is exaggerated into caricature.
- Asymmetry reads as injury, distortion, or horror.
- Outfit reads as mall Santa costume instead of Tower concierge.
- Pose crops fingers, shoes, coat tails, props, or belly silhouette.
- Contact sheet cell is too small to become a native production sprite.

## Review Rubric

Score each generated source 1 to 5.

| Category | 5 means | 1 means |
| --- | --- | --- |
| Human warmth | Lovable, competent, lived-in, kind | Generic, cold, goofy, or creepy |
| Imperfection control | Specific asymmetry and texture without ugliness | Perfect mannequin or grotesque distortion |
| Body continuity | Soft belly and grounded stance persist | Body changes by outfit or pose |
| Premium Tower fit | Refined materials and adult app polish | Cheap costume, toy, or noisy fantasy art |
| Sprite readiness | Full body, clean edges, readable pose | Cropped, blurry, fused, or low-res |
| Identity consistency | Same Otis across all outputs | Different man each time |

Recommended promotion threshold: no category below 4 for identity masters, and no category below 3 for exploratory pose candidates. Final sprites should be regenerated individually if any pose relies on a contact-sheet crop.

## Human Imperfection Checklist

- Belly: present, soft, tailored around, not hidden.
- Shoulders: relaxed, slightly uneven, still confident.
- Smile: asymmetrical and warm, no perfect ad grin.
- Eyes: tired warmth, attentive, no dead AI stare.
- Beard: full white, uneven groomed edges, visible flyaways.
- Hair: cared-for but irregular, not helmet-like.
- Hands: older, expressive, anatomically correct.
- Clothes: premium, creased by body and motion, not shabby.

## Known Risks For This Lane

- Over-specifying imperfection can make the model create deformity or clutter.
- Soft belly language can drift into caricature unless paired with premium competence.
- Beard/hair flyaways can create haloing or noisy alpha edges during transparent staging.
- Wide divergence may produce a better character feel but weaker continuity unless the identity reference is locked first.

## Coordinator Note

This lane produced prompt and QA artifacts only. It did not create native image files, contact sheets, transparent sources, or preflight evidence. Any image promoted from this direction needs a new image generation pass, image preflight, review-board comparison, and final approval through the parent pipeline.
