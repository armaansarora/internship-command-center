# Creative Production Engine

## Purpose

The Creative Production Engine is the Tower-wide system for producing characters, environments, props, UI textures, animations, scenes, icon systems, and marketing hero art. It is a guided creative mode for Codex and Claude, backed by scripts and ledgers so the work stays organized, testable, and promotable.

## Command Surface

- `npm run art:produce -- --request "<natural language request>"`: canonical normal entrypoint. It routes the request, writes `run-state.json`, `progress.json`, `human-action.json`, and `events.jsonl`, then stops only at the initial direction gate or a true blocker.
- `npm run art:produce -- --continue <run-id>`: resumes a creative run from durable state, not chat memory. It imports legacy Otis state when needed, honors `upgrade-required`, and advances safe automatic steps such as rebuilding a local final board/action manifest.
- `npm run art:produce -- --answer <run-id> "<plain English answer>"`: records Armaan's plain-English response into durable state, advances the legal gate, refreshes progress/human-action files, and prevents future sessions from relying on chat memory.
- `npm run art:status`: plain-English current run status from `progress.json`, including phase, slot counts, spend, locks, next automatic step, and exact human action when needed.
- `npm run art:health`: safe-to-run report covering active locks/processes, last run, spend, repeated failures, provider health/concurrency, cutout readiness, cleanup debt, and continuous-improvement production blocks.

Everything below is advanced/internal and should not be required for normal operation:

