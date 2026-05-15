# Otis Editorial Premium QA Guard

Lane: wave-03-agent-04  
Scope: ship-ready filter for coordinator generation probes.

## Pass Criteria

- Source is native high resolution: long edge at least 4096 px before derivatives.
- Sprite is individual full-body Otis, not a pose sheet or cropped sheet cell.
- Alpha is true transparent RGBA, or the temporary extraction background is perfectly flat and documented.
- Hands, shoes, beard, belly, ledger/keycard/keys, and gesture all have safe padding.
- Otis still reads at 64, 96, 144, 192, and 256 CSS px tall.
- Regular, formal, and working outfits preserve the same face, glasses, beard, belly, shoulder slope, and older-hand anatomy.
- Props are restrained: one useful prop maximum, no decorative clutter.
- Lighting works on the Lobby stage: warm, dimensional, not background-dependent.

## Immediate Rejects

- Long edge below 4096 px.
- Missing alpha with no perfectly flat extraction background.
- Any cropped fingers, feet, keys, ledger, beard, or belly silhouette.
- Santa costume, fantasy innkeeper, mascot, superhero, childish cartoon, or glossy AI model drift.
- Overdecorated brass or costume trim that overwhelms the silhouette.
- Pose that cannot fit CharacterStage motion states without covering UI or reading as a large gesture on mobile.
- Identity drift between pilot images.

## First Probe Decision Rule

Do not generate the full 21-sprite set until the identity reference, regular idle, and regular greeting probes pass preflight together. If any one fails source size or alpha, stop generation and solve source strategy before producing more images.

## Promotion Block

This lane created prompt/spec artifacts only. It does not contain approved source art, preflighted transparent sprites, derivatives, review-board evidence, or app-scale CharacterStage proof. Promotion remains blocked until the parent coordinator generates sources, validates them, and receives the exact final approval phrase.
