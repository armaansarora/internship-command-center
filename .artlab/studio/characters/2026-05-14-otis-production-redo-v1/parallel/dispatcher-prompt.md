# Creative Production Engine Parallel Dispatcher

Parent run: 2026-05-14-otis-production-redo-v1
Asset: Otis (character)
Parallel shape: 5 agents x 3 waves = 15 lanes
Default lane agent profile: GPT-5.5 fast mode, extra-high reasoning
Status: ready-for-dispatch
Status reason: Initial direction is already approved, so lane subagents may be dispatched.

## Goal

Use the lane prompts to create a larger, stranger, more useful option set without sacrificing organization or production safety.

## Dispatch Rules

- dispatch one subagent per lane prompt, grouped by wave
- use GPT-5.5 fast mode, extra-high reasoning for lane subagents when the client exposes that model profile
- run lanes in the same wave concurrently only when compute and image-generation limits allow it
- do not let lane agents edit shared code, manifests, public/art, or parent packet files
- parent session compares lane results and builds one review board or next packet
- human approval remains initial direction approval and final upload-ready approval only

When dispatching from Codex, prefer `model: "gpt-5.5"` with `reasoning_effort: "xhigh"`. Use fast execution mode where the current client exposes it.


## Safety Rules

- each lane owns exactly one isolated outputRoot
- all generated drafts remain in .artlab until parent review
- promotion requires the parent pipeline and the exact phrase approved for app
- every lane must include housekeeping and continuous-improvement notes
- wacky creative swings are welcome only when the output remains technically usable
- 15x output may increase variety, never lower the source-quality, QA, approval, or organization bar

## Lane Queue

- wave-01-agent-01: Canonical Safe / Wide Divergence -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-01-agent-01/agent-prompt.md
- wave-01-agent-02: Silhouette Breaker / Wide Divergence -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-01-agent-02/agent-prompt.md
- wave-01-agent-03: Human Imperfection / Wide Divergence -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-01-agent-03/agent-prompt.md
- wave-01-agent-04: Premium Game Sprite / Wide Divergence -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-01-agent-04/agent-prompt.md
- wave-01-agent-05: Material Simplifier / Wide Divergence -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-01-agent-05/agent-prompt.md
- wave-02-agent-01: Prop Forward / Stress The Brief -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-01/agent-prompt.md
- wave-02-agent-02: Comedic Engine / Stress The Brief -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-02/agent-prompt.md
- wave-02-agent-03: Mobile First Read / Stress The Brief -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-03/agent-prompt.md
- wave-02-agent-04: Animation Minded / Stress The Brief -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-04/agent-prompt.md
- wave-02-agent-05: Dramatic Lighting / Stress The Brief -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-02-agent-05/agent-prompt.md
- wave-03-agent-01: Weird But Usable / Ship-Ready Filter -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-03-agent-01/agent-prompt.md
- wave-03-agent-02: Technical Cleanroom / Ship-Ready Filter -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-03-agent-02/agent-prompt.md
- wave-03-agent-03: Relationship Aware / Ship-Ready Filter -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-03-agent-03/agent-prompt.md
- wave-03-agent-04: Editorial Premium / Ship-Ready Filter -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-03-agent-04/agent-prompt.md
- wave-03-agent-05: Wild Card / Ship-Ready Filter -> .artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-03-agent-05/agent-prompt.md

## Merge Gate

After a wave finishes, read every lane `result.md`, compare the strongest outputs, record slow or broken steps, and decide whether the next wave should broaden, repair, or converge. Only the parent session may build the final review board, ask Armaan for approval, promote assets, or integrate the app.
