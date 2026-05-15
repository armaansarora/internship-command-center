# Otis Technical Cleanroom Ship-Ready Contract

Lane: wave-03-agent-02
Parent run: 2026-05-14-otis-production-redo-v1
Asset: Otis Vale
Purpose: turn the Wave 1-2 Otis synthesis into a strict production QA gate before the coordinator spends a full 21-sprite batch.

## Ship-Ready Position

The strongest production path is not another broad concept pass. It is a gated source strategy:

1. Generate and preflight one individual source sprite at a time.
2. Stop immediately on source-size, alpha, padding, crop, or identity failure.
3. Expand to the full 3 outfit x 7 pose pack only after the first regular/idle source and two stress probes pass.

Otis should remain the threshold-keeper soft Santa concierge: warm, slightly rounded, human, premium, and readable on mobile. The asset must not become a fake-perfect fashion model, mascot concierge, literal Santa, or noisy prop collection.

## Exact Image-Source Acceptance Contract

Every source candidate must satisfy all of these before ingest:

- Source granularity: one file per outfit and pose. No 7-pose sheet may become a production source unless every split cell independently satisfies the same requirements.
- Source format: PNG preferred, lossless, RGB or RGBA. True alpha is preferred. Flat chroma is allowed only as a temporary source if the background is perfectly uniform and removable without haloing.
- Native resolution: Otis source frame target is 2400 x 4096. Minimum long edge is 4096 px. Minimum short edge is 2300 px. Upscaled low-resolution generations are rejected even if metadata reports 4096 px.
- Frame aspect: preserve the Otis source/display aspect ratio. Target source ratio is 2400/4096. Target display ratio is 170/290.
- Display derivatives after approved master: default 170 x 290 WebP, @2x 340 x 580 WebP, @3x 510 x 870 WebP.
- Safe padding: visible non-transparent character content must remain inside top 7%, right 11%, bottom 8%, and left 11% safe padding. At 2400 x 4096 this is at least 287 px top, 264 px right, 328 px bottom, and 264 px left.
- Alpha edge: no light or dark halo on black, white, warm lobby, or transparent checkerboard previews. Hair, beard, hand, ledger, keycard, and brass edges must survive dark/light QA.
- Crop safety: no cropped hands, feet, elbows, ledger corners, keycards, bells, coat hems, or shadow/grounding cues.
- Identity lock: older warm concierge, kind tired eyes, natural beard/hair imperfection, slight belly, relaxed uneven shoulders, burgundy concierge visual anchor, restrained brass detail.
- Material style: clean premium web-game raster sprite with simple matte fabrics and restrained brass/keycard/ledger props. No photoreal portrait lighting, plastic 3D toy finish, painterly mush, or over-detailed hotel costume.
- Pose readability: pose must match the canonical slug at 64, 96, 144, 192, and 256 CSS px. If the pose only reads at large desktop scale, reject it.
- CharacterStage compatibility: silhouette center of mass stays stable across states, feet/hem baseline is consistent, gestures are small enough for idle/greet/listen/think/talk/alert/work motion without apparent popping.
- Approval isolation: all candidates remain in .artlab until coordinator review, QA boards, final upload-ready approval, and exact phrase approved for app.

## Canonical Outfits

- regular: core approved Otis lobby concierge look. Burgundy livery or vest-cardigan hybrid, soft Santa warmth, slight belly, brass accent kept quiet.
- summer-light: same Otis identity in a lighter seasonal treatment. Must not become resort staff, cruise host, or casual uncle.
- winter-layered: same Otis identity in layered seasonal treatment. Must not become literal Santa, holiday mascot, or coat-heavy blob.

## Canonical Poses

- idle: grounded threshold-keeper, calm hands, slight belly visible, ready but not theatrical.
- greeting: one small mobile-safe welcome gesture, no giant waving arm, palm/fingers clean.
- listening: attentive lean or hand position that reads as receiving the user, not eavesdropping.
- thinking: quiet consideration, ledger/keycard optional, no face obstruction.
- talking: warm overprepared explanation, mouth/hand expression clean at 96 px.
- alert: gentle "one moment" concierge urgency, not panic, anger, or security guard.
- working: ledger/keycard/front-desk action, hands and prop edges fully visible.

