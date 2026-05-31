# The Tower — Visual Identity · Morning Review

**Run:** Visual Identity Autopilot · unattended overnight
**Date started:** 2026-05-31
**Branch:** `identity/autopilot` (additive only — not merged, not pushed)
**Driver:** `/goal` running `docs/VISUAL-IDENTITY-AUTOPILOT.md`

> This is the founder's map. Top of file = the headline decisions. Each phase appends below
> as it completes, with **what was chosen and why**. Override instructions are at the bottom.
> Nothing here touches the live lobby, main, or any byte-protected asset.

---

## TL;DR (filled in as phases close)

- **Symbol:** _pending Phase 1_
- **Look + tech:** _pending Phase 2_
- **Motion/soul:** _pending Phase 3_
- **Where to see it:** `/lobby-pilot` · gallery `docs/glyph-autopilot-review.html` · spec `docs/MARK-SPEC.md`

---

## Phase log

### Phase 0 — Research · DONE (with a logged degrade)
- Launched `docs/research/identity-research.workflow.js` (~220 agents, 20 domains). **It ran but was
  infrastructure-rate-limited mid-flight** (206 agents started, 1.79M subagent tokens) — only **40 probe
  findings persisted** and the synthesis/compendium layer returned an API rate-limit error
  (`domains: []`). See degrade note below.
- **Recovery (autonomy contract → degrade & continue):** salvaged the 40 probes from the run journal,
  then ran a lean **`docs/research/research-fill.workflow.js`** (one synthesis agent per under-covered
  domain) — **13/13 returned**. Authored the cross-cut **compendium myself** from all of it.
- **Output:** `docs/research/IDENTITY-RESEARCH.md` (~248KB: executive summary + Design Opportunity Space +
  themed insight + constraints + pitfalls + tech/craft, then Appendix A = 13 domain syntheses,
  Appendix B = 40 raw probes). Working data: `docs/research/_research-data.json`.
- **What the research converges on:** a single **keystone / ascent** primitive that doubles as a
  tower-cap + elevator-shaft, with a **lit threshold/window in the negative space** (getting *in*);
  **flat geometric Art-Deco, matte gold on navy**, premium via craft not effects; **inline SVG + CSS/GSAP**;
  soul carried by **one breathing light element** (animate value, not outline); silhouette-safe at 24px
  grayscale. Avoid the AI-spark/asterisk and the career handshake/ladder/arrow/star clichés.
- **Derived candidate lists:** §2a (16 symbol candidates) feeds Phase 1; §2b (treatments) feeds Phase 2.

---

## Degrades / skips / notes
_(anything that failed after 3 attempts and the fallback taken)_

- **Phase 0 — research workflow rate-limited (degraded, recovered).** The ~220-agent
  `identity-research.workflow.js` hit an infrastructure rate limit ("Server is temporarily limiting
  requests · Rate limited") partway through; ~165 of 206 agents failed and the synthesis/compendium
  layer came back empty. **Impact:** none on the final mark — 40 probes (covering the most
  decision-critical domains: iconography, semiotics, living marks, brand systems) survived in the run
  journal and were salvaged, and a lean fill workflow restored the other 13 domains (13/13). The
  compendium is complete. If you want the *full* 220-agent run, re-launch
  `Workflow({ scriptPath: "docs/research/identity-research.workflow.js" })` off-peak.

---

## How to override any decision (one move each)
_(filled in at the end — which file/flag to change for symbol, look, tech, motion, favicon)_
