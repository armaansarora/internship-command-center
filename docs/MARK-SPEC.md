# The Tower — Mark Specification (LOCKED)

*The single source of truth for The Tower's identity mark. Locked by the Visual-Identity Autopilot run
(2026-05-31) after research → 3 pixel-judged panels → a motion study. Build to this exactly. Decision
trail + how to override any pick: `docs/MORNING-REVIEW.md`. Research foundation: `docs/research/IDENTITY-RESEARCH.md`.*

---

## 0. The mark, in one line

**The Keystone Tower** — a flat, matte-gold **Art-Deco tower** with a squared **keystone cornice cap**
and a tall **arched doorway cut as true negative space**, with a **cream light** standing in the archway.
The gold body is still and institutional; **all life is in the light** — a calm breath that says *the floor
above is lit, and the way in is open*. It is, literally, **the Tower** — the building you enter.

Why this mark (rooted in the product): the Tower itself (the sacred building metaphor), the climb to a
first offer (the vertical ascent), **getting *in*** (the lit archway / threshold), guidance and arrival
(the light above). It deliberately occupies the **cool,
architectural, weight-bearing** whitespace — the inverse of the warm AI-spark monoculture and the opposite
of the career-category handshake/ladder/arrow/star clichés.

---

## 1. LOCKED invariants (do not change without a founder decision)

### 1.1 Shape DNA — the exact geometry
- **Canvas:** `viewBox="0 0 120 120"`. The glyph is built and centered on this grid.
- **Three elements, in z-order:** (1) optional navy ground tile, (2) the gold tower body
  (single contour — the archway is a concave notch in the base, a TRUE cut to the ground), (3) the
  cream light standing in the archway.
- **Tower body** — a **vertical** shaft (taller than wide → reads as a tower) topped by a **squared
  Art-Deco cornice cap** (the "keystone" crown — wider than the shaft, flat top, crisp corners), with a
  tall **arched doorway** cut up from the base. Verticality + the cornice are what make it read as an
  architectural tower and never as a letter. **Locked path:**
  ```
  M44 96 L44 44 L38 44 L38 33 Q38 31.5 39.5 31.5 L80.5 31.5 Q82 31.5 82 33 L82 44 L76 44
  L76 96 L66 96 L66 72 Q66 62 60 62 Q54 62 54 72 L54 96 Z
  ```
- **Cream light** — a vertical, round-topped bar standing in the archway from the base. **Locked path:**
  ```
  M60 65 Q64.5 65.5 64.5 74 L64.5 96 L55.5 96 L55.5 74 Q55.5 65.5 60 65 Z
  ```
- **The silhouette is sacred.** The recognizable outline = cornice cap + vertical shaft + arched void +
  central light. Animation may **never** alter this outline (see §3). The archway must remain a clean cut
  to the ground at every size.
- **History:** an earlier upward-narrowing "keystone wedge" geometry was rejected after an adversarial
  pixel review found its bare silhouette read as the capital letter **"A"** (wrong initial; a ship-gate
  failure). The locked geometry above is the correction — a true vertical tower.

### 1.2 Palette tokens (luminance is the law)
| Token | Hex | Role | Notes |
|---|---|---|---|
| `--mark-navy` | `#1A1A2E` | ground tile / the void in the cut | the Tower dark |
| `--mark-gold` | `#C9A84C` | keystone body (matte, solid) | gold-on-navy ≈ **7:1** (passes WCAG) |
| `--mark-light`| `#F5F1E8` | the light-pillar (the soul) | warm cream |
| `--mark-light-rest` | `#F5F1E8` @ **0.85** | resting light opacity | designed reduced-motion still (kept high so cream stays warm) |
| `--mark-glow` | `#FBE9B0` | **active-state only** warm welling glow | never used at rest |
- **Gold is matte and solid at rest** — no gradient, no bevel, no filter (those collapse at 24px). A single
  subtle vertical gold gradient (`#D8B964 → #C2A047`) is *permitted* at hero size only; the canonical mark
  is flat `#C9A84C`.
- Never put `--mark-gold` on `--mark-light`/cream as a foreground pair (gold-on-cream ≈ 2.1:1, **fails**).

### 1.3 Frame rules
- **App-icon / favicon tile:** the glyph on a **navy rounded-square**, `rx=26` at 120px (corner ratio
  ≈ 0.217 — iOS-superellipse-adjacent). This is the only framed form.
- **In-app (FloorMark):** the **bare glyph** (no tile) sits on the floor's own background.
- **No seal ring on the core mark.** The seal-framed treatment was judged and rejected (dissolves to a coin
  at small size). The keystone *is* its own frame.

### 1.4 Tech (locked)
- **Inline SVG**, hand-authored, SVGO-clean. The gold body is one evenodd compound path; the light is one
  path. `role="img"` + `<title>`/`<desc>`. Themeable via fill tokens / `currentColor` where applicable.
