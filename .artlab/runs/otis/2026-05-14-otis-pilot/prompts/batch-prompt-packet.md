# Otis Vale Batch Art Run

runId: 2026-05-14-otis-pilot
characterId: otis
styleId: tower-flat-plus-depth-v1
assetVersion: otis-prototype-reference-v1
approvedIdentityRef: .artlab/characters/otis/outfits/otis_outfit-variants_v001_approved-board.png

## Approval Rules

- Human approval gate 1 is already satisfied by the approved identity reference.
- Do not ask Armaan for intermediate outfit, expression, or pose approvals.
- The next human approval is one final upload-ready board using the exact phrase "approved for app".
- Keep all outputs in .artlab until promotion.

## Required Batch Outputs

- Production packet: turnaround, expression sheet, outfit variant sheet.
- Pose sheets: one sheet each for regular, summer-light, winter-layered.
- Required poses on every outfit sheet: idle, greeting, listening, thinking, talking, alert, working.
- Every pose must preserve the approved identity reference, natural human imperfections, and tower-flat-plus-depth-v1.

## Source Batches

### production-packet
kind: production-packet
promptRef: art-bible:otis-pose-pack-v1
expectedArtifacts: turnaround, expression-sheet, outfit-variant-sheet

### pose-sheet-regular
kind: pose-sheet
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: regular
expectedArtifacts: regular/idle, regular/greeting, regular/listening, regular/thinking, regular/talking, regular/alert, regular/working

### pose-sheet-summer-light
kind: pose-sheet
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: summer-light
expectedArtifacts: summer-light/idle, summer-light/greeting, summer-light/listening, summer-light/thinking, summer-light/talking, summer-light/alert, summer-light/working

### pose-sheet-winter-layered
kind: pose-sheet
promptRef: art-bible:otis-pose-pack-v1
outfitVariant: winter-layered
expectedArtifacts: winter-layered/idle, winter-layered/greeting, winter-layered/listening, winter-layered/thinking, winter-layered/talking, winter-layered/alert, winter-layered/working