- `npm run art:studio`: guided conversational opening, studio state creation, Housekeeping Gate entry, and Continuous Improvement Gate entry. Use it for orientation, diagnostics, lane work, and improvement reports.
- `npm run art:studio -- --request "<natural language request>"`: adaptive request router for any Tower visual work. Use this first when Armaan asks for a character, background, screen, button, animation, prop, scene, icon system, or marketing visual in normal language. This creates the default five-lane parallel packet.
- `npm run art:studio -- --asset-type <type> --name "<asset name>" --brief "<brief>" --run-id <safe-run-id>`: converts an approved guided brief into a strict production packet under `.artlab/studio/<asset-type>/<run-id>/` with `creative-brief.json`, `prompt.md`, `next-action.md`, phase ledgers, and the default five-lane parallel packet.
- `npm run art:studio -- --request "<natural language request>" --parallel-agents 5 --waves 1`: explicit version of the default five-lane shape. Use custom counts only for deliberate experiments.
- `npm run art:studio -- --request "<natural language request>" --no-parallel`: single-thread diagnostic escape hatch. Do not use for normal creative production.
- `npm run art:studio -- --mode lane --lane-brief <path-to-lane-brief.json>`: prepares one isolated lane for a subagent without mutating shared studio state.
- `npm run art:studio -- --mode validate-lane --lane-brief <path-to-lane-brief.json>`: rejects incomplete lane results before coordinator merge.
- `npm run art:studio -- --mode coordinate --parallel-plan <path-to-parallel-plan.json>`: gathers validated lanes, scores and dedupes candidates, writes review artifacts, and blocks promotion when quality evidence is missing.
- `npm run art:studio -- --mode improve`: reads the Continuous Improvement ledger and writes `continuous-improvement-report.json`; if it reports `upgrade-required`, patch the engine before continuing production.
- `npm run art:generate adapters`: lists generation adapters and whether they use subscription UI, API billing, direct file save, or local test output.
- `npm run art:generate prepare-subscription --packet <creative-brief.json> --directive <next-image-generation-step.json> --quality-mode pro`: creates a Gemini subscription browser bridge with labeled inbox slots, a prompt deck, and capture commands. This is the default no-API-billing path when Armaan wants to use Gemini Pro / Nano Banana through his subscription.
- `npm run art:generate capture-download --bridge <generation-bridge.json> --slot <slot-id> --source <downloaded-file>`: captures a full-size Gemini download into the correct `.artlab/inbox/...` slot and writes a receipt with dimensions, alpha, bytes, and quality warnings.
- `npm run art:generate status --bridge <generation-bridge.json>`: reports which subscription-generated slots have been captured and whether the bridge is ready for pipeline ingest.
- `npm run art:generate prepare-api --packet <creative-brief.json> --directive <next-image-generation-step.json>`: creates the paid Gemini API v3 plan, locks Nano Banana 2, expands the requested slots across five lanes, estimates cost, and writes the runbook.
- `npm run art:generate prepare-api --packet <creative-brief.json> --directive <next-image-generation-step.json>`: default initial-design mode creates exactly five total prompt-only concepts, not 15 pose probes. It rejects multiple base slots and reference images during initial design.
- `npm run art:generate prepare-api --phase production-pack --packet <creative-brief.json> --directive <next-image-generation-step.json>`: after Armaan chooses one design, creates a one-slot canary plan plus a blocked full production plan when the run has multiple source slots.
- `npm run art:generate run-api --plan <canary/gemini-api-plan.json> --max-attempts 2 --request-timeout-ms 300000`: runs the paid canary first. The full plan remains blocked until the canary gate and cutout readiness both pass.
- `npm run art:generate cutout-bootstrap`: prepares pinned local cutout tooling records, model cache folders, and license manifests. Bootstrap may use network; production cutout must be offline.
- `npm run art:generate cutout-benchmark --fixture-set <fixture-set.json>`: benchmarks candidate cutout models by subject type/topology and writes the selected, license-cleared model map.
- `npm run art:generate cutout-readiness --plan <gemini-api-plan.json>`: checks backdrop separation, framing, subject complexity, benchmark status, and canary cutout before unlocking full production.
- `npm run art:generate cutout-auto --plan <gemini-api-plan.json> --slots <slot-id-a,slot-id-b>`: runs local cutout on original provider sources for named slots, then edge refinement and alpha QA.
- `npm run art:generate cutout-doctor --plan <gemini-api-plan.json> --strict`: validates cutout receipts, alpha badges, crop, dimensions, halo, props, and repeated failure codes.
- `npm run art:generate verify-canary --plan <canary/gemini-api-plan.json>`: writes `canary-gate.json`. The full pack may run only when this gate is `passed`, cutout status is passed, and the prompt/reference/source contract hashes still match.
- `npm run art:generate run-api --plan <full/gemini-api-plan.json> --max-attempts 2 --no-retry-warnings --request-timeout-ms 300000`: runs the full production pack only after the canary passes. Whole-pack warning retries are banned.
- `npm run art:generate run-api --plan <full/gemini-api-plan.json> --slots <slot-id-a,slot-id-b>`: regenerates only named failed slots after repair/doctor evidence proves they need paid repair.
- `npm run art:generate run-api --plan <gemini-api-plan.json> --max-attempts 3 --request-timeout-ms 300000`: runs a paid Gemini API plan, writing files and receipts only into `.artlab/inbox/...`. It skips clean receipts, writes `api-run-state.json`, and uses `api-run.lock` to prevent duplicate concurrent spend.
- `npm run art:generate doctor --plan <gemini-api-plan.json> --board <review-board.html>`: validates every generated image and every review-board image reference before approval. Add `--strict` before final upload-ready approval so receipt warnings and missing alpha become blockers. The command writes `asset-doctor.json`.
- `npm run art:generate repair-plan --plan <gemini-api-plan.json> --board <review-board.html> --strict`: converts doctor warnings/blockers into an exact per-slot repair plan at `repair-plan.json`, including cutout commands, regeneration fallbacks, board rebuild actions, and strict doctor commands to rerun after repair.
- `npm run art:generate repair-auto --plan <gemini-api-plan.json>`: applies safe non-paid repairs from `repair-plan.json`, starting with named-slot cutout when a foreground source exists but still needs production alpha.
- `npm run art:browser plan --session gemini-art-studio --provider gemini`: creates an isolated Tower Art Studio Playwright Chromium profile, download folder, queue folder, and runbook. This command does not launch the browser by default.
- `npm run art:browser open --session gemini-art-studio --provider gemini`: launches the isolated browser profile when Armaan explicitly wants the subscription UI path. Do not use Armaan's daily Chrome profile for image generation.
- `npm run art:operate`: strict character-art operator packet for Season 1 character work.
- `npm run art:status`: normal read-only operator status. With no v1-final run selector, it can still render legacy character art status for diagnostics.
- `npm run art:clean`: removes volatile run-owned art binaries while keeping ledgers, references, live `public/art`, and manifest data protected.
  It writes `.artlab/studio/artifact-registry.json` and reports cleanup through registry buckets (`protected`, `archive`, `delete`, `keep`) instead of relying on broad deletion guesses.

