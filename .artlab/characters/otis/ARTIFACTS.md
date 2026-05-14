# Otis Artifacts Index

Last organized: 2026-05-14
Run: 2026-05-14-otis-pilot
Status: promoted

## Keepers

- Approved identity reference: `.artlab/characters/otis/references/identity/otis_identity-outfit-variants_v001_reference.png`
- Expression reference: `.artlab/characters/otis/references/expressions/otis_expression-sheet_v001_reference.png`
- Pose-sheet references: `.artlab/characters/otis/references/pose-sheets/<outfitVariant>/otis_pose-sheet_<outfitVariant>_v001_reference.png`
- Run ledger: `.artlab/runs/otis/2026-05-14-otis-pilot/run.json`
- Prompt packet: `.artlab/runs/otis/2026-05-14-otis-pilot/prompts/batch-prompt-packet.md`
- Labeled prototype source copies: `.artlab/runs/otis/2026-05-14-otis-pilot/incoming/prototype-transparent-sources/<outfitVariant>/<pose>.png`
- 4K masters: `.artlab/characters/otis/masters/<outfitVariant>/<pose>.png`
- QA previews: `.artlab/characters/otis/qa/2026-05-14-otis-pilot/<outfitVariant>/<pose>-dark.png` and `<pose>-light.png`
- Staged derivatives: `.artlab/characters/otis/staged-public/2026-05-14-otis-pilot/art/lobby/otis/<outfitVariant>/<pose>.webp`, `@2x.webp`, `@3x.webp`
- Promoted app derivatives: `public/art/lobby/otis/<outfitVariant>/<pose>.webp`, `@2x.webp`, `@3x.webp`
- Approved manifest entries: `src/lib/visual-assets/approved-character-assets.generated.json`
- Final review board: `.artlab/runs/otis/2026-05-14-otis-pilot/review/final-upload-ready-board.html`
- Final review screenshot: `.artlab/runs/otis/2026-05-14-otis-pilot/review/final-upload-ready-board.png`
- Browser QA: `.artlab/runs/otis/2026-05-14-otis-pilot/browser-qa/`

## Wiped

- `.artlab/characters/otis/production-candidates/`: removed old loose 340x580 sprite clutter after labeled run-owned source copies were created.
- `.artlab/characters/otis/production-source/`: removed no-alpha pose sheets that are not production-safe.
- Old loose `expressions/`, `outfits/`, and `poses/` folders: moved useful boards into labeled `references/`.

## Quality Notes

- The staged pilot sprites passed technical QA.
- Every source sprite in this pilot is still marked as prototype-sized and upscaled in the run ledger: `source-long-edge-below-4096` and `source-upscaled-to-master`. This means the board is reviewable, but the quality warning stays visible until truly high-resolution generated sources replace it.
- The pilot has been promoted into `public/art` after Armaan's exact `approved for app` phrase.
- Browser QA passed for `/lobby` and `/lobby/onboarding` on desktop and mobile after the `/art` public-path middleware fix.
