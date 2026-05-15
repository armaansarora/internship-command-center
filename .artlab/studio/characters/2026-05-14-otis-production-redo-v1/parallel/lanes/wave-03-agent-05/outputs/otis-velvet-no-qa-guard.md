# Otis Velvet No QA Guard

Lane: wave-03-agent-05
Artifact type: ship-ready filter
Approval state: exploratory lane artifact only; not approved for app.

## Keep/Cut Decision

Keep one generation probe. Cut the broader direction.

The keeper is not "Otis gets stricter." The keeper is "Otis can politely say not yet." That gives The Tower a warmer visual language for locked floors, permissions, OAuth setup, and unavailable states. Anything more authoritarian should be rejected.

## Visual QA

- Full-body source must be native 4096 px or larger before derivatives.
- Transparent or cleanly separable background only; no lobby backdrop baked into the sprite.
- Safe padding must protect hair, raised hand, ledger/keycard, coat hem, and shoes.
- No cropped hands, cropped feet, extra fingers, fused props, haloing, glow, fake text, watermark, or background residue.
- The silhouette must read at 96 px and 64 px tall without the pause hand becoming a blob.
- Slight belly and relaxed shoulders must remain visible; do not flatten him into a narrow formal doorman.
- Materials stay matte and premium: burgundy, charcoal, ivory, restrained brass, no glossy 3D plastic.

## Tone QA

- Pass: warm, apologetic, prepared, slightly comedic, over-responsible, human.
- Pass: "I already checked the ledger and I can help."
- Fail: "You cannot come in."
- Fail: bouncer, police, suspicious guard, angry gatekeeper, scolding parent, villain, mascot Santa, stock hotel worker.
- Fail: crossed arms, pointed finger, hard stop sign palm, sunglasses, security badge, velvet rope, exaggerated frown.

## Product QA

- Must fit the existing required pose set as an alternate `alert` candidate.
- Must not require separate scene props or custom runtime collision.
- Motion should work as a CharacterStage-compatible idle: slight breath, tiny ledger/keycard settle, optional brief hand lift.
- Reduced motion state should freeze cleanly in the same pose.
- Must not occlude primary mobile UI if staged at existing Otis sprite sizes.

## Ship Recommendation

Use this as a final probe because The Tower needs a visual answer for "not yet" states. Do not ship it if it damages Otis's kindness. The fallback is to cut this lane entirely and keep the safer threshold-keeper pose language already synthesized from waves 1 and 2.
