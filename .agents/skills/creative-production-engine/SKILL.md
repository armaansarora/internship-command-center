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

1. Run `npm run art:produce -- --request "<Armaan's natural-language request>"` for normal creative work. Use `npm run art:studio` only for read-only orientation, lane coordination, or low-level diagnostics.
2. Explain the current state in plain language:
   - what has been done
   - what is recommended now
   - what remains
3. brainstorm first. Ask what Armaan wants to add today and gather the creative brief.
4. Present 2-3 approaches with a recommendation.
5. Create concept options or a concept prompt packet.
   - Prefer `npm run art:produce -- --request "<Armaan's natural-language request>"`. The engine routes characters, backgrounds, screens, buttons, animations, props, scenes, icon systems, and marketing visuals into strict organized packets.
   - Parallel wave mode is the default for every creative packet: 5 lanes total.
   - Only use `--no-parallel` for explicit single-thread diagnostics or when Armaan directly asks not to fan out.
   - Parallel mode creates a parent packet plus isolated lane prompts. Dispatch subagents only to individual lane prompts; do not let lane agents edit shared files.
   - Default subagent profile for lane work: GPT-5.5 fast mode, extra-high reasoning (`model: "gpt-5.5"`, `reasoning_effort: "xhigh"` when available).
   - Once the brief is known, use `npm run art:studio -- --asset-type <type> --name "<asset name>" --brief "<brief>" --run-id <safe-run-id>` to create the strict packet.
6. Do not ask for `approve direction` before images exist. If the brief is routable, tooling/key/budget checks pass, and no lock exists, continue automatically through five-lane initial concept generation.
7. Stop for the first normal human gate only after the five initial concepts and initial concept review board/action manifest exist. At that point `approve direction` means Armaan has seen the board and selected/approved a visual direction; prefer `approve direction: 01` or the exact slot id so the chosen lane is durable.
8. After that approval, do not stop at `initial-direction-approved`. Treat it as an internal checkpoint: automatically build the strict production packet, generate the approved production pack, run local cutout, run strict QA, and build the final upload-ready board.
   - For Tower character assets, the default approved production pack is system-wide, not character-specific: exactly 3 outfit variants (`regular`, `summer-light`, `winter-layered`) x 7 pose/expression states (`idle`, `greeting`, `listening`, `thinking`, `talking`, `alert`, `working`) = 21 individual source sprites.
   - Character final boards are illegal until every required outfit/pose-expression source exists, passes cutout/strict QA, and appears in the action manifest.
