# Otis Vale Batch Art Run

runId: otis-production-v1
characterId: otis
styleId: tower-flat-plus-depth-v1
assetVersion: otis-v1
approvedIdentityRef: .artlab/characters/otis/model/otis_winner-ref_v001.png

## Approval Rules

- Human approval gate 1 is already satisfied by the approved identity reference.
- Do not ask Armaan for intermediate outfit, expression, or pose approvals.
- The next human approval is one final upload-ready board using the exact phrase "approved for app".
- Keep all outputs in .artlab until promotion.

## Required Batch Outputs

- Production packet: turnaround, expression sheet, outfit variant sheet.
- Production-quality source sprites: one native high-resolution source per outfit/pose slot.
- Optional pose/contact sheets may be generated for visual review, but final ingest should use individual source sprites unless every split cell independently meets the native source contract.
- Required poses on every outfit sheet: idle, greeting, listening, thinking, talking, alert, working.
- Every pose must preserve the approved identity reference, natural human imperfections, and tower-flat-plus-depth-v1.

## Locked Otis Identity Notes

- Selected concept: `otis-initial-design-v4`, Lane 05, "Oddball Desk Mentor".
- Preserve glasses, silver/brown hair, full beard, kind eyes, warm oddball desk-mentor personality, burgundy vest/livery language, ivory shirt, deep navy tie/trousers, brass bell/key motif, brass trim/buttons, and human non-model proportions.
- Clean up concept-only artifacts during production: remove background desk, prop scribbles/readable pseudo-text, crop issues, and any non-production staging.
- Do not promote any output until the final upload-ready board receives the exact phrase `approved for app`.

## Source Batches

### production-packet
kind: production-packet
promptRef: art-bible:otis-pose-pack-v1
expectedArtifacts: turnaround, expression-sheet, outfit-variant-sheet

### sprite-regular-idle
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: regular
expectedArtifacts: regular/idle

### sprite-regular-greeting
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: regular
expectedArtifacts: regular/greeting

### sprite-regular-listening
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: regular
expectedArtifacts: regular/listening

### sprite-regular-thinking
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: regular
expectedArtifacts: regular/thinking

### sprite-regular-talking
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: regular
expectedArtifacts: regular/talking

### sprite-regular-alert
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: regular
expectedArtifacts: regular/alert

### sprite-regular-working
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: regular
expectedArtifacts: regular/working

### sprite-summer-light-idle
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: summer-light
expectedArtifacts: summer-light/idle

### sprite-summer-light-greeting
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: summer-light
expectedArtifacts: summer-light/greeting

### sprite-summer-light-listening
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: summer-light
expectedArtifacts: summer-light/listening

### sprite-summer-light-thinking
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: summer-light
expectedArtifacts: summer-light/thinking

### sprite-summer-light-talking
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: summer-light
expectedArtifacts: summer-light/talking

### sprite-summer-light-alert
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: summer-light
expectedArtifacts: summer-light/alert

### sprite-summer-light-working
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: summer-light
expectedArtifacts: summer-light/working

### sprite-winter-layered-idle
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: winter-layered
expectedArtifacts: winter-layered/idle

### sprite-winter-layered-greeting
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: winter-layered
expectedArtifacts: winter-layered/greeting

### sprite-winter-layered-listening
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: winter-layered
expectedArtifacts: winter-layered/listening

### sprite-winter-layered-thinking
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: winter-layered
expectedArtifacts: winter-layered/thinking

### sprite-winter-layered-talking
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: winter-layered
expectedArtifacts: winter-layered/talking

### sprite-winter-layered-alert
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: winter-layered
expectedArtifacts: winter-layered/alert

### sprite-winter-layered-working
kind: individual-sprite
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: winter-layered
expectedArtifacts: winter-layered/working
