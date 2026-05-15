# Otis Motion Production QA Guard

Lane: wave-02-agent-04
Scope: QA checks for GPT Image 2 production probes and later CharacterStage integration.

## Hard Stop Gates

Reject a probe as production source if any item is true:

- Native long edge is below 4096px.
- Source is upscaled to reach 4096px.
- Source lacks true alpha transparency.
- Hair, hands, feet, belly, keycard ring, bell, ledger, or clothing edges touch or cross the frame edge.
- Green/chroma background is used as the only transparency plan.
- Any text, signature, logo, watermark, fake UI, or readable ledger writing appears.
- Otis loses the approved threshold-keeper identity: warm older human face, soft Santa concierge warmth, slight belly, natural imperfection, burgundy/brass lobby read.
- Pose becomes mascot, stock hotel greeter, CEO/Mara palette, Rafe kinetic pressure, fantasy gatekeeper, Santa costume, bowtie caricature, or photoreal actor render.

## CharacterStage Fit Checks

Run these checks before a sprite can be recommended to the coordinator:

1. Frame check: place each pose in the Otis display frame, 170x290, with object-fit contain. It must remain readable without increasing the frame.
2. Motion check: preview with CharacterStage state mapping:
   - `idle`, `ready`, `returning` use `idle`.
   - `greeting` uses `greeting`.
   - `listening` uses `listening`.
   - `thinking` uses `thinking`.
   - `talking` and `briefing` use `talking`.
   - `alert` uses `alert`.
   - `writing` uses `working`.
3. Reduced-motion check: set reduced motion on. The frozen still must still communicate the intended state.
4. Baseline check: feet baseline and eye height should not jump across poses unless the pose definition truly requires it.
5. Mobile blur check: view at 170x290 and at a small mobile width. Burgundy torso, brass accent, face warmth, and state gesture must survive.
6. Background check: verify on dark lobby, light QA background, and transparent checkerboard for halos.

## State-Specific Failure Modes

`idle`

- Fails if it reads passive, sleepy, or generic.
- Fails if the belly is removed or body becomes too perfect.

`greeting`

- Fails if the static pose is already a deep bow.
- Fails if runtime nod would make him look submissive or silly.

`listening`

- Fails if the illustrated lean plus runtime lean risks crop or anxiety.
- Fails if the face is no longer visible at app scale.

`thinking`

- Fails if the hand covers the face.
- Fails if the expression reads confused or annoyed.

`talking`

- Fails if mouth shape is theatrical, lip-sync-like, or rubbery under pulse.
- Fails if the hand gesture becomes too wide for the frame.

`alert`

- Fails if the pose becomes a lunge, panic, security guard command, or Rafe-style urgency.
- Fails if raised hand or prop is cropped.

`working`

- Fails if ledger or prop hides the torso.
- Fails if any fake written content appears.

## Promotion Blockers This Lane Cannot Clear

- This lane did not generate image files and did not run image preflight.
- The known production blocker remains: earlier generated sources were below the native 4K contract and failed alpha/chroma expectations.
- Coordinator must require at least one native 4K true-alpha individual sprite probe to pass before the full 21-slot Otis pack is generated.
- Final promotion still requires approval, staged derivatives, dark/light QA, app-scale preview, and the exact phrase `approved for app`.