9. Execute generation, ingest, QA, review board, promotion, and app integration through scripts.
   - Normal command surface is only:
     - `npm run art:produce -- --request "<request>"`
     - `npm run art:produce -- --continue <run-id>`
     - `npm run art:produce -- --answer <run-id> "<plain English answer>"`
     - `npm run art:status`
     - `npm run art:health`
   - Use `npm run art:produce -- --request "<request>" --dry-run` only for a no-provider rehearsal; it writes mock durable state, reserves no budget, and must stop before paid generation.
   - `art:produce` writes durable `run-state.json`, `progress.json`, and append-only `events.jsonl`; it writes `human-action.json` only when a true blocker or post-image review gate needs Armaan. Future sessions resume from those files and receipts, not chat history.
   - Before initial images exist, `human-action.json` is legal only for true blockers: missing secret, budget-blocked, provider-blocked, active lock, corrupt state, unsafe-to-run, or an actually unclear brief.
   - Every human stop must have `human-action.json` with what the engine understood, recommendation, cost impact, risk, allowed responses, and recommended response.
   - `art:produce -- --continue <run-id>` must stop at `upgrade-required` when active continuous-improvement blockers exist. Do not continue production until the command/test/doc hardening is done.
   - `art:produce -- --answer <run-id> "<plain English answer>"` records Armaan's answer into durable run files and advances legal gates from files, not chat memory. When the answer approves a concept board direction, the command continues automatically through production until a true blocker or the final upload-ready board.
   - Do not use Armaan's daily Chrome profile for image generation. First create or reuse an isolated Playwright Chromium session with `npm run art:browser plan --session gemini-art-studio --provider gemini`.
   - If the subscription UI must be opened, use `npm run art:browser open --session gemini-art-studio --provider gemini`; keep downloads inside the isolated session path.
   - Do not open many visible provider tabs. Subscription UI work is capped at two isolated interactive sessions by default. True unattended five-lane image generation requires the Gemini API adapter and explicit billing approval.
   - Subscription-first image generation uses `npm run art:generate prepare-subscription` to create a Gemini/ChatGPT browser bridge and labeled inbox slots.
   - Use `gemini-subscription-browser` first when Armaan wants Gemini Pro / Nano Banana without API billing.
   - Production subscription runs must use `--quality-mode pro`, `--quality-mode thinking`, or `--quality-mode highest-quality-available`; if the UI exposes Pro as Redo with Pro, use it before download. Fast mode is draft-only.
   - Leave style presets at `none/default` unless the preset is explicitly approved and recorded. Never use Color block for Tower production.
   - Capture every downloaded full-size image with `npm run art:generate capture-download`; never drag loose downloads straight into `public/art`.
   - Run `npm run art:generate status` before ingest so missing slots and low-resolution warnings stay visible.
   - For the v3 paid path, use `npm run art:generate prepare-api` then `npm run art:generate run-api`. Gemini API v3 is locked to Nano Banana 2 (`gemini-3.1-flash-image-preview`), five lanes for initial design, 4K by default, cost-capped, and image-only responses.
   - Initial character design is exactly 5 total images: one prompt-only base concept x five concurrent lanes. Do not attach identity reference images or generate multiple poses during initial design.
   - Character initial concepts must use one shared Tower/Otis character style envelope across all lanes: premium stylized high-detail app/game character art, full-body 9:16 app-sprite framing, controlled Tower lighting, and Professional Scars tone. Do not vary rendering style between lanes.
   - Character lane variation belongs only in explicit design cards: silhouette, age read, hair shape/length/texture, facial structure, wardrobe category, color palette, posture/body language, accessories/tools, personality read, and Tower role archetype. Do not let all five lanes become the same suit, same short hair, or same executive archetype.
   - Tower character prompts must avoid realism/style-drift trigger words such as hyperrealistic, photo, actual person, storybook, watercolor, pastel, flat cartoon, corporate stock, and similar wording. Use the locked positive style envelope instead of naming forbidden styles in the generation prompt.
   - Concept QA must block `direction-review-ready` when style coherence or design diversity fails. If two or more lanes fail the same way, mark the board `style-failed`, supersede the board, harden the prompt builder, and regenerate before asking Armaan to choose.
   - Do not apply character concept contracts to other asset types. UI assets match the existing Tower product UI/design system; backgrounds/environments match Tower architecture, lighting, mood, and crops; props, icons, shaders, animations, scenes, and marketing visuals use their own asset contracts.
   - Production packs after design approval must use `--phase production-pack`; stale plans without an explicit phase are invalid and must be regenerated.
   - `initial-direction-approved`, `production-planned`, `full-pack-running`, `repairing`, and `strict-qa` are not normal human stops after concept approval. The next normal human stop is only `final-board-ready`, with an upload-ready board/action manifest and the exact final phrase `approved for app`.
   - Production packs with more than one source slot create a canary plan and a blocked full plan. Run the canary through generation, local cutout, edge refinement, strict cutout doctor, ingest/master/derive/review preview, then `npm run art:generate verify-canary --plan <canary/gemini-api-plan.json>`. The full plan must not run until `canary-gate.json` is `passed` and `cutout-readiness.json` is `ready`.
   - Whole-pack warning retries are banned. Use `npm run art:generate repair-auto --plan <plan>` first, then regenerate only named failed slots with `npm run art:generate run-api --plan <plan> --slots <slot-id-a,slot-id-b>`.
   - API runs are protected by `api-run.lock`, `api-run-state.json`, provider-budget ledgers created by `prepare-api`, clean-slot skipping, warning-slot retries, request timeouts, retryable network failure handling, and budget projection. Use `--max-attempts <n>` for retry caps and `--force-unlock` only after confirming no API run is active.
   - `api-run-state.json` status `completed-with-warnings` is not production-ready. Treat it as concept-only or repair-required until the warnings are fixed.
   - After generated images or review boards exist, run the Asset Doctor Gate: `npm run art:generate doctor -- --plan <gemini-api-plan.json> --board <review-board.html>`. Add `--strict` before final upload-ready approval. If it blocks, do not show the board as clean and do not promote.
   - If doctor reports warnings or blockers, immediately run `npm run art:generate repair-plan -- --plan <gemini-api-plan.json> --board <review-board.html> --strict`, then `npm run art:generate repair-auto --plan <gemini-api-plan.json>` for safe non-paid repairs, so the next step is an exact per-slot repair packet, not a human guess from raw warnings.
   - Gemini does not reliably return production-ready transparent foregrounds. Production prompts must use the `premium-simple-backdrop-v1` contract, then local `cutout-auto` runs before edge refinement, alpha QA, mastering, derivatives, and review. Production cutout is offline by default and fails closed when the selected model/cache/license evidence is missing.
   - API keys must come only from `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or macOS Keychain service `tower-gemini-api-key`. Never write API keys into repo files, command flags, prompt decks, receipts, screenshots, or run JSON.
10. Promote only after the exact phrase `approved for app`.
11. Run the Housekeeping Gate.
    - Use `npm run art:clean` for volatile old character-run binaries when replacing approved art.
12. Run the Continuous Improvement Gate.
    - Use `npm run art:studio -- --mode improve` when friction repeats or after major phases. The report writes `continuous-improvement-report.json` and can block production until the engine is upgraded.
13. Recommend the next best action.

## Housekeeping Gate

Every phase must inventory created files, mark what is kept, archive or delete loose junk, update ledgers, and confirm no unapproved asset entered `public/art`.

## Continuous Improvement Gate

Every phase must record slow steps, manual steps, errors, quality failures, confusion, and rewrite-level concerns. Repeated manual friction, repeated medium quality failures, or high-severity failures require improving the engine before continuing.

Run:

```bash
npm run art:studio -- --mode improve
```

If the report says `upgrade-required`, fix the engine before continuing production. By the fifth run, repeated friction must have become a script, QA gate, or command-level guard rather than another note in Markdown.

## Parallel Wave Mode

Use this for every normal Creative Production Engine packet. The default is always five-lane output unless the run is an explicit diagnostic.

1. The parent coordinator runs:
   `npm run art:studio -- --request "<request>"`
2. The command creates:
   - `parallel/parallel-plan.json`
   - `parallel/dispatcher-prompt.md`
   - `parallel/lanes/<wave-id-agent-id>/lane-brief.json`
   - `parallel/lanes/<wave-id-agent-id>/agent-prompt.md`
3. Do not use a pre-image `awaiting-initial-approval` gate for normal routable concept work. Five-lane initial concept generation runs automatically; stop only for true blockers before images exist.
4. Each subagent receives exactly one `agent-prompt.md` and should run GPT-5.5 fast mode with extra-high reasoning when the current client exposes it.
5. If a lane needs command setup, it runs:
   `npm run art:studio -- --mode lane --lane-brief <lane-brief.json>`
6. Lane agents may write only inside their own lane root.
7. Lane agents must not write `public/art`, update manifests, promote assets, run cleanup, delete approved assets, or edit the parent packet.
8. Before coordinator merge, validate each completed lane with:
   `npm run art:studio -- --mode validate-lane --lane-brief <lane-brief.json>`
9. The parent coordinator reads all validated lane outputs with:
   `npm run art:studio -- --mode coordinate --parallel-plan <parallel-plan.json>`
10. Coordinator mode writes `coordinator-review.json`, `coordinator-report.md`, `review-board.html`, and `promotion-gate.json`.
11. Ask for `approve direction` only after the initial concept board exists; ask for `approved for app` only when `promotion-gate.json` is `ready-for-final-approval`.
12. The parent coordinator merges the best ideas, runs QA, asks for final approval, and promotes only after `approved for app`.
13. Volume cannot lower standards: every lane must keep the same source-quality, QA, naming, organization, and approval bar as a single-lane production packet.

## Generation Adapter Rule

The engine must be honest about how images are produced:

- `gemini-subscription-browser`: first-choice no-API-billing bridge. It uses the signed-in Gemini web app with Create image mode, then captures downloaded full-size images into `.artlab/inbox/...`.
- `chatgpt-subscription-inbox`: subscription fallback when ChatGPT image generation is better for a specific asset.
- `gemini-api`: current v3 paid automation path after Armaan approved the limited Gemini API budget; locked to Nano Banana 2 (`gemini-3.1-flash-image-preview`) unless canon changes.
- `openai-api`: fully automatic but API-billed; do not use unless Armaan explicitly approves paid OpenAI API usage.
- `local-mock`: tests only.

If a subscription bridge works but outputs below the source-quality contract, record the warning and harden the next run. Do not call it production-ready just because the image looks attractive.

Production quality mode and style presets are mandatory bridge fields. Use Pro, Thinking, Redo with Pro, or highest-quality available mode for production; Fast mode is only for throwaway drafts. Subscription UI downloads may still be below native 4K, so the bridge must keep source-size warnings visible. Style presets can improve consistency, but they are strong art-direction locks. Default to `none/default`; do not use Color block for Tower production.

Browser isolation is mandatory. The engine must not operate inside Armaan's normal Chrome profile. For subscription providers, create an isolated `art:browser` session using Playwright Chromium / Google Chrome for Testing and treat it as disposable studio equipment. If the UI path becomes the bottleneck, improve the adapter or switch to an approved API path; do not scale by hijacking more of the user's browser.

Gemini API v3 is the clean path when paid API usage is approved. It creates `generation/gemini-api-v3/gemini-api-plan.json`, `gemini-api-runbook.md`, `prompt-deck.md`, and `.artlab/inbox/.../gemini-api-v3` slots. Run with:

```bash
npm run art:generate prepare-api --packet <creative-brief.json> --directive <next-image-generation-step.json> --lane-count 5 --concurrency 5 --resolution 4K --aspect-ratio 9:16 --budget-cents 1000
npm run art:generate run-api --plan <gemini-api-plan.json> --max-attempts 3 --request-timeout-ms 300000
npm run art:generate doctor --plan <gemini-api-plan.json> --board <review-board.html>
```

Initial design is prompt-only and exactly five images total. Once Armaan chooses the design, regenerate the next plan with `--phase production-pack` for outfits, poses, expressions, turnarounds, or app-ready source work. Character production packs must use the shared Tower matrix of `regular`, `summer-light`, and `winter-layered` outfits across `idle`, `greeting`, `listening`, `thinking`, `talking`, `alert`, and `working` pose/expression states. A one-sprite character board is incomplete, must be superseded, and must continue automatically. Multi-slot production packs are firewall-protected: the canary plan runs first, `verify-canary` writes the unlock gate, and the full plan remains blocked until the canary passes with the same prompt/reference/source contract.

The runner skips slots that already have a clean receipt, retries warning receipts as versioned attempts only when explicitly legal, refuses to overwrite prior attempts, and writes `api-run-state.json` after planning, running, blocking, or failing. Whole-pack warning retries are blocked; use `--slots` for named repairs. A stale lock is a serious event: `--force-unlock` is allowed only after checking no other agent/process is currently generating. Stale API plans without `phase: "initial-design"` or `phase: "production-pack"` are blocked. `completed-with-warnings` means the run is not production-clean.

`run-api` uses the shared durable scheduler/provider adapter boundary for the actual selected slot work. In addition to the legacy Gemini inbox receipts, it writes `provider-budget-ledger.json` with reservations and receipts, and uses `slot-leases/` for per-slot duplicate-spend protection. Treat missing, stale, or mismatched provider ledgers as a spend blocker until reconciled.

Asset Doctor Gate:

```bash
npm run art:generate doctor --plan <gemini-api-plan.json> --board <review-board.html> --strict
```

The doctor verifies expected generated files, receipt warnings, decodable local image files, and review-board `<img>` references. It writes `asset-doctor.json` and exits non-zero for blockers. No review board or production promotion is allowed when the doctor blocks.

Repair Plan Gate:

```bash
npm run art:generate repair-plan --plan <gemini-api-plan.json> --board <review-board.html> --strict
```

This writes `repair-plan.json` beside `asset-doctor.json` and converts failures into exact per-slot actions:

- `cutout-local` for foreground sources that exist but still need transparent production alpha.
- `regenerate-slot` for missing, corrupt, low-resolution, or non-repairable outputs.
- `rebuild-review-board` for broken local preview references.
- `none` for clean slots.
- `improvement-required` when many slots share the same failure code, because the prompt/model/threshold strategy is broken.

Run strict doctor again after following the repair plan. Do not ask for final approval until the strict gate passes.

Do not silently cut out uncertain foregrounds. If the cutout compiler is unsure, it blocks promotion and routes to named-slot regeneration or improvement mode.

Cutout compiler workflow:

```bash
npm run art:generate cutout-bootstrap
npm run art:generate cutout-benchmark --fixture-set <fixture-set.json>
npm run art:generate cutout-readiness --plan <gemini-api-plan.json>
npm run art:generate cutout-auto --plan <gemini-api-plan.json> --slots <slot-id>
npm run art:generate cutout-doctor --plan <gemini-api-plan.json> --strict
```

Cutout runs on the original provider source before any upscale/mastering step. Every receipt records source hash, model/weight evidence, raw mask hash, refined mask hash, final PNG hash, thresholds, QA badges, and failure codes.

## Creative Capability Scope

The engine is not only for static images. It can route and produce:

- character sprites and transparent production assets
- environments and responsive background crops
- UI surfaces and real app UI components
- shader effects, WebGL/WebGPU/Three.js scene work, and immersive layers
- CSS/GSAP/canvas/sprite motion systems with reduced-motion fallbacks
- props, icon systems, marketing hero art, and composed story scenes

## Non-negotiables

- Preserve approved Lobby backgrounds.
- Keep drafts in `.artlab`.
- Keep production manifest gated.
- Keep live `public/art` assets until a replacement passes QA, receives `approved for app`, and promotes through the manifest.
- Treat promoted Otis in `public/art/lobby/otis/` and `src/lib/visual-assets/approved-character-assets.generated.json` as the current production baseline unless Armaan explicitly asks to redo Otis.
- In parallel mode, only the coordinator can mutate shared studio state, merge results, run cleanup, promote, or integrate the app.
- Do not hide quality warnings.
- Treat unknown flags, unsafe paths, corrupt state, and missing ledgers as engine failures to fix before continuing.
- If Armaan asks for a different kind of visual asset, do not force it into the character pipeline. Use adaptive request routing first, then improve the router if the result feels wrong.
- Use Superpowers brainstorming before new creative directions and Superpowers implementation skills when executing the approved plan.
