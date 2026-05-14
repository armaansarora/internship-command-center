---
name: creative-production-engine
description: Use when Armaan asks to use the Creative Production Engine, continue image generation, add Tower art, add animation, create assets, generate visuals, improve art pipeline, or make a floor/scene/character/prop feel more immersive.
---

# Creative Production Engine

## Trigger phrases

Use this skill when the user says any close variant of:

- use the creative production engine
- continue generating images
- add Tower art
- make this more immersive
- create an animation
- generate a character, environment, prop, scene, texture, or visual
- build the image pipeline further

## Required workflow

1. Run `npm run art:studio`.
2. Explain the current state in plain language:
   - what has been done
   - what is recommended now
   - what remains
3. brainstorm first. Ask what Armaan wants to add today and gather the creative brief.
4. Present 2-3 approaches with a recommendation.
5. Create concept options or a concept prompt packet.
   - Once the brief is known, use `npm run art:studio -- --asset-type <type> --name "<asset name>" --brief "<brief>" --run-id <safe-run-id>` to create the strict packet.
6. Wait for the initial direction approval.
7. Build the strict production packet.
8. Execute generation, ingest, QA, review board, promotion, and app integration through scripts.
9. Promote only after the exact phrase `approved for app`.
10. Run the Housekeeping Gate.
    - Use `npm run art:clean` for volatile old character-run binaries when replacing approved art.
11. Run the Continuous Improvement Gate.
12. Recommend the next best action.

## Housekeeping Gate

Every phase must inventory created files, mark what is kept, archive or delete loose junk, update ledgers, and confirm no unapproved asset entered `public/art`.

## Continuous Improvement Gate

Every phase must record slow steps, manual steps, errors, quality failures, confusion, and rewrite-level concerns. Repeated manual friction or high-severity failures require improving the engine before continuing.

## Non-negotiables

- Preserve approved Lobby backgrounds.
- Keep drafts in `.artlab`.
- Keep production manifest gated.
- Keep live `public/art` assets until a replacement passes QA, receives `approved for app`, and promotes through the manifest.
- Do not hide quality warnings.
- Treat unknown flags, unsafe paths, corrupt state, and missing ledgers as engine failures to fix before continuing.
- Use Superpowers brainstorming before new creative directions and Superpowers implementation skills when executing the approved plan.