## GPT Image 2 Probe Order

Use the probe order in `gpt-image-2-probe-order.json`. Do not generate the full 21-pack until gates 1, 2, and 3 pass.

Minimum recommended batch:

1. regular/idle true-alpha source.
2. regular/greeting true-alpha source as hand/finger stress test.
3. regular/working true-alpha source as prop/crop stress test.
4. summer-light/idle outfit drift test.
5. winter-layered/idle outfit drift and Santa-caricature test.
6. regular/talking or regular/alert app-scale expression stress test, whichever was weakest in review.

Stop conditions:

- If probe 1 fails native source resolution or alpha, stop and switch source strategy.
- If probes 2 or 3 fail hand/prop crop, fix the prompt/source framing before continuing.
- If probes 4 or 5 drift identity or become costume caricature, do not generate seasonal variants until outfit locking is solved.

## Preflight Requirements

For every generated source:

- Run `npm run art:preflight -- <source-file> --minimum-long-edge 4096 --json`.
- If chroma is used, also run `npm run art:preflight -- <source-file> --minimum-long-edge 4096 --chroma-key 00ff00 --json`.
- Record image dimensions, alpha or chroma status, background flatness, crop notes, edge-halo notes, identity notes, and app-scale read notes.
- Generate or inspect dark, light, checkerboard, and lobby-warm previews before derivative creation.
- Create derivatives only after source preflight passes.
- Verify each derivative at default, @2x, and @3x dimensions and compare against the source frame.
- Verify CharacterStage states map cleanly:
  - idle -> idle
  - ready -> idle
  - returning -> idle
  - alert -> alert
  - greeting -> greeting
  - listening -> listening
  - thinking -> thinking
  - briefing -> talking
  - writing -> working
  - talking -> talking

## Hard Reject List

Reject immediately if any of these appear:

- Long edge below 4096 px.
- Short edge below 2300 px for a full-body Otis source.
- Any evidence of upscaled low-resolution source masquerading as 4K.
- Missing alpha when no perfectly removable flat background exists.
- Non-uniform chroma key, fuzzy off-white background, or painted backdrop fused to edges.
- Haloing visible on dark, light, checkerboard, or lobby-warm preview.
- Cropped hands, feet, elbows, ledger, keycard, bell, coat hem, or shadow.
- Extra fingers, fused fingers, melted hands, duplicated limbs, broken glasses/buttons, or text artifacts.
- Fake-perfect model face, stock hotel smile, luxury fashion editorial pose, mascot proportions, childlike cartooning, or literal Santa costume.
- Prop overload that weakens mobile silhouette or hides pose intent.
- Seasonal outfit changes that alter age, face shape, beard, belly, posture, or concierge identity.
- Pose gesture too wide for the 170 x 290 display frame or too subtle to read at 96 px.
- Filename, outfit slug, pose slug, derivative suffix, or manifest path does not match the canonical map.
- Source/contact sheet stored as final production proof without per-cell source preflight.
- Any file written to public/art or manifest updated before coordinator final approval.

## Promotion Blockers

This lane is intentionally blocked from promotion. Coordinator must resolve:

- No local source image files were generated by this lane.
- GPT Image 2 native 4K-class source output is still unproven for this run.
- Prior built-in probes failed on long-edge and alpha/chroma requirements.
- No source preflight, edge QA, derivative generation, app-scale preview, or CharacterStage browser check exists for final candidates yet.
- All 15 lanes must be complete and coordinated before final review.
- Final promotion requires coordinator QA and the exact phrase approved for app.

## Coordinator Recommendation

Promote the Technical Cleanroom contract as the production gate. Generate only the first three probes before any full pack work. If probe 1 fails the source-size or alpha contract again, stop image generation and choose a higher-resolution source strategy rather than relaxing the quality bar quietly.
