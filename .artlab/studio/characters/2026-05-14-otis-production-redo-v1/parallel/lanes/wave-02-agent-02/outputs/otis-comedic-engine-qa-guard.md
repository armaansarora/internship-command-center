# Otis Comedic Engine QA Guard

Lane: wave-02-agent-02
Parent run: 2026-05-14-otis-production-redo-v1
Artifact type: prompt QA and promotion blocker guard
Approval state: draft lane output, not promoted

## Pass Definition

Otis passes this lane only if the viewer reads him as a premium older Tower concierge first and a gently funny human second. The comedy should feel like lived-in timing: he is overprepared, patient, and warmly self-aware. It must not feel like a gag, a mascot, a children's character, a holiday character, or a fake-perfect AI model.

## Hard Rejects

- Broad open-mouth laugh, wink, tongue, exaggerated eyebrow, meme face, shrug gag, or cartoon confusion.
- Santa costume, Christmas-coded red suit, fantasy innkeeper, wizard, clown, toy, chibi, or corporate mascot.
- Sarcastic, smug, judgmental, scolding, panicked, or incompetent expression.
- Body made too thin, too young, too glossy, too symmetrical, too muscular, or fashion-model perfect.
- Slight belly hidden by a prop, arm, jacket shape, or aggressive crop.
- Hands cropped, merged into beard, fused with ledger, or showing extra fingers.
- Background, labels, logo, text, halo, glow edge, or low-resolution contact-sheet source used as production source.

## Comedy-Specific Scoring

Score each generated probe from 0 to 3.

### Warmth Before Humor

- 0: User would not trust him.
- 1: Warmth present but comedy distracts.
- 2: Warm and lightly funny.
- 3: Ideal balance: trust first, humor second.

### Adult Premium Tone

- 0: Childish, mascot-like, or novelty character.
- 1: Some premium materials, but expression is too broad.
- 2: Mostly premium, one minor risk.
- 3: Fully adult Tower tone.

### Micro-Behavior Read

- 0: No behavioral idea.
- 1: Funny idea exists but is vague or prop-dependent.
- 2: Clear overprepared threshold-keeper timing.
- 3: Clear at mobile size without needing a caption.

### Identity Continuity

- 0: No longer Otis.
- 1: Face or body drift is concerning.
- 2: Recognizable with small drift.
- 3: Strong approved Otis identity.

Reject anything below 10 total or any individual 0.

## Mobile Read Check

At 96 to 160 px tall, the pose should still read as one of the seven app states. If the only readable element is a joke expression or prop, reject it. The silhouette must still show Otis's sturdy stance, slight belly, beard mass, relaxed shoulders, and useful hands.

## Stress-The-Brief Findings

- The approved "soft Santa concierge" identity is strong, but humor can easily pull it into holiday mascot territory. Use "Santa-adjacent warmth" only in the identity lock, never as a costume instruction.
- "Funny" is too dangerous as a direct image prompt word. Prefer "warmly self-aware," "one beat early," "gently overprepared," and "private smile."
- Props are not the comedic engine. They can support the beat only when small, hand-safe, and secondary.
- Expression sheets are useful for choosing the comedy dial, but they must not be split into production sprites unless resolution, crop, and identity pass preflight.
- If a full-body probe cannot preserve belly visibility and hands while adding expression, drop the comedy and preserve Otis.

## First-Probe QA Order

1. Generate the restrained amusement expression review sheet.
2. Generate Outfit A greeting with one-beat-early warmth.
3. Generate Outfit C working with private ledger smile.
4. Run source preflight on every generated full-body source before continuing.
5. Review at mobile scale before expanding to all three outfits and seven poses.

## Promotion Blockers

- This lane produced prompt and QA artifacts only; it is not production art.
- No native 4K transparent source files were generated here.
- No source preflight, alpha check, derivative generation, contact sheet, or app-scale preview was performed here.
- Final public/art promotion remains locked to the coordinator pipeline and the exact approval phrase.
