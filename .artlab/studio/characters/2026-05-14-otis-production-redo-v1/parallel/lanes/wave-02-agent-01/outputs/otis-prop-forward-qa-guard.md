# Otis Prop Forward QA Guard

Lane: `wave-02-agent-01`  
Scope: prop-forward stress test for Otis production probes.

## Core Pass Criteria

- Identity remains approved Otis first: warm older soft Santa concierge, lived-in human imperfections, slight belly, kind tired eyes, natural asymmetry.
- One active prop maximum per sprite.
- Props support pose intent:
  - idle: passive keycard cue only
  - greeting: keycard
  - listening: ledger
  - thinking: ledger tucked
  - talking: keycard
  - alert: bell on ledge
  - working: tablet folio
- At 64 px tall, the active prop reads as one simple shape and does not compete with the face.
- At 128 px tall, hand anatomy around the prop still looks plausible.
- Props do not hide the slight belly, crop the hands, or widen the silhouette enough to weaken mobile use.

## Hand-Anatomy Guard

Reject or regenerate if any of these appear:

- Fingers wrap around the brass bell dome or plunger.
- Thumb and index finger fuse into the keycard edge.
- Keycard is attached to keys, lanyards, chains, or a badge cluster.
- Ledger requires both hands to cross unnaturally over the spine.
- Tablet creates typing hands, tiny stylus grips, or extra fingers.
- Any prop floats without visible support or contact.

## Prop Clutter Guard

Reject or simplify if:

- More than two prop families are visible.
- Bell, keycard, ledger, and tablet appear together.
- The tablet screen contains readable UI, charts, or tiny text.
- Ledger pages contain readable handwriting.
- Brass becomes shiny gold or visually louder than Otis's face.
- Pockets fill with extra cards, pens, pins, keys, or tags.

## Sprite Production Guard

Every generated source must prove:

- Native high-resolution source, preferably 4096 px long edge or better.
- Full body with complete hands, feet, and prop edges.
- 10-14 percent safe padding.
- Transparent background or clean flat background suitable for extraction.
- No haloing, cutout fuzz, or muddy edge pixels.
- App-scale preview on light and dark backgrounds.
- Outfit variants preserve the same prop grammar instead of inventing new object sets.

## Stress Recommendation

The bell is the strongest story prop but also the highest anatomy risk. Do not approve any handheld bell pose until a ledge-supported bell has been tested first. The keycard is the safest recurring prop if it stays flat and isolated. The ledger is the best warmth prop if it stays side-cradled and does not flatten the belly. The tablet should be a folio, not a glowing interface.

## Promotion Blockers For This Lane

- No image files were generated in this lane.
- No preflight was run on source images.
- No alpha extraction, derivatives, contact-sheet split, or app-scale preview exists yet.
- Coordinator must generate and QA sources before final approval or promotion.