`art:studio` rejects unknown flags, unsafe run ids, path traversal, symlink escapes, and production writes outside `.artlab/studio`. If the studio state is corrupt, it preserves a `.corrupt-*` backup before creating a valid state snapshot.

## Parallel Wave Mode

Parallel Wave Mode is the default for normal creative production. The coordinator creates one parent packet plus a `parallel/` folder with lane briefs, lane prompts, and a dispatcher prompt. A normal run means 5 subagents can work at once for one wave, producing five distinct creative lanes.

Example:

```bash
npm run art:studio -- --request "Create five prompt-only initial Otis designs from scratch." --run-id otis-initial-design-v1
```

Then give each subagent one lane prompt from:

```text
.artlab/studio/<asset-type>/<run-id>/parallel/lanes/<wave-id-agent-id>/agent-prompt.md
```

Each lane may run:

```bash
npm run art:studio -- --mode lane --lane-brief .artlab/studio/<asset-type>/<run-id>/parallel/lanes/<wave-id-agent-id>/lane-brief.json
```

If the generated plan status is `awaiting-initial-approval`, the coordinator must not launch lane subagents until Armaan approves the initial direction. If the packet was already approved, the plan status is `ready-for-dispatch`.

Lane agents may write only inside their own lane root. They cannot write `public/art`, update manifests, run promotion, run cleanup, delete approved assets, or edit the parent packet. The coordinator owns merge, final review, human approval, promotion, and app integration. Completed lanes must pass `validate-lane` before coordinator merge so five-lane output does not become five-lane half-finished noise.

After lane validation, run:

```bash
npm run art:studio -- --mode coordinate --parallel-plan .artlab/studio/<asset-type>/<run-id>/parallel/parallel-plan.json
```

Coordinator mode writes:

- `coordinator-review.json`: machine-readable scores, ranked candidates, duplicate groups, and blockers.
- `coordinator-report.md`: concise review summary.
- `review-board.html`: human review board for choosing final direction.
- `promotion-gate.json`: `blocked` or `ready-for-final-approval`.

Do not ask for `approved for app` until `promotion-gate.json` is `ready-for-final-approval`.

Default lane subagent profile:

- Model: `gpt-5.5`
- Execution mode: fast, when the client exposes a fast-mode toggle.
- Reasoning effort: `xhigh`
- Quality rule: five-lane output increases exploration, never lowers the source-quality, QA, naming, organization, or approval bar.
- Fan-out cap: normal runs are capped at five lanes unless the engine is deliberately upgraded.

The five-lane default is deliberate:

- Lane 1 protects the approved canon and avoids drift.
- Lane 2 pushes human imperfection and non-AI perfection.
- Lane 3 optimizes mobile sprite readability.
- Lane 4 sharpens materials, props, and Tower taste.
- Lane 5 designs for motion, pose stability, and CharacterStage integration.

Every lane must return `result.md` with the strongest idea, what is meaningfully different, files created, quality risks, Housekeeping Gate notes, and Continuous Improvement Gate notes.

## Generation Adapters

The engine separates creative planning from image-file production. This matters because subscription image tools and API image tools behave differently.

Hard browser rule: subscription UI work must use an isolated Tower Art Studio browser session. The engine must not drive Armaan's normal Chrome tabs, side panel, history, downloads, or active work. The default browser engine is Playwright Chromium / Google Chrome for Testing so Computer Use does not collide with the daily Chrome app. The command is:

```bash
npm run art:browser plan --session gemini-art-studio --provider gemini
```

When a real browser session is needed:

```bash
npm run art:browser open --session gemini-art-studio --provider gemini
```

This still is not true unattended automation. Subscription UI work is capped at two isolated interactive sessions by default. Real unattended five-lane image generation requires the Gemini API adapter with explicit billing approval. For subscription work, the speed strategy is fewer smarter batch boards for exploration, then a small number of high-quality production probes.

Current adapters:

