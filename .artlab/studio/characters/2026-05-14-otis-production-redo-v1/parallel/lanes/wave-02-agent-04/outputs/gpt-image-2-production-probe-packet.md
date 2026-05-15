# Otis GPT Image 2 Production Probe Packet

Lane: wave-02-agent-04
Parent run: 2026-05-14-otis-production-redo-v1
Asset: Otis Vale, Lobby Concierge
Purpose: production prompt probes for motion-ready static sprites before the full 21-slot pack.

## Recommendation

Do not ask GPT Image 2 for a full seven-pose contact sheet as production source. Prior probes failed the native 4K and alpha/chroma requirements. Use this packet as individual high-resolution sprite probes first, then continue only if the output is native transparent PNG with a long edge of at least 4096px and stable Otis identity.

The first probe sequence should be:

1. `regular/idle` to prove identity, silhouette, belly, and padding.
2. `regular/listening` to test the most motion-sensitive lean.
3. `regular/talking` to test face/mouth expressiveness without lip-sync caricature.
4. `regular/alert` to test emphasis without panic or Rafe-like kinetic energy.
5. `winter-layered/working` to test outfit bulk and prop containment.
6. `summer-light/greeting` to test warm identity without losing premium formality.

If all six pass preflight and app-scale QA, extend the same templates to the remaining outfit and pose slots.

## Locked Identity Anchor

Use this identity anchor in every prompt:

```text
Otis Vale, the Lobby Concierge of The Tower, a premium adult web-game character in tower-flat-plus-depth-v1 style. Approved direction: soft Santa concierge identity without costume parody, tall calm vertical silhouette, warm older human face, quiet knowing eyes, slight belly, natural asymmetry, lived-in imperfections, soft shoulders, grounded hands, burgundy livery or vest-cardigan hybrid with brass detail, ivory shirt, deep navy shadow notes, brass keycard ring and small reception prop. He feels like the threshold keeper of the building: received, observant, unhurried, gently protective, never mascot-like.
```

## Global Production Constraints

Use these constraints in every prompt:

```text
Full-body isolated production sprite, transparent background with true alpha, no scene background, no floor shadow outside the character alpha, no text, no logo, no watermark. Native high-resolution source with long edge at least 4096px, target frame 2400x4096 portrait, character centered, full hair, hands, props, belly, and feet visible, safe padding around all edges. Keep feet baseline and body scale consistent across the pose pack. Clean premium game-sprite materials, flat readable shapes with subtle controlled depth, crisp edges, no photoreal render, no generic hotel stock-photo smile, no childish mascot proportions, no bowtie caricature, no CEO gold palette, no superhero, no fantasy gatekeeper.
```

## Outfit Deltas

`regular`

```text
Regular outfit: burgundy concierge livery or vest-cardigan hybrid, ivory shirt, deep navy tailored trousers, small brass keycard ring, practical polished shoes, slight belly still visible through soft tailoring. This is the canonical lobby desk look.
```

`summer-light`

```text
Summer-light outfit: the same Otis identity and concierge uniform language, lighter breathable burgundy vest-cardigan, rolled or lighter sleeves, ivory fabric, fewer layers, brass keycard ring retained. Do not make him casual, beachy, or younger.
```

`winter-layered`

```text
Winter-layered outfit: the same Otis identity and concierge uniform language, warm burgundy outer layer or cardigan-coat, scarf or heavier ivory layer used with restraint, brass keycard ring retained, bulk reads cozy and human but does not hide the slight belly or hands.
```

## Pose Prompt Templates

### idle

```text
Create Otis Vale in the {outfitVariant} outfit as a full-body transparent production sprite. Pose: idle breathing base. He stands front 3/4, feet planted, shoulders soft, slight belly visible, one hand resting near the keycard ring or ledger, the other relaxed near his side. Expression warm, observant, ready to receive the user. This pose must work with a subtle vertical breathing transform, so keep the center of mass stable and the head neutral. Use the locked identity anchor and global production constraints.
```

Motion note: the runtime adds a 6s soft breathe. The sprite should not already be leaning, bowing, or gesturing.

### greeting

