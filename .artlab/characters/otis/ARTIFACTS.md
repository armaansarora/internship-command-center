# Otis Artifacts Index

Last organized: 2026-05-14
Live run: 2026-05-14-otis-pilot
Active replacement run: 2026-05-14-otis-native-v2
Status: live pilot promoted; native-quality v2 planned

## Keepers

- Approved identity reference: `.artlab/characters/otis/references/identity/otis_identity-outfit-variants_v001_reference.png`
- Expression reference: `.artlab/characters/otis/references/expressions/otis_expression-sheet_v001_reference.png`
- Pose-sheet references: `.artlab/characters/otis/references/pose-sheets/<outfitVariant>/otis_pose-sheet_<outfitVariant>_v001_reference.png`
- Run ledger: `.artlab/runs/otis/2026-05-14-otis-pilot/run.json`
- Replacement run ledger: `.artlab/runs/otis/2026-05-14-otis-native-v2/run.json`
- Prompt packet: `.artlab/runs/otis/2026-05-14-otis-pilot/prompts/batch-prompt-packet.md`
- Replacement prompt packet: `.artlab/runs/otis/2026-05-14-otis-native-v2/prompts/batch-prompt-packet.md`
- Promoted app derivatives: `public/art/lobby/otis/<outfitVariant>/<pose>.webp`, `@2x.webp`, `@3x.webp`
- Approved manifest entries: `src/lib/visual-assets/approved-character-assets.generated.json`
- Final review board: `.artlab/runs/otis/2026-05-14-otis-pilot/review/final-upload-ready-board.html`
- Browser QA ledger: `.artlab/runs/otis/2026-05-14-otis-pilot/browser-qa/browser-qa.json`

## Wiped

- `npm run art:clean -- otis --run-id 2026-05-14-otis-pilot --include-legacy-shared-masters` removed volatile pilot binaries while preserving provenance and live app assets.
- `.artlab/runs/otis/2026-05-14-otis-pilot/incoming/`: removed prototype-sized source copies.
- `.artlab/characters/otis/masters/<outfitVariant>/`: removed legacy shared master folders so v2 must use run-owned masters.
- `.artlab/characters/otis/qa/2026-05-14-otis-pilot/`: removed old QA previews.
- `.artlab/characters/otis/staged-public/2026-05-14-otis-pilot/`: removed stale staged derivatives.
- `.artlab/runs/otis/2026-05-14-otis-pilot/review/final-upload-ready-board.png`: removed old review screenshot.
- `.artlab/runs/otis/2026-05-14-otis-pilot/browser-qa/*.png`: removed old browser screenshots.
- `.artlab/characters/otis/production-candidates/`: removed old loose 340x580 sprite clutter after labeled run-owned source copies were created.
- `.artlab/characters/otis/production-source/`: removed no-alpha pose sheets that are not production-safe.
- Old loose `expressions/`, `outfits/`, and `poses/` folders: moved useful boards into labeled `references/`.

## Quality Notes

- The staged pilot sprites passed technical QA.
- Every source sprite in this pilot is still marked as prototype-sized and upscaled in the run ledger: `source-long-edge-below-4096` and `source-upscaled-to-master`. This means the board is reviewable, but the quality warning stays visible until truly high-resolution generated sources replace it.
- The pilot has been promoted into `public/art` after Armaan's exact `approved for app` phrase.
- Browser QA passed for `/lobby` and `/lobby/onboarding` on desktop and mobile after the `/art` public-path middleware fix.
- Otis v2 uses the same approved design and will replace the live app files only after final QA and the exact `approved for app` phrase.