- **No filters/gradients in the resting state.** Motion is CSS (and optionally GSAP via `@/lib/gsap-init`)
  on the **light only** — `opacity` + `transform: scaleY()` from the base. Never animate the gold outline.
- **Gradient + radial halo are reserved strictly for the ACTIVE/thinking state.**
- No WebGL, no Rive/Lottie, no network/CDN. Ships at ~0 bundle cost, GPU-cheap, accessible.

---

## 2. Variant system (governed)

| Variant | Ground | Gold | Light | Use |
|---|---|---|---|---|
| **gold-on-navy** *(default)* | navy | `#C9A84C` | cream | dark app, the canonical mark |
| **navy-on-cream** | cream `#F5F1E8` | navy `#1A1A2E` | navy/gold | light mode, print, email |
| **1-color silhouette** | — | `currentColor` | (cut stays open) | masks, stencils, High-Contrast |
| **reduced-motion still** | navy | `#C9A84C` | cream @ 0.70 | `prefers-reduced-motion` |

Favicon/app-icon set (all from the same path): `favicon.svg` (prefers-color-scheme pair), `icon-16/32`,
`apple-icon-180` (navy tile, no transparency), `icon-192/512` (maskable safe-area).

---

## 3. Motion grammar (4 states + reduced-motion)

**Soul:** the cream **light** carries 100% of the life; the gold body never moves. Silhouette-stable —
animate value/scale, never outline. Calm, slow, organic. Always honor `prefers-reduced-motion`.

**Motion tokens:** durations `{ instant 90ms, fast 150ms, base 250ms, slow 600ms, ambient 7000ms }`;
curves `{ settle: cubic-bezier(.45,0,.55,1) (idle), out: cubic-bezier(.22,1,.36,1) (reactions) }`.

| State | What happens | Timing |
|---|---|---|
| **Idle** *(always-on)* | light **breathes** in place: `opacity .62↔1`, `transform: scaleY(.92↔1)` from the base (floor kept high so the cream stays warm) | 7s `settle`, infinite |
| **Hover** | light → full (`.95`); a faint warm **halo** blooms behind the doorway; whole mark lifts ~1px; gold warms ≤5% | 250ms `out` |
| **Active / thinking** | reserved **gradient welling-glow** + halo pulse up the passage — the mark *is* the spinner | ~1.6s loop |
| **Notify** | one soft **gold ring** emanates from the apex + a brief light flare, then settles to idle | 900ms once |
| **Reduced-motion** | no animation; light rests at **opacity 0.85** — a fully-formed, designed still | — |

---

## 4. Floor token contract (one mark, nine floors)

One **locked silhouette** is the immutable constant; floors vary only a per-floor **accent** (the tint of
the light + any floor glow). This lives in `src/lib/config/floors.config.ts` and is consumed by
`<FloorMark/>`. Lobby is the canonical/default.

```
FloorAccent = { id, label, name, room, accent /* hex tint for the light */ }
```
Default accents stay in a **narrow warm-gold family** (a deliberately narrow palette is itself a premium
signal); the Observatory is the single permitted cool "platinum" exception (analytics / night). These are
the easily-overridable per-floor knob — see `docs/MORNING-REVIEW.md`.

---

## 5. THE SHIP-GATE — 24px grayscale silhouette

**A change to the mark ships only if, at 24px, in grayscale, it is still instantly nameable as the
keystone-with-lit-passage and carries no unintended object/anatomy misread.** Also test bare 1-bit
silhouette (the doorway must read as a clean void).

**How to test (repeatable):**
```
node docs/research/render.mjs --svg <mark>.svg --proof out-proof.png
```
This emits a proof sheet at hero / favicon-24 / 24→120-nearest / grayscale / silhouette. Eyeball it.
The locked mark's passing proof: `docs/research/_renders/mark-final-proof.png`.

**Pass criteria:** (1) reads as one capstone-with-doorway shape at 24px; (2) the cut stays open in
grayscale and silhouette; (3) no coin/blob/letter/keyhole/tool misread; (4) the light is visible at rest
but the mark is still legible with the light removed.

---

## 6. Guardrails (locked do-nots)
- **Never** animate or distort the gold outline; life is in the light only.
- **No** filters, bevels, gradients, or glow on the **resting** mark (24px killers). Gradient/halo = active only.
- **No** seal ring, **no** literal key/keyhole (security-app misread — the reason the panel's raw winner was
  overridden), **no** AI spark/asterisk, **no** career handshake/ladder/arrow/star.
- **No** gold-on-cream foreground pairing (fails contrast). Provide the navy-on-cream variant instead.
- Keep it **calm** — no bounce, no motion sickness; `prefers-reduced-motion` always resolves to the designed still.
