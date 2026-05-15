# wave-02-agent-05 Result

Parent run: 2026-05-14-otis-production-redo-v1  
Asset: Otis (character)  
Strategy: Dramatic Lighting  
Wave mandate: Stress The Brief

## Strongest Idea Or Output

Use **Brass Threshold Key Light** as the default production lighting family: warm brass key, ivory face hold, tiny deep navy internal separation, and restrained burgundy accent warmth. It is the strongest balance between dramatic lobby mood and app-scale sprite safety because it keeps Otis readable on the preserved brass/ivory/burgundy/deep navy lobby backgrounds without making him photorealistic, muddy, or haloed.

## What Is Meaningfully Different

This lane does not chase a darker, more cinematic Otis for its own sake. It stress-tests dramatic lighting against the practical failures most likely to break the final sprite pack: unreadable 128px face, red-muddy skin and beard, deep navy coat collapse, rim-light haloing, and lighting-driven identity drift away from the approved soft Santa concierge threshold keeper.

The useful synthesis is a lighting hierarchy, not a single mood board: Brass Threshold Key as the production default, Burgundy Lantern Side as a controlled stress probe, Deep Navy Back-Rim as the highest-risk probe, and Ivory Desk Glow as a pose-specific working/thinking treatment.

## Files Or Prompts Created

- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-05/outputs/gpt-image-2-dramatic-lighting-prompt-packet.md`
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-05/outputs/lighting-matrix.json`
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-05/outputs/qa-lighting-guard.md`
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-05/result.md`
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-05/result.json`

No image files were generated or inspected in this lane. I created concrete GPT Image 2 production probe prompts and QA rules because local generation into this lane root was not available in the current agent context.

## Quality Risks

- The parent rejection ledger still blocks production on native 4K-class source resolution and alpha/chroma requirements; better lighting prompts do not remove that blocker.
- Dramatic rim lighting can create edge haloing after transparency extraction, especially with deep navy back-rim prompts.
- Burgundy bounce can make Otis look red-muddy at mobile scale if it touches the face or beard too strongly.
- Deep navy mood can make the coat collapse into the UI unless the face hold and internal silhouette separation are enforced.
- A single successful dramatic pose may not generalize across the required three outfits and seven poses per outfit.

## Promotion Blockers

- No generated source images from this lane.
- No preflight pass from this lane.
- Existing production path remains blocked until generated sources satisfy the long-edge, alpha/chroma, crop, and derivative requirements.
- Coordinator must verify the chosen lighting recipe on flat ivory, brass, burgundy, and deep navy backgrounds before any final approval request.

## Housekeeping Notes

- Kept: prompt packet, lighting matrix, QA guard, result files.
- Deleted or archived: none.
- Loose files: none observed under this lane output root.
- Scope: all writes stayed inside `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-05`.

## Continuous-Improvement Notes

- Slow step: lane agents need an explicit local image-output mechanism if they are expected to produce actual binaries rather than prompt packets.
- Error or confusion: the Creative Production Engine skill says to run `npm run art:studio`, but this isolated lane prompt forbids parent/shared mutations; I treated the lane prompt as the controlling scope and did not run coordinator-level studio actions.
- Engine improvement recommended: add a lane-safe `generate-probe` command that writes images and preflight JSON directly to a lane output root, then validates lighting against the four lobby swatches automatically.

Coordinator reminder: this lane cannot approve, promote, edit public/art, edit manifests, delete live assets, or integrate the app.
