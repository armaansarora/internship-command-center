# ArtLab — Character Pipeline

Consolidated from six legacy docs (now in `docs/legacy/`): CHARACTER-ART-PIPELINE.md, CHARACTER-IMAGE-OPERATIONS.md, CHARACTER-IMAGE-PROMPTS.md, CHARACTER-PROMPTS.md, CHARACTER-BIBLE.md, CHARACTER-RELATIONSHIPS.md.

## Style envelope (locked)

`tower-flat-plus-depth-v1`. Premium stylized high-detail app/game character art. Strong silhouettes, crisp raster forms, controlled depth, adult professional energy, full-body app-sprite framing, controlled Tower lighting, `Professional Scars` tone.

## Production matrix (per character)

- **Outfit variants:** `regular`, `summer-light`, `winter-layered`.
- **Pose/expression states:** `idle`, `greeting`, `listening`, `thinking`, `talking`, `alert`, `working`.
- **Total source sprites:** 3 × 7 = 21.

## Concept lanes (always 5 in parallel)

Variation lives ONLY in: silhouette, age read, hair shape/length/texture, facial structure, wardrobe category, color palette, posture/body language, accessories/tools, personality read, Tower role archetype.

Variation NEVER lives in: rendering style, line weight, color depth, framing — those are the locked style envelope.

## Character roster

| ID | Floor | Role | Status |
|---|---|---|---|
| otis | Lobby | Concierge | Promoted (legacy-import) |
| ceo | Penthouse | Mara Voss (CEO) | Promoted (legacy-import) |
| rafe | Floor 7 (War Room) | Rafe Calder — Phase 4 go-live | Promoted |
| priya | Floor 7 (War Room) | CRO | Phase 6 |
| dylan | Floor 6 (Rolodex) | CNO | Phase 6 |
| vera | Floor 5 (Writing Room) | CMO | Phase 6 |
| sol | Floor 4 (Situation) | COO | Phase 6 |
| inez | Floor 3 (Briefing) | CPO | Phase 6 |
| mina | Floor 2 (Observatory) | CFO | Phase 6 |
| etta | Floor 6 (Rolodex) | CIO | Phase 6 |
| rowan | Floor 4 secondary | Ops support | Phase 6 |
| nadia | Floor 3 secondary | Interview prep | Phase 6 |

## Cast coherence (auto-checked at concept board)

- **Silhouette hash** — sharp foreground bbox shape.
- **Palette histogram** — k-means top 5 colors.
- **Age impression** — LLM-estimated 20–70.
- **Diversity rule** — no two lanes too similar.
- **Cohesion rule** — no lane too close to an existing promoted character (would read as them).
- **Style-envelope rule** — no lane drifts outside the locked envelope.

Failures trigger `style-failed` blocker; engine regenerates with prompt hardening up to 3 consecutive times before escalating.

## Memory feed-forward

Every promoted character writes a `style-wins.jsonl` entry. Every rejected concept writes a `style-rejections.jsonl` entry. The LLM brain reads both via `getRelevantMemory` before generating the next character's prompts — so the cast accumulates lessons.

## Quality failures that block promotion

- soft / blurry / pixelated / upscaled source art
- fake-perfect faces, hair, teeth, jawlines
- non-human proportions (unless character canon explicitly calls for them)
- cropped hands, feet, props, silhouette
- haloing around transparent edges
- outfit drift across variants
- identity drift across poses
- weak mobile read at app scale
- mismatched Tower style or too much realism
- missing image files or broken preview references

## Non-negotiables

- The four Lobby backgrounds (`public/lobby/bg-1.jpg`…`bg-4.jpg`) are protected.
- Otis (`public/art/lobby/otis/`) and CEO/Mara (`public/art/penthouse/ceo/`) are byte-protected by the CI gate (Task 4.10).
- `src/lib/visual-assets/approved-character-assets.generated.json` is the production character manifest — only modified through the promotion firewall.
