# Otis Mobile QA Guard

Lane: wave-02-agent-03  
Parent run: 2026-05-14-otis-production-redo-v1  
Status: acceptance guard, not approved for app

## Hard Fails

Reject the candidate immediately if any of these are true:

- Otis reads as Santa Claus first and concierge second.
- Otis reads as a generic AI-perfect character with no lived-in human imperfection.
- The slight belly disappears, becomes a caricature, or creates a crop problem.
- Hands, feet, beard, coat hem, prop, glow, or shadow are cropped.
- Any text, logo, label, watermark, or background fragment appears in the source.
- Greeting, listening, thinking, talking, and alert cannot be distinguished at 160 CSS px.
- A raised hand or prop collides with the mobile text safe band.
- Contact sheet cells are treated as production sprites without independent source preflight.
- Alpha halo is visible on either a dark Tower surface or a light Tower surface.

## Scoring Rubric

Score each category 0 to 3. A promotable candidate needs 21 of 24 with no hard fails.

| Category | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- |
| Silhouette | Distinct beard, belly, stance, outfit block at 96 px | Reads at 144 px but weak at 96 px | Reads only at 192 px | Generic or muddy |
| Expression | Four key expressions read at 144 px | Three read clearly | Only smile/neutral read | Expression requires text |
| Gesture | Pose intent reads from macro body language | Mostly readable with one weak state | Depends on small details | Poses collapse together |
| Crop | 18% to 22% padding, no edge danger | Minor padding inconsistency | One near-edge risk | Any crop or clipped effect |
| Text Safety | Face, hand, prop clear all text bands | One large-phone-only concern | Needs per-pose layout hacks | Crosses compact-phone text |
| Identity | Soft Santa concierge threshold keeper | Identity mostly intact | Too Santa or too generic | Wrong character |
| Material | Premium, clean, simplified game sprite | Good but slightly noisy | Detail mush at mobile | Flat, muddy, or photoreal |
| Outfit Consistency | All variants preserve body and face | Minor drift | One variant looks like another person | Variants break identity |

## Stress Prompts For Rework

Use these as targeted re-prompt clauses when a candidate fails:

- Silhouette too thin: "Broaden Otis's waistcoat block and stance, preserve a slight rounded belly, simplify the outline into readable large shapes."
- Too Santa: "Remove Christmas costume signals; keep only warm white beard and soft presence, return to premium concierge tailoring."
- Expression muddy: "Increase brow, eye, and mouth shape clarity while keeping the face human and not cartoonish."
- Gesture too small: "Make the arm line and hand block broader; do not rely on individual fingers or tiny props."
- Prop collision: "Move the prop to waist height and keep it compact; no object above shoulder line."
- Crop risk: "Recenter the entire full body with 20% transparent padding, all shoes, hands, beard, props, and coat hems fully visible."
- Material noise: "Simplify fabric patterns and trim; keep broad value groups and clean edge lighting."
- Identity drift across outfits: "Reuse the same face, beard volume, belly, posture, and hand proportions; change clothing only."

## Promotion Blockers For Coordinator

- This lane created prompt and QA artifacts only; no actual GPT Image 2 source image files were generated locally.
- The first generated image set must be run through the mobile preview spec before any style preference ranking.
- The coordinator should reject beautiful high-detail candidates that fail scale rungs, text safety, or crop checks.
- The production packet needs a deterministic preview board with source-edge danger guides and mobile text bands.

## Recommendation

Promote the Mobile First Read gate into the coordinator's acceptance checklist before image generation continues. It will prevent late-stage failures where Otis looks strong on a desktop contact sheet but breaks the actual Lobby composition.

