# The Tower — Visual Identity AUTOPILOT

**This plan runs UNATTENDED, overnight, to completion.** The founder dropped one `/goal` and went to sleep. You make every decision yourself and leave a morning-review package. Read `docs/VISUAL-IDENTITY-BRIEF.md` first for the mission, the immutable frame, and the taste bar — then execute this.

---

## Autonomy contract (read this twice)

- **Never wait for the founder.** Every taste decision is yours. Decide via the pixel-judged adversarial panel in `docs/research/explore-and-judge.workflow.js` (3 independent lenses → a director picks a winner), then **log the decision and keep going**.
- **Don't halt on failure — degrade and continue.** If a step can't pass after **3 attempts**, write what happened to `docs/MORNING-REVIEW.md`, take the best-scored available option, and proceed. The only thing that justifies stopping is an **unrecoverable repo state** (the app won't build at all and you can't fix it).
- **Everything is additive and reversible.** Delete nothing. The pilot ships behind a **new route** (`/lobby-pilot`), never replacing the live lobby. This is what makes overnight autonomy safe: the founder can compare, keep, or bin it in the morning with one decision.
- **Stay on a branch. Never touch prod.** Work on branch `identity/autopilot`. Commit freely. **Do not merge to `main`, do not push, do not deploy, do not open a PR** (main auto-deploys to production). Never modify byte-protected assets (`public/lobby/bg-*.jpg`, `public/art/lobby/otis/`, `public/art/penthouse/ceo/`). No secrets.
- **Think fresh.** Ignore prior design artifacts in the repo (old `docs/glyph-*.html`, memory notes, retired art). Your foundation is the research you run in Phase 0, nothing else.
- **Log as you go.** Maintain `docs/MORNING-REVIEW.md` from Phase 0 onward — append after every phase. It is the founder's map in the morning.

## Tooling

- **Workflow widens.** Use the **Workflow** tool for all breadth: research (Phase 0) and every exploration round (Phases 1–3) via `docs/research/explore-and-judge.workflow.js` (pass candidates as `args`; you derive the candidate lists from your own research).
- **`/goal` closes.** You are already running under `/goal`; just keep working until the Done condition closes.
- Wrap workflow agents in `safe()` and cap output (already done in the provided scripts). After any workflow returns, **render its winning marks yourself (headless Chrome) and look at the pixels** before trusting a result.

---

## Phases

Each task is a checkbox. Each phase ends with an **Acceptance criteria** block you must satisfy before moving on (or log a degrade and continue).

### Phase 0 — Research
- [ ] Launch `Workflow({ scriptPath: "docs/research/identity-research.workflow.js" })` (~220 agents, 20 domains).
- [ ] Write the returned `compendium` to `docs/research/IDENTITY-RESEARCH.md`; dump per-domain syntheses below it.
- [ ] Read it fully; extract the **Design Opportunity Space** into a short working list of symbol candidates + style/tech options.

**Acceptance:** `docs/research/IDENTITY-RESEARCH.md` exists and is non-trivial; you have a derived candidate list.

### Phase 1 — Choose the SYMBOL
- [ ] From the research, define **12–18 candidate symbols** rooted in the Tower + the internship journey (the climb / getting in / the offer / guidance / growth / the Tower itself). Each: `{ key, name, direction }`.
- [ ] Run `Workflow({ scriptPath: "docs/research/explore-and-judge.workflow.js", args: { context, craftSpec, items, judgeCriteria: ["rootedness","ownability","premium","silhouetteSafe","characterizability","craft"], topN: 3 } })`.
- [ ] Record `decision.winner` + alternates; render them yourself to confirm the pixels.
- [ ] Append the symbol decision (+ why) to `docs/MORNING-REVIEW.md`.

**Acceptance:** one symbol is chosen and justified; its base SVG is saved.

