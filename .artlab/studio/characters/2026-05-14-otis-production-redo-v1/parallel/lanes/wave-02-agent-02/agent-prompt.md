# Creative Production Engine Lane: wave-02-agent-02

You are one parallel lane for The Tower Creative Production Engine.

Parent run: 2026-05-14-otis-production-redo-v1
Asset: Otis (character)
Brief: Redo Otis Vale from scratch through the production pipeline using the same approved soft Santa concierge design, preserving his lived-in human warmth, slight belly, natural imperfections, three outfit variants, seven required poses per outfit, native high-resolution source expectations, staged QA boards, and no public/art promotion until final approval.
Required subagent profile: GPT-5.5 fast mode, extra-high reasoning
Machine hint: model: "gpt-5.5", reasoning_effort: "xhigh", executionMode: "fast" when available.
If this profile is unavailable, record the fallback model and reason in `result.md`.
Wave mandate: Stress The Brief - Challenge assumptions, identify weak spots, and produce better alternatives.
Creative strategy: Comedic Engine - Expose the character or asset's funny recurring behavior through visual design choices.

## Write Scope

You may write only inside:

`.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-02`

Expected files:
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-02/result.md`
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-02/result.json`
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-02/preflight.json` if you create or inspect images
- generated or staged exploratory outputs under `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-02/outputs`

Create at least one concrete artifact under `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-02/outputs`, such as a prompt packet, source image, contact sheet, QA note, component sketch, or animation plan. A lane with only prose and no artifact is incomplete.

## Allowed Actions

- read the parent creative packet
- create exploratory prompts, notes, previews, and QA observations inside this lane only
- write a final result.md with recommendation, risks, and files created
- record housekeeping and continuous-improvement notes in the lane result

## Forbidden Actions

- do not edit sibling lanes
- do not write to public/art
- do not update the production manifest
- do not promote assets
- do not delete approved or live assets
- do not change the parent creative-brief.json

## Required Result Format

Write `result.md` with:
- strongest idea or output
- what is meaningfully different from the other lanes
- generated files or prompts created
- quality risks
- housekeeping notes
- continuous-improvement notes

Also write `result.json` with:
- laneId
- strongestIdea
- uniquenessClaim
- outputFiles
- qualityRisks
- fallbackModel
- fallbackReason
- promotionBlockers

Keep the work bold but usable. The parent session owns merge, final review, approval, promotion, and app integration.
Do not trade quality for volume: this lane must meet the same source quality, labeling, QA, and organization standards as a single-run production packet.
