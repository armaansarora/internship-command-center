# App-Scale Material QA Notes

Lane: wave-01-agent-05  
Artifact type: QA companion for prompt packet  
Approval state: exploratory lane artifact, not approved for app

## Purpose

This checklist exists to keep the Material Simplifier direction honest after generation. It should catch the two likely failures: visual noise creeping back into the outfit, and the generator making Otis too polished or synthetic.

## Pass Criteria

- Full body is present with hands, feet, and any prop fully visible.
- Transparent or neutral background can be isolated cleanly without haloing.
- Otis reads clearly at 64 px, 128 px, and 256 px preview heights.
- Materials read as broad matte fabric blocks, not dense texture.
- Brass accents are small, aged, low-reflection, and limited to two or three.
- Beard, belly, shoulders, and face remain naturally imperfect.
- No copied celebrity likeness, no fashion-model finish, no mascot proportions.
- Outfit variants look like the same person wearing related uniforms.
- Each pose has a distinct read without changing Otis' identity.

## Fail Conditions

- Brocade, ropes, medals, dense trim, or excessive buttons dominate the sprite.
- Port red turns into bright holiday red or Santa costume language.
- Brass turns into shiny gold chrome.
- Skin, eyes, beard, or clothing look waxy, plastic, or over-smoothed.
- Silhouette collapses at 64 px because details are too thin or busy.
- Pose props crop fingers, hide hands, or create fused-object artifacts.
- Generator adds text, badges with readable fake lettering, logos, or watermarks.

## Suggested Coordinator Test

Generate Variant A idle and greeting first. Downscale each to 64 px, 128 px, and 256 px height on both light and dark Tower backgrounds. If the 64 px version still reads as Otis and the 128 px version keeps the pose clear, continue to the remaining poses. If not, simplify materials again before producing the full outfit and pose matrix.

## Promotion Blockers For This Lane

- No actual GPT Image 2 image files were generated in this lane.
- No alpha preflight, derivative generation, contact sheet, or browser/app-scale preview was performed.
- This packet should be used as generation direction only until coordinator production QA passes.
