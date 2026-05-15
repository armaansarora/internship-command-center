# Otis Mobile Preview Spec

Lane: wave-02-agent-03  
Parent run: 2026-05-14-otis-production-redo-v1  
Status: QA preview spec, not approved for app

## Preview Goal

Every Otis sprite must be judged at the scale where Lobby users will actually meet him. A sprite that looks rich on a contact sheet but fails at 96 to 192 CSS px should not move forward.

## Required Viewports

Preview each candidate on:

- 360 x 740 CSS px, compact Android
- 375 x 812 CSS px, small iPhone
- 390 x 844 CSS px, common iPhone
- 430 x 932 CSS px, large iPhone
- 768 x 1024 CSS px, tablet portrait sanity check

Use DPR 2 and DPR 3 captures when possible. Test both dark and light Tower surfaces because alpha halos often hide on only one.

## Scale Rungs

Render the same source at these displayed heights:

- 64 CSS px: icon-level read. Otis should still have a distinct beard-and-belly concierge silhouette.
- 96 CSS px: mobile thumbnail read. He must not collapse into a generic suited elder.
- 144 CSS px: default compact Lobby read. Greeting/listening/thinking/alert expressions should be distinguishable.
- 192 CSS px: main Lobby character read. Gestures and props must be clear without covering the face.
- 256 CSS px: expanded state. Materials may show richer detail, but the source cannot rely on this scale to communicate identity.

## Default Mobile Placement

Use these placements for preview boards:

- Bottom center: sprite bottom aligned 24 CSS px above the bottom safe area, center x at 50%.
- Bottom right: sprite bottom aligned 24 CSS px above the bottom safe area, center x at 70%.
- Compact sheet: sprite height 144 CSS px, center x at 50%, bottom aligned 18 CSS px above bottom safe area.

The safe text band should be visualized as:

- Compact phones: x 24 to viewport width minus 24, y 96 to 292.
- Large phones: x 28 to viewport width minus 28, y 112 to 324.
- Tablet portrait: x 48 to 520, y 128 to 356.

No face, raised hand, prop, or major contrast edge should sit inside the text band when Otis is in bottom-center or bottom-right placement. Low torso overlap with an empty lower composition band is acceptable only if it does not touch text.

## Crop And Padding Checks

Source-level acceptance:

- Transparent padding target: 18% to 22% on every side.
- Hard fail: any hand, foot, beard edge, shoe, prop, or coat hem within 8% of a source edge.
- Hard fail: contact shadow, glow, or rim light clipped by source bounds.
- Hard fail: any generated background fragment or non-transparent debris.
- Hard fail: source frame differs wildly between poses in a way that causes layout jumping.

Runtime preview acceptance:

- Bottom placement cannot crop shoes at 360 x 740.
- Raised hand and compact props must remain outside the mobile text band.
- Sprite should not require responsive per-pose anchor hacks to avoid text.
- Bounding boxes for all seven poses should be close enough that switching states feels stable.

## Readability Transforms

For each candidate, create review crops or screenshots with:

- Normal color
- Grayscale
- 50% size reduction then re-upscale
- 0.8 px blur
- High-contrast dark background
- Warm light background
- Text-band overlay rectangle
- Source-edge 8% danger guides

If Otis only passes in normal color at large size, reject or re-prompt.

## Pass Criteria

Silhouette:

- Pass: beard, slight belly, sturdy legs, waistcoat or coat block, and one hand shape separate at 96 CSS px.
- Fail: the sprite reads as a generic old man, waiter, Santa costume, or shapeless vertical blob.

Expression:

- Pass: greeting, listening, thinking, and alert can be identified at 144 CSS px with no labels.
- Fail: the only readable difference is mouth detail too small for mobile.

Gesture:

- Pass: gesture intent is readable from arm line, hand block, head tilt, and stance at 160 to 192 CSS px.
- Fail: gesture depends on fingers, tiny props, eyebrow pixels, or captions.

Text overlap:

- Pass: face, raised hand, and prop stay clear of the safe text band in bottom-center and bottom-right placements.
- Fail: any primary gesture crosses headline/body copy zones on 360 x 740 or 375 x 812.

Crop:

- Pass: every source has consistent padding and no important pixel near the edge.
- Fail: any cropped shoe, hand, prop, beard, rim light, or alpha debris.