### Phase 2 — Choose the LOOK + TECH
- [ ] Build **12–18 treatments** of the chosen symbol across art-styles × rendering-tech (flat, Art Deco, engraved, glass, neumorphic, metallic, holographic, monoline, line-art, Canvas-2D, pure-CSS, WebGL/shader, SVG-filters, particles, …). Each: `{ key, name, direction }`.
- [ ] Run the explore-and-judge workflow again on these treatments (judgeCriteria: `["styleExecution","premium","distinctiveness","silhouetteSafe","techSoundness","craft"]`).
- [ ] Pick the winning **look + tech**; confirm it renders correctly headless. Prefer a tech that is performant, accessible, and reasonable to ship (SVG/CSS/Canvas before heavy WebGL unless the payoff is clear).
- [ ] Append the look/tech decision to `docs/MORNING-REVIEW.md`.

**Acceptance:** one look + tech chosen and justified; a production-grade animated mark exists.

### Phase 3 — Characterize it (motion / soul)
- [ ] Define the mark's **motion grammar**: a calm idle (always-on, barely-perceptible), plus hover, thinking/active, and a notify state. Honor the house rule: slow, organic, no motion-sickness; respect `prefers-reduced-motion` (freeze to a clean still).
- [ ] If useful, generate 2–4 idle/character variants and judge them; pick one. Give the mark its identity (where the eye/posture/gaze lives).
- [ ] Append the characterization decision to `docs/MORNING-REVIEW.md`.

**Acceptance:** a single characterized, animated mark with a defined 4-state motion grammar.

### Phase 4 — Lock the spec
- [ ] Write `docs/MARK-SPEC.md`: the locked invariants (shape DNA, palette tokens, the seal-ring/frame rules, the chosen tech), the 4-state motion grammar, and a **24px grayscale silhouette ship-gate** (the mark must be recognizable and premium at 24px in grayscale).

**Acceptance:** `docs/MARK-SPEC.md` exists and locks the invariants + the ship-gate.

### Phase 5 — Build the Lobby pilot (additive)
- [ ] Add `src/lib/config/floors.config.ts` (or the established config location) holding at minimum the **Lobby** variant — accent + stamp per the spec — structured so all 9 floors can follow later.
- [ ] Build a `<FloorMark/>` component (and `<FloorStamp/>` if the spec calls for it) that renders the locked, characterized mark per the chosen tech, following repo conventions (Server Components by default, `"use client"` only when needed, `import type { JSX } from "react"`, GSAP via `@/lib/gsap-init`, no `any`, no `console.log`, no TODO/FIXME, aria + reduced-motion).
- [ ] Wire it into a **new** `/lobby-pilot` route (additive — do not alter the live lobby) so the founder can A/B it.
- [ ] Generate favicon/app-icon assets from the mark and verify the 24px grayscale gate.

**Acceptance:** `/lobby-pilot` renders the characterized mark; favicon assets exist and pass the gate.

### Phase 6 — Verify, package, commit
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npm test` exits 0.
- [ ] Build a **review gallery** `docs/glyph-autopilot-review.html`: the chosen mark (animated) + the runners-up at each decision, with scores and the silhouette/24px proofs, so the founder can eyeball everything in one page.
- [ ] Finalize `docs/MORNING-REVIEW.md`: a top-down summary — what you chose at each phase and why, links to the gallery + the `/lobby-pilot` route + `MARK-SPEC.md`, anything you degraded/skipped, and **exact instructions to override** any decision (which file/flag to change).
- [ ] Commit all work to branch `identity/autopilot` with clear messages. **Do not push / merge / deploy.**

**Acceptance (DONE condition — all must hold):**
1. `docs/research/IDENTITY-RESEARCH.md` exists.
2. `docs/MARK-SPEC.md` locks the mark + the 24px grayscale gate.
3. The chosen mark is built (`<FloorMark/>` + `floors.config.ts`) and wired into `/lobby-pilot`.
4. Favicon/app-icon assets exist and pass the 24px grayscale gate.
5. `npx tsc --noEmit && npm run lint && npm test` all exit 0.
6. `docs/glyph-autopilot-review.html` and `docs/MORNING-REVIEW.md` exist and are complete.
7. All work committed to `identity/autopilot` (not merged, not pushed).

When all seven hold, stop — the morning-review package is the handoff back to the founder.
