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
   - Prefer `npm run art:studio -- --request "<Armaan's natural-language request>"`. The engine routes characters, backgrounds, screens, buttons, animations, props, scenes, icon systems, and marketing visuals into strict organized packets.
   - Parallel wave mode is the default for every creative packet: 5 agents x 3 waves = 15 lanes.
   - Only use `--no-parallel` for explicit single-thread diagnostics or when Armaan directly asks not to fan out.
   - Parallel mode creates a parent packet plus isolated lane prompts. Dispatch subagents only to individual lane prompts; do not let lane agents edit shared files.
   - Default subagent profile for lane work: GPT-5.5 fast mode, extra-high reasoning (`model: "gpt-5.5"`, `reasoning_effort: "xhigh"` when available).
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

## Parallel Wave Mode

Use this for every normal Creative Production Engine packet. The default is always 15x output unless the run is an explicit diagnostic.

1. The parent coordinator runs:
   `npm run art:studio -- --request "<request>"`
2. The command creates:
   - `parallel/parallel-plan.json`
   - `parallel/dispatcher-prompt.md`
   - `parallel/lanes/<wave-id-agent-id>/lane-brief.json`
   - `parallel/lanes/<wave-id-agent-id>/agent-prompt.md`
3. If `parallel-plan.json` says `awaiting-initial-approval`, do not launch the lanes until Armaan approves the initial direction.
4. Each subagent receives exactly one `agent-prompt.md` and should run GPT-5.5 fast mode with extra-high reasoning when the current client exposes it.
5. If a lane needs command setup, it runs:
   `npm run art:studio -- --mode lane --lane-brief <lane-brief.json>`
6. Lane agents may write only inside their own lane root.
7. Lane agents must not write `public/art`, update manifests, promote assets, run cleanup, delete approved assets, or edit the parent packet.
8. Before coordinator merge, validate each completed lane with:
   `npm run art:studio -- --mode validate-lane --lane-brief <lane-brief.json>`
9. The parent coordinator reads all validated lane `result.md` files, merges the best ideas, runs QA, asks for final approval, and promotes only after `approved for app`.
10. Volume cannot lower standards: every lane must keep the same source-quality, QA, naming, organization, and approval bar as a single-lane production packet.

## Non-negotiables

- Preserve approved Lobby backgrounds.
- Keep drafts in `.artlab`.
- Keep production manifest gated.
- Keep live `public/art` assets until a replacement passes QA, receives `approved for app`, and promotes through the manifest.
- In parallel mode, only the coordinator can mutate shared studio state, merge results, run cleanup, promote, or integrate the app.
- Do not hide quality warnings.
- Treat unknown flags, unsafe paths, corrupt state, and missing ledgers as engine failures to fix before continuing.
- If Armaan asks for a different kind of visual asset, do not force it into the character pipeline. Use adaptive request routing first, then improve the router if the result feels wrong.
- Use Superpowers brainstorming before new creative directions and Superpowers implementation skills when executing the approved plan.
