# The Tower — Visual Identity Brief

*A fresh-start handoff. Everything you need is here. Start from a blank page — older exploratory design files and notes may exist in this repo, but **ignore them**; they will only anchor your thinking. This brief is the source of truth for the **what**. The execution contract — how this runs **unattended, overnight, to completion** — is **`docs/VISUAL-IDENTITY-AUTOPILOT.md`**; follow it exactly.*

---

## Mission

Design the core visual identity for **The Tower**: a single, ownable **symbol** — and then **characterize** it (give it identity and a touch of life). The symbol must be rooted in what the app actually *is*, not generic luxury dressing.

## Step zero — launch the research (do this FIRST, before any design)

Before you sketch a single mark, go wide. Launch the prepared research workflow — it fans out **~220 agents across 20 domains** (iconography, semiotics, brand systems, living/animated marks, character design, art styles, rendering tech, architecture, the career-product landscape, luxury cues, gold/light, typography, small-size behaviour, motion, spatial/game UI, day-night ambience, competitive AI-tool identities, accessibility, bezier craft, and narrative), synthesizes each domain, and produces one dense **research compendium** to design from.

Launch it with the **Workflow** tool:

```
Workflow({ scriptPath: "docs/research/identity-research.workflow.js" })
```

It runs in the background (expect a large, token-heavy run — that's intended; the goal is maximum coverage). When it returns:

1. **Write the returned `compendium` to `docs/research/IDENTITY-RESEARCH.md`** (and, if useful, dump the per-domain syntheses alongside it).
2. **Read it fully.** That compendium — its "Design Opportunity Space" especially — is your foundation.
3. *Then* work the phases in `docs/VISUAL-IDENTITY-AUTOPILOT.md` end-to-end.

Don't skip this. The whole point of the handoff is that you build your own deep, unbiased foundation rather than inheriting anyone's conclusions. (This is Phase 0 of the autopilot plan — the plan owns the full sequence; this section just gets you moving.)

## What The Tower is

The Tower is a premium **internship command center** — a web app a stressed **CS-senior job-seeker** uses to find, track, apply to, and *land* internships (their first real career break).

Its entire experience runs on a **luxury skyscraper metaphor**: you don't "use" software, you **enter a building**. Floors are features, the elevator is navigation, the windows look out on a city skyline. **This building metaphor is sacred and must never be broken.**

## The job

Find the **right symbol** to stand as the Tower's identity, then characterize it.

- **Root it in this app.** Derive the meaning from the internship journey — the climb toward a first job, getting *in*, the offer/the win, guidance, ambition — and/or from the Tower itself. It must read as *of this app*, not a symbol that could belong to anything.
- **Characterize it.** The mark should be able to carry **identity and a little life** — a calm idle, a sense of posture or a gaze — in the spirit of the animated Claude icon or a Pixar Luxo lamp. A symbol with a soul. Not a flat static logo, and not a busy cartoon character either.
- **It's the foundation of a system.** It will eventually flex across the app and live at every size, from a hero on the page down to a favicon.

## The immutable frame (product law — respect these)

- **Palette:** deep navy `#1A1A2E` + gold `#C9A84C` (+ cream `#F5F1E8`).
- **Type:** Playfair Display (display), Satoshi (body), JetBrains Mono (data/numerals).
- **Tone:** luxury game UI × Bloomberg Terminal × Apple spatial. **Premium and calm — never gimmicky, never childish, never "a dashboard with a theme."**
- **Motion:** slow, organic, barely perceptible (Apple-TV Ken Burns calm). No motion-sickness, nothing bouncy. Always respect `prefers-reduced-motion`.

## The bar (what makes a mark good)

- **Premium** at hero size **and recognizable at ~24px grayscale** (the favicon / app-icon test).
- **Silhouette-safe:** the bare outline reads as intended, with zero unintended object or anatomy misreads.
- **Ownable:** distinctive — not a borrowed or generic icon.
- **Characterizable:** can carry identity, posture, and a calm idle.

## How to decide (you decide — the founder reviews in the morning)

The founder is asleep. **You** make every taste call, using the bar above as the rubric. But decide the way the founder would, and leave a trail:

- **Render real pixels, then judge the pixels — never your own claims.** Every option gets screenshotted and judged at hero, ~24px, and bare silhouette by the 3-lens panel in `docs/research/explore-and-judge.workflow.js`. Look at the images yourself before trusting a result.
- **Clarity-first and well-executed.** Do it well, not crazy. Simple and balanced beats busy.
- **Commit, log, and keep moving.** Pick the winner, write *why* into `docs/MORNING-REVIEW.md`, and continue — don't stall on a close call.
- **Make it overridable.** Keep everything additive and behind the pilot route, and leave the runners-up + exact override instructions in the review package so the founder can change any pick in one move.

## Your two power tools — use them aggressively

This work is too big to hand-make. Lean on both:

**`Workflow` — for breadth (research & exploration).** Never craft options one at a time when you can fan out.
- Step zero (above) is already a Workflow.
- For **every design round**, author a Workflow that generates many candidates in parallel, **renders each to actual pixels** (headless screenshot), runs an adversarial **pixel-critique** (judge the rendered image at hero size, ~24px, and bare silhouette — not the model's claims about its own output), and returns a ranked shortlist. Present the shortlist; the founder chooses. Repeat the round per dimension: symbol → art-style/tech → floor variants → motion. Wrap every agent in a `safe()` guard and cap output size (large structured output can abort a run).

**`/goal` — for execution (build to a finish line).** Once the founder **locks** a direction, stop hand-holding — wrap the build in `/goal` and walk it to done.
- Write an implementation plan as checkboxed tasks, each with an explicit **Acceptance criteria** block (e.g. "`docs/MARK-SPEC.md` locks the invariants + the 24px grayscale ship-gate", "`<FloorMark/>` renders the locked mark", "favicon passes the grayscale silhouette gate", "`npx tsc --noEmit && npm run lint && npm test` all exit 0").
- Drive it with **`/goal` as the outer driver + `superpowers:subagent-driven-development` as the inner mechanism** — this repo already uses exactly that pattern; copy the Execution Protocol from `docs/superpowers/plans/2026-05-20-artlab-implementation.md`.
- **Taste gates stay human.** `/goal` runs the mechanical build-out autonomously, but every "which design wins" decision **escalates to the founder** — never let the evaluator decide taste.

**The cadence (unattended):** research (Workflow) → explore a round (Workflow) → **panel decides, you log it** → next dimension → once locked, build → verify (`tsc`/`lint`/`test` green) → leave the morning-review package. `/goal` keeps the whole loop running until the Done condition in the autopilot plan closes. Workflow widens; `/goal` closes.

## Canonical references (product context, not design direction)

- `CLAUDE.md` — architecture, the Design System section, conventions.
- `docs/VISION-SPEC.md` — the spatial / building metaphor (sacred).
- `docs/CHAIN-OF-COMMAND.md` — the floor map (what the Tower contains).