- `gemini-subscription-browser`: recommended no-API-billing v1. Codex uses the signed-in Gemini web app with Create image mode, downloads full-size images, then captures them into labeled `.artlab/inbox/...` slots. This can use Armaan's Gemini Pro subscription, but it is not fully unattended from Node because the files come from the browser UI.
- `chatgpt-subscription-inbox`: manual fallback for ChatGPT subscription image generation. The engine supplies labeled prompts and inbox slots; downloaded files are captured and QA'd the same way.
- `openai-api`: fully automatic but API-billed. Do not use unless Armaan explicitly approves paid OpenAI API generation.
- `gemini-api`: default paid automation path for the current v3 rewrite after Armaan approved a limited Gemini API budget. It is locked to Nano Banana 2 (`gemini-3.1-flash-image-preview`) unless the art bible is deliberately revised.

Gemini API v3 shape:

```bash
npm run art:generate prepare-api \
  --packet .artlab/studio/characters/<run-id>/creative-brief.json \
  --directive .artlab/studio/characters/<run-id>/next-image-generation-step.json \
  --lane-count 5 \
  --concurrency 5 \
  --resolution 4K \
  --aspect-ratio 9:16 \
  --budget-cents 1000
```

Default `prepare-api` is initial-design mode: one base concept x five lanes = five total images. For characters, this phase must not include an identity reference image; otherwise all concepts collapse toward the same face/body. If a directive tries multiple base slots during initial design, the engine rejects it. Production work after design approval must say `--phase production-pack`.

The command writes:

- `generation/gemini-api-v3/gemini-api-plan.json`
- `generation/gemini-api-v3/gemini-api-runbook.md`
- `generation/gemini-api-v3/prompt-deck.md`
- one labeled inbox folder per lane and source slot under `.artlab/inbox/.../gemini-api-v3`

The run command is:

```bash
npm run art:generate run-api --plan .artlab/studio/<asset-type>/<run-id>/generation/gemini-api-v3/gemini-api-plan.json --max-attempts 3 --request-timeout-ms 300000
```

Run-state hardening:

- `api-run.lock` prevents two agents from spending against the same plan at once.
- `run-api` now routes selected slots through the shared durable scheduler/provider adapter boundary. The legacy Gemini plan and inbox receipts remain compatible, but live execution is governed by slot leases, provider concurrency limits, and provider budget reservations.
- `provider-budget-ledger.json` records scheduler-owned reservations and receipts with run id, slot id, attempt id, provider, model, prompt hash, reference hash, estimated cost, actual/assumed cost, response metadata, failure classification, and retry eligibility.
- `slot-leases/` contains file-backed per-slot leases while work is active; leases are released when the slot finishes, and stale leases require stale-worker proof before recovery.
- `api-run-state.json` records selected slots, skipped slots, retry reasons, budget projection, blockers, and failures.
- Clean receipts are skipped on rerun so completed slots do not bill twice.
- Warning receipts are retried as versioned attempts up to `--max-attempts`; old evidence is never overwritten.
- Runs that finish with warning receipts write `completed-with-warnings`, not `completed`. This status is concept-only or repair-required, never production-ready.
- Stale plans without explicit `phase: "initial-design"` or `phase: "production-pack"` are blocked before API spend.
- Request timeouts and retryable network/provider failures are handled per slot so a slow or flaky request does not hang the whole run.
- `--force-unlock` is only for confirmed stale locks after checking no generation process is active.
- Provider error text is redacted for API-key-shaped strings before it reaches state files.

Cutout compiler policy:

- Gemini API outputs are treated as original provider sources. Do not upscale before cutout.
- Production prompts must use `premium-simple-backdrop-v1`: high subject/background separation, no patterned walls, no furniture overlap, no same-color clothing/background collision, no shadows touching the body, full-body framing, and safe padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.
- Local cutout runs before edge refinement, alpha QA, mastering, derivatives, review, and promotion.
- Model selection is by subject type/topology, not one global winner.
- Production mode uses only cached, selected, license-cleared model/package evidence. Missing evidence fails closed with `cutout-model-missing`.
- Review boards must show source, checkerboard cutout, dark preview, light preview, and Tower shadow preview.

Asset Doctor Gate:

```bash
npm run art:generate doctor \
  --plan .artlab/studio/<asset-type>/<run-id>/generation/gemini-api-v3/gemini-api-plan.json \
  --board .artlab/studio/<asset-type>/<run-id>/generation/gemini-api-v3/review/<board>.html
```

