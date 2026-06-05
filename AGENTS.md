# The Tower — Project context for AI agents

This file exists for tools that look for `AGENTS.md` by convention (OpenAI Codex CLI, etc.). The canonical project context lives in [`CLAUDE.md`](./CLAUDE.md) — read that instead.

Other top-level pointers:
- [`STRUCTURE.md`](./STRUCTURE.md) — where every file lives
- [`README.md`](./README.md) — public-facing summary
- [`docs/`](./docs/) — design specs (`VISION-SPEC.md`, `CHAIN-OF-COMMAND.md`, `CHARACTER-PROMPTS.md`, `LAUNCH-READY.md`, `TESTING.md`)

ArtLab / Creative Production Engine:
- When Armaan says "Creative Production Engine" or asks to add/generate Tower visuals, use ArtLab. Start from `.agents/skills/artlab/SKILL.md`, then run `npm run artlab -- produce "<natural language request>"` for a new run or `npm run artlab -- status [<runId>]` for read-only inspection. Use `npm run artlab -- health` or `npm run artlab -- doctor` for diagnostics.
- Normal creative packets default to five-lane parallel output: 5 agents x 1 wave. Dispatch subagents only to isolated lane prompts, prefer GPT-5.5 fast mode with extra-high reasoning when available, run `--mode coordinate` after lane validation, and keep promotion coordinator-owned.
- Do not ask for `approve direction` before concept images exist. The first normal CPE human gate is the five-image concept review board; pre-image `human-action.json` is only for true blockers.
- Character concept boards must share one Tower/Otis-compatible style envelope across all lanes. Lane prompts vary only character design cards (silhouette, age, hair, face, wardrobe, palette, posture, accessories, personality, role archetype), never rendering style. UI/background/prop/icon/marketing assets use their own contracts, not the character contract.
- Every creative phase must run the Housekeeping Gate and the Continuous Improvement Gate.
- Production packs must pass the one-slot canary gate before full-pack paid generation. Whole-pack warning retries are banned; repair locally first, then regenerate only named failed slots.
