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

- **Symbol:** **The Keystone** — an architectural capstone with an ascending lit passage (the cap-stone
  of the climb; "getting in" in the negative space). *I overrode the panel's raw winner `keyhole-tower`
  on rootedness/ownability grounds — see Phase 1.*
- **Look + tech:** Flat geometric **Art-Deco**, solid **matte gold** `#C9A84C`; the doorway is a **true
  negative-space cut** to navy with a **cream `#F5F1E8` light-pillar** as the soul. **Inline SVG** (evenodd
  compound path), no filters/gradients at rest; CSS/GSAP on the light only; gradient/halo **reserved for
  the active state**. (Panel winner `negative-cut`, confirmed by my own pixels.)
- **Motion/soul:** The **cream light is the soul** (body stays still — the Claude/Luxo playbook). Idle =
  a calm 7s breathe (the light swells in place). 4 states + a designed reduced-motion still. (Chosen via a
  motion filmstrip study — `docs/research/_renders/motion-study.png`.)
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

### Phase 1 — Choose the SYMBOL · DONE
- Ran `explore-and-judge.workflow.js` on **16 derived candidates** (20 agents; 3-lens adversarial
  pixel panel renders each to PNG at hero/24px/silhouette → a director picks). Hardened the script to
  accept string-encoded `args` (the first launch returned "no items" because args arrived as a string).
- **Panel's autonomous winner:** `keyhole-tower` (7.8) — silhouette-bulletproof, wins both legibility &
  meaning lenses. **Panel alternates:** `keystone` (7.1, *highest rootedness 7.7*), `crown-cap` (6.9),
  `t-tower` (6.4). The pixel panel correctly killed weak ideas: `keystone-threshold` (5.4, reads as a
  drinking glass), `pillar-light` (4.5, coffee cup), `floor-stack` (4.5, hamburger menu), and the
  cliché controls `lodestar`/`chevron-apex`/`summit`.
- **My decision (taste gate — founder's stand-in): `keystone` ("The Keystone"), overriding the panel.**
  I rendered the top 4 myself and looked at the pixels (`docs/research/_renders/p1-*-proof.png`).
  `keyhole-tower` reads as an **unmistakable keyhole = security/login/password app** at *every* size — a
  rootedness/ownability failure for an internship-climb product, and the exact "unintended object
  misread" standard the panel used to disqualify others (glass, coffee cup) but waived for the keyhole on
  a "tower-mass rescue" the pixels don't deliver. `keystone` is the highest-rootedness candidate, reads
  as a clean architectural **capstone with an ascending lit passage** (the cap-stone of the climb; the
  glow of the floor above), has **zero** security/object baggage, holds as one nameable shape at 24px
  grayscale + silhouette, and is highly characterizable (one warm light breathing up the passage).
- **Runner-up kept for one-move override:** `keyhole-tower` (the silhouette-strongest pick) — see the
  override section at the bottom of this file.
- **Base mark saved:** `docs/research/_marks/symbol-keystone.svg`. Full panel data: `docs/research/_phase1.json`.
  All 16 rendered candidates: `docs/research/_renders/p1-*.svg`.

### Phase 2 — Choose LOOK + TECH · DONE
- Ran `explore-and-judge` on **14 treatments** of The Keystone (silhouette held constant; art-style ×
  tech varied), including research-predicted "cheap on navy" controls.
- **Panel winner (confirmed by my own pixels): `negative-cut` (8.78)** — solid matte-gold Art-Deco
  keystone with the doorway as a **TRUE negative-space cut to navy** + a **cream `#F5F1E8` light-pillar**
  rising in the passage. Top silhouette-safety (9.0); #1 on all three lenses; the "getting in" is the cut
  itself, so it survives bare silhouette where every fill-light rival collapses to a featureless trapezoid.
- **Alternates:** `line-fill-hybrid` (8.2, safest favicon-grade — kept as the small-size fallback),
  `flat-vgrad` (7.9 — its warm welling glow is adopted as the **active/hover state**), `flat-matte`
  (7.7 — rejected: no soul-light and the dark counter misreads as the letter **"A"**).
- **Controls behaved exactly as the research predicted** (pixels confirm): `holographic` 4.7 (gamer-RGB/NFT),
  `glass` 4.4 (vanishes on navy), `soft-emboss` 4.3 (worst small-size), `metallic-ramp` 5.4 (tarnished/Web3).
- **TECH (unanimous across lenses + research):** inline SVG, single **evenodd** compound gold path + one
  cream path for the soul, `role="img"` + `<title>/<desc>`, themeable via fill tokens; **NO filters/gradients
  at rest** (they were the 24px killer on soft-emboss/engraved); reserve gradient + a breathing radial halo
  (CSS/GSAP transform+opacity, reduced-motion fallback, zero network) **strictly for the ACTIVE state**.
- **Ship refinements to apply in Phase 5** (director's synthesis): sharpen the Deco apex, tighten the
  squat taper toward a stricter narrows-upward keystone with optical top overshoot, warm the cream to
  `#F5F1E8`.
- **Marks saved:** `docs/research/_marks/look-keystone.svg` (resting), `look-keystone-idle.html`,
  `active-state-ref.html`. Panel data: `docs/research/_phase2.json`; all 14 renders: `docs/research/_renders/p2-*`.

### Phase 3 — Characterize (motion / soul) · DONE
- The pixel panel judges *static frames* and can't see motion, so I ran a **motion filmstrip study**
  instead (`docs/research/_renders/motion-study.png`): the negative-cut glyph with **3 idle characters**,
  each shown at low/mid/high animation phase so the *range* is visible.
- **Decision — Idle = Variant A "Breathe":** the cream light swells *in place* (opacity 0.5↔0.95 + scaleY
  0.9↔1.0 from the base), ~7s settle curve. Calmest, most premium, silhouette-stable. Rejected: **B Ascend**
  (the glide detaches the light and leaves a void — reads "loading," too restless for an always-on idle;
  kept as a one-shot login/arrival reveal) and **C Breathe+Halo** (richer, but the halo is held back for
  hover/active).
- **The soul lives in the cream LIGHT** — the gold keystone body stays institutional and still; all life is
  in the one breathing light (the Claude-icon / Pixar-Luxo "motion in one element" playbook).
- **4-state + reduced-motion grammar (locked in MARK-SPEC):** Idle (7s breathe) · Hover (light→full +
  warm halo bloom + ~1px lift, 250ms) · Active/thinking (reserved gradient welling-glow + halo pulse,
  ~1.6s loop — the mark *is* the spinner) · Notify (one soft gold ring from the apex + brief flare, 900ms
  once) · Reduced-motion (a designed steady still at light-opacity 0.70 — not a frozen mid-frame).
- **Saved:** `docs/research/_marks/mark-idle.html` (canonical idle), `mark-final-glyph.svg` (rest tile),
  `mark-glyph-bare.svg` (no-ground, for in-app). Rest glyph **passes the 24px grayscale gate**
  (`docs/research/_renders/mark-final-proof.png`).

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