The doctor checks that every expected generated file exists, decodes with `sharp`, meets source dimension requirements, has a receipt, and that every review-board `<img>` points at a local decodable file. It blocks missing files, corrupt files, external review images, data URI images, and broken relative paths. Use `--strict` before final approval, then run `cutout-doctor --strict` for foreground slots before mastering or promotion.

Repair Plan Gate:

```bash
npm run art:generate repair-plan \
  --plan .artlab/studio/<asset-type>/<run-id>/generation/gemini-api-v3/gemini-api-plan.json \
  --board .artlab/studio/<asset-type>/<run-id>/generation/gemini-api-v3/review/<board>.html \
  --strict
```

Run this immediately after doctor reports warnings or blockers. It writes `repair-plan.json` beside `asset-doctor.json` and gives every slot one recommended next action:

- `cutout-local`: run the local cutout compiler for an existing foreground source that needs production alpha.
- `regenerate-slot`: rerun the generation plan when files are missing, corrupt, too small, or have warnings that cannot be safely repaired locally.
- `none`: the slot is clean.
- `rebuild-review-board`: the board references are broken, remote, or inline and must be rebuilt before approval.
- `improvement-required`: repeated failures indicate prompt/model/threshold strategy is broken, so benchmark or engine hardening comes before more paid slot regeneration.

The repair plan does not promote anything. It is a self-healing operator packet: run `repair-auto` first for non-paid repairs, rerun strict doctor, then regenerate only named failed slots if the strict evidence still requires paid repair.

Cutout repair is intentionally conservative. If the compiler is missing a model, lacks license evidence, sees weak mask confidence, detects crop/halo/holes/islands, or repeats the same failure across many slots, it blocks promotion and routes to named-slot regeneration or improvement mode.

Security rules:

- The API key is read only from `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or macOS Keychain service `tower-gemini-api-key`.
- The key must never be passed as a command flag, written into `.env` files by Codex, stored in a plan, or committed.
- If an API key has been pasted into chat or a screenshot, rotate it after the run.

Cost rules:

- The plan estimates cost before the run and refuses to create a plan above `--budget-cents`.
- Default Nano Banana 2 setting is five lanes, `4K`, `9:16`, and image-only responses.
- Google Search grounding is disabled by default.
- Failed individual slots are regenerated individually; the whole pack is not blindly rerun.
- `local-mock`: test-only generator for pipeline hardening.
- `art:produce -- --request "<request>" --dry-run`: no-provider operator rehearsal. It writes mock durable state, reserves no budget, explains projected production cost, and stops at the initial direction gate.

Current baseline: Otis has been promoted into `public/art/lobby/otis/` and `src/lib/visual-assets/approved-character-assets.generated.json`. `art:status` should report the Otis studio run as `closed`, browser-QA verified, and protected, with no renewed `approved for app` prompt. Do not regenerate, overwrite, delete, or re-promote Otis unless Armaan explicitly asks.

Subscription bridge shape:

```bash
npm run art:generate prepare-subscription \
  --packet .artlab/studio/characters/<run-id>/creative-brief.json \
  --directive .artlab/studio/characters/<run-id>/next-image-generation-step.json \
  --quality-mode pro