```text
Create Otis Vale in the {outfitVariant} outfit as a full-body transparent production sprite. Pose: greeting nod setup. He stands front 3/4 with a small welcoming hand opening near the desk line, chin only slightly inclined, expression warm and recognizing, as if he has been expecting the user. Keep both feet grounded and all hands visible. This pose must work with a runtime nod, so avoid a deep bow or large arm sweep. Use the locked identity anchor and global production constraints.
```

Motion note: the runtime adds a 0.9s gentle nod. The image should be the polite start/end pose, not the deepest nod frame.

### listening

```text
Create Otis Vale in the {outfitVariant} outfit as a full-body transparent production sprite. Pose: listening lean. He is attentive with a slight forward-and-side openness, head subtly angled toward the user, one hand near a small ledger or keycard ring, mouth closed, eyes kind and focused. Keep the lean modest; he should feel receptive, not hunched or anxious. Keep silhouette narrow enough for mobile and centered enough that runtime lean will not crop him. Use the locked identity anchor and global production constraints.
```

Motion note: the runtime adds a tiny 0.75px side lean and -2px lift. Leave extra horizontal padding around shoulders, hands, and props.

### thinking

```text
Create Otis Vale in the {outfitVariant} outfit as a full-body transparent production sprite. Pose: thinking pause. He stands still with one hand lightly touching the ledger edge, keycard ring, or chin-adjacent gesture without covering the face. His brows are gentle, not confused; he looks like he is weighing how to say the helpful thing carefully. Keep posture vertical, belly and warm face readable, props close to body. Use the locked identity anchor and global production constraints.
```

Motion note: the runtime uses a shorter breathing loop. The pose should read as a pause even when motion is disabled.

### talking

```text
Create Otis Vale in the {outfitVariant} outfit as a full-body transparent production sprite. Pose: talking pulse. He addresses the user with a small open-mouth speaking expression, one hand raised in a restrained concierge explanation gesture, the other grounded near the keycard ring or ledger. He is warm and exact, not theatrical. Mouth and hand should read at 170x290 without becoming cartoonish. Use the locked identity anchor and global production constraints.
```

Motion note: V1 is not lip sync. Runtime adds a subtle pulse; do not create multiple mouth frames or exaggerated speech shapes.

### alert

```text
Create Otis Vale in the {outfitVariant} outfit as a full-body transparent production sprite. Pose: alert emphasis. He notices something important and gently blocks the threshold: posture still kind but firmer, one hand slightly lifted in a calm wait gesture, eyes sharpened, mouth closed or about to speak. He remains Otis, not a security guard, not panicked, not war-room kinetic. Keep the brass detail and slight belly visible. Use the locked identity anchor and global production constraints.
```

Motion note: runtime adds a small emphasis bump. The image should carry the alert through face and hand, not through a big lunge.

### working

```text
Create Otis Vale in the {outfitVariant} outfit as a full-body transparent production sprite. Pose: working focus. He is calmly handling the guest ledger, keycard ring, or small brass bell at desk height while staying full-body and unobscured. Expression focused but hospitable. Hands must be visible, prop must be close to torso, no fake writing or readable text. Keep the silhouette stable and premium at mobile size. Use the locked identity anchor and global production constraints.
```

Motion note: runtime uses a short calm breathe. The prop should not extend outside the safe frame.

## Negative Prompt

```text
Do not create a mascot, caricature Santa, bowtie hotel cartoon, celebrity likeness, named fictional likeness, photoreal actor render, generic stock hotel greeter, CEO gold palette, superhero costume, fantasy robe, sci-fi armor, glowing eyes, unreadable text, signage, logo, watermark, extra hands, cropped hands, cropped feet, chopped props, strong cast shadow, colored background, green-screen spill, haloing, fake UI, random luggage, cane, weapon, or desk that hides the body.
```

## Probe Acceptance Bar

Each generated probe must pass:

- long edge at least 4096px without upscaling
- true alpha transparency, or reject as production source
- full body and prop visibility with no edge contact
- identity match to threshold-keeper Otis across face, belly, shoulders, and wardrobe
- 170x290 app-scale readability
- reduced-motion readability: the still image alone communicates its state

