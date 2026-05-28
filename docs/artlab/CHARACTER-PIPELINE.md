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

This table mirrors `docs/artlab/sdk/canon/characters/*.yaml` — canon is the source of truth. The drift check at `scripts/artlab-doc-drift-check.ts` (CI: `.github/workflows/artlab-doc-drift.yml`) fails any PR that desyncs this table from the YAMLs.

| ID | Floor | Role | Status |
|---|---|---|---|
| dylan | Floor 4 — The Situation Room | Chief Operating Officer (COO) | queued |
| etta | The Vault | Chief Trust Officer (trust) | queued |
| inez | Floor 3 — The Briefing Room | Chief Preparation Officer (CPO) | queued |
| mara-voss | PH — The Penthouse | CEO — Chief Executive Officer | promoted |
| mina | Research | Chief Intelligence Officer (CIO) | queued |
| nadia | Red Team Review | Red Team Counsel (red-team) | queued |
| otis | L — The Lobby | Lobby Concierge | promoted |
| priya | Floor 2 — The Observatory | Chief Financial Officer (CFO) | queued |
| rafe-calder | Floor 7 — The War Room | Chief Revenue Officer (CRO) | queued |
| rowan | The Archive | Archivist | queued |
| sol-navarro | Floor 6 — The Rolodex Lounge | Chief Networking Officer (CNO) | queued |
| vera | Floor 5 — The Writing Room | Chief Marketing Officer (CMO) | queued |

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