```

The command writes:

- `generation/generation-bridge.json`
- `generation/gemini-subscription-runbook.md`
- `generation/prompt-deck.md`
- one labeled inbox folder per source slot under `.artlab/inbox/...`

Production image bridges must record UI generation settings:

- `qualityMode`: production uses `pro`, `thinking`, or `highest-quality-available`. If the Gemini UI exposes Pro through a `Redo with Pro` action, use that before downloading. Fast is draft-only and cannot feed production source capture.
- `stylePreset`: default is `none/default`. Leave UI presets unselected unless a preset has been explicitly approved for the run.
- `stylePresetPolicy`: default is `none-by-default`; `approved-style-lock` is allowed only when the exact preset is recorded in `generation-bridge.json`.
- Forbidden preset: `Color block`. It is not suitable for Tower because it over-flattens the house style and fights `tower-flat-plus-depth-v1`.

Style presets can improve consistency because they add another stable conditioning signal, but they also become a strong house-style lock. The Tower rule is: use the approved identity reference, locked prompt language, and the same high-quality model mode first; only add a UI preset if it wins a deliberate style test and is recorded across the entire run.

Do not assume subscription UI output is native 4K. The bridge captures the highest full-size Pro download available, then local QA records whether it misses the 4K source contract. A below-contract download may remain useful source art, but it cannot silently become "native 4K".

After each Gemini download:

```bash
npm run art:generate capture-download --bridge <generation-bridge.json> --slot <slot-id> --source <downloaded-file>
npm run art:generate status --bridge <generation-bridge.json>
```

If a retry is needed, keep the bad file and capture the new file as a new attempt:

```bash
npm run art:generate capture-download --bridge <generation-bridge.json> --slot <slot-id> --source <downloaded-file> --attempt 2
```

If the subscription UI outputs lower resolution than the source contract, the receipt must keep that warning visible. The engine may use local master/upscale processing later, but the warning cannot be hidden or treated as native 4K.

Fresh-start rule for new characters: do not treat old probes, references, browser downloads, or unrelated promoted sprites as current production source. Start from prompt-only initial designs unless a current durable run-state explicitly names an approved identity reference. Otis is the exception because he is already the promoted and browser-verified production baseline.

## Adaptive Request Router

The engine must accept Armaan's request in normal language and convert it into the closest strict asset class without making him learn internal categories.

Examples:

- `npm run art:studio -- --request "create five prompt-only Otis designs from scratch"` routes to `character`.
- `npm run art:studio -- --request "create a new immersive background screen for the application war room"` routes to `environment`.
- `npm run art:studio -- --request "make a small premium UI button texture for the lobby controls"` routes to `ui-texture`.
- `npm run art:studio -- --request "generate an animated elevator arrival loop for the lobby"` routes to `animation`.

Every adaptive packet records the raw request, inferred type, routing reason, confidence, required outputs, acceptance checks, organization policy, quality bar, and the same approval gates as manually typed packets. If the route feels wrong or slow, the Continuous Improvement Gate must add signals or rewrite the router before the next similar run.

## Natural-Language Trigger

When Armaan says "Creative Production Engine" or asks to add/generate Tower visuals, run `npm run art:studio` and follow `.agents/skills/creative-production-engine/SKILL.md`.

## Mandatory Gates

### Housekeeping Gate

Every phase inventories files, labels status, cleans loose artifacts, updates ledgers, and blocks unapproved `public/art` writes.

### Continuous Improvement Gate

Every phase records friction, slowness, errors, manual work, QA failures, confusion, and rewrite triggers. The engine improves itself when a weakness repeats or becomes severe. Repeated medium `quality-failure` entries also trigger `upgrade-required`; alpha failures, fake transparency, broken review images, low-resolution sources, and provider-format drift cannot become permanent background noise.

Run `npm run art:studio -- --mode improve` after major phases or whenever a problem repeats. The report writes `continuous-improvement-report.json`; by the fifth run, repeated friction should force a command, QA gate, fixture, or rewrite before more production work continues.

The command layer records both mandatory gates for orientation and production-packet phases. Later generation, ingest, QA, promotion, and app-integration phases must follow the same ledger contract before any asset is allowed into `public/art`.

## Human Approval Gates

1. Initial direction approval.
2. Final upload-ready approval using `approved for app`.

## V1 Asset Classes

- `character`: cast members, outfits, poses, expressions, and motion profiles.
- `environment`: floor backgrounds, lighting states, and responsive crops.
- `prop`: transparent props and storytelling objects.
- `ui-texture`: approved raster materials and interface surfaces.
- `animation`: ambient loops, transition motion, and sprite-state motion.
- `scene`: composed Tower moments for onboarding and floor beats.
- `icon-system`: custom symbols only where library icons are insufficient.
- `marketing-hero`: public-facing Tower imagery.

## Creative Capabilities

The engine is broader than static image generation. Every asset type maps to capability instructions for one or more of:

- raster concept art and transparent production assets
- responsive environments and marketing compositions
- UI surfaces and real app UI components
- shader effects and WebGL/WebGPU/Three.js scenes
- CSS, GSAP, canvas, sprite, and motion systems with reduced-motion fallbacks
- iconography systems and human review boards
