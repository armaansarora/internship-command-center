# The Tower — Project context for AI agents

This file exists for tools that look for `AGENTS.md` by convention (OpenAI Codex CLI, etc.). The canonical project context lives in [`CLAUDE.md`](./CLAUDE.md) — read that instead.

Other top-level pointers:
- [`STRUCTURE.md`](./STRUCTURE.md) — where every file lives
- [`README.md`](./README.md) — public-facing summary
- [`docs/`](./docs/) — design specs (`VISION-SPEC.md`, `CHAIN-OF-COMMAND.md`, `CHARACTER-PROMPTS.md`, `LAUNCH-READY.md`, `TESTING.md`)

Creative Production Engine:
- When Armaan says "Creative Production Engine" or asks to add/generate Tower visuals, run `npm run art:studio` and follow `.agents/skills/creative-production-engine/SKILL.md`.
- Normal creative packets default to 15x parallel output: 5 agents x 3 waves. Dispatch subagents only to isolated lane prompts, prefer GPT-5.5 fast mode with extra-high reasoning when available, run `--mode coordinate` after lane validation, and keep promotion coordinator-owned.
- Every creative phase must run the Housekeeping Gate and the Continuous Improvement Gate.
