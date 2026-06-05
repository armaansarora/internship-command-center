# Tower Character Asset Handoff

This is the practical handoff contract for turning approved generated character art into live app assets. It exists so the image generation phase can end with files that drop into the manifest without a design or engineering guessing game.

## Non-Negotiables

- No draft, rejected, or pending image goes into `public/art`.
- No image goes into `src/lib/visual-assets/manifest.ts` until Armaan explicitly approves it.
- Every character has exactly three approved outfit variants: `regular`, `summer-light`, and `winter-layered`.
- Seasonal outfit variants must be edits of the approved base outfit, not new costumes or redesigns.
- Every approved production sprite is generated from a 4K transparent master, then exported as responsive WebP derivatives.
- Manifest entries must be produced from the expected slot contract in `src/lib/visual-assets/production-contract.ts`.
- Approved character manifest entries are generated into `src/lib/visual-assets/approved-character-assets.generated.json` by the batch pipeline.
- The app can tolerate missing sprites because `CharacterSprite` has a typed fallback for every Season 1 character; approved art simply replaces that fallback.

## No Quality Compromise Gate

Approval boards prove taste and direction. They do not prove production readiness.

Before any character image is copied into `public/art` or added to the manifest, it must pass a separate technical QA pass:

- It must exist as an individual sprite file, not only as part of a board.
- It must be previewed on a Tower-dark background and a light neutral background.
- The dark-background preview must show no obvious color spill, edge halo, chopped edge, missing limb, clipped prop, or accidental neighbor fragment.
- The sprite must preserve identity, outfit variant, pose intent, body proportions, face read, and mobile silhouette from the approved references.
- The sprite must use the locked frame dimensions and leave safe padding around hair, hands, props, and feet.
- The source must include a 4K transparent master with a target long edge of 4096px.
- The production export must include the default file, `pose@2x.webp`, and `pose@3x.webp` derivatives.
- The file must be visually good at app scale and remain clean under browser zoom, not merely attractive on an approval board.
- The user-facing approval phrase for production integration is `approved for app`; any weaker approval keeps the image in `.artlab`.

If an asset fails any item above, regenerate or reprocess it. Do not rationalize it into production.

## Production Directories

| characterId | Character | Production directory |
| --- | --- | --- |
| otis | Otis Vale | `/art/lobby/otis` |
| ceo | Mara Voss | `/art/penthouse/ceo` |
| cro | Rafe Calder | `/art/war-room/cro` |
| cfo | Priya Sen | `/art/observatory/cfo` |
| coo | Dylan Shorts | `/art/situation-room/coo` |
| cmo | Vera Bloom | `/art/writing-room/cmo` |
| cno | Sol Navarro | `/art/rolodex-lounge/cno` |
| cpo | Dr. Inez Park | `/art/briefing-room/cpo` |
| cio | Mina Rook | `/art/research/cio` |
| trust | Etta Knox | `/art/vault/trust` |
| archivist | Rowan Vale | `/art/archive/archivist` |
| red-team | Nadia Flint | `/art/red-team-review/red-team` |

Each character directory expects exactly three outfit folders:

- `regular`: the approved base outfit.
- `summer-light`: the same outfit edited lighter for warm weather, such as Otis with just his shirt/open collar and fewer layers.
- `winter-layered`: the same outfit edited heavier for cold weather, such as Otis with the fuller jacket/layer combo.

Each outfit folder expects exactly seven production sprite sets:

- `idle.webp`, `idle@2x.webp`, `idle@3x.webp`
- `greeting.webp`, `greeting@2x.webp`, `greeting@3x.webp`
- `listening.webp`, `listening@2x.webp`, `listening@3x.webp`
- `thinking.webp`, `thinking@2x.webp`, `thinking@3x.webp`
- `talking.webp`, `talking@2x.webp`, `talking@3x.webp`
- `alert.webp`, `alert@2x.webp`, `alert@3x.webp`
- `working.webp`, `working@2x.webp`, `working@3x.webp`

That makes 252 expected Season 1 character sprites: 12 characters x 3 outfit variants x 7 poses.

## 4K Master And Derivative Layout

Approved source files stay outside production:

- `.artlab/runs/<characterId>/<runId>/run.json`
- `.artlab/runs/<characterId>/<runId>/incoming/`
- `.artlab/runs/<characterId>/<runId>/split/<outfitVariant>/<pose>.png`
- `.artlab/characters/<characterId>/masters/<outfitVariant>/<pose>.png`
- `.artlab/characters/<characterId>/qa/<runId>/<outfitVariant>/<pose>-dark.png`
- `.artlab/characters/<characterId>/qa/<runId>/<outfitVariant>/<pose>-light.png`
- `.artlab/characters/<characterId>/staged-public/<runId>/art/<space>/<characterId>/<outfitVariant>/<pose>.webp`

Production receives only optimized derivatives:

- `public/art/<space>/<characterId>/<outfitVariant>/<pose>.webp`
- `public/art/<space>/<characterId>/<outfitVariant>/<pose>@2x.webp`
- `public/art/<space>/<characterId>/<outfitVariant>/<pose>@3x.webp`

The previous Otis prototype artifacts have been wiped from the active studio state. New Otis work must start from a prompt-only five-option concept board, then use the approved winner as the identity source for the production pack.

## Manifest Drop-In Shape

When a full character run is approved and promoted, the generated manifest data is built through the expected slot shape:

```ts
import {
  buildApprovedCharacterVisualAssetsFromRun,
} from "@/lib/visual-assets";

const approvedOtisAssets = buildApprovedCharacterVisualAssetsFromRun(promotedOtisRun);
```

The generated manifest entries will have:

- `id`: `<characterId>-<outfitVariant>-<pose>`
- `kind`: `character`
- `src`: `/art/<space>/<characterId>/<outfitVariant>/<pose>.webp`
- `width` and `height`: the locked frame size for that character
- `masterQuality`: `4k-source-approved`
- `sourceFrame`: the approved master frame, target long edge 4096px
- `displayFrame`: the CSS/runtime frame
- `safePadding`: top/right/bottom/left padding contract
- `maxDisplayScale`: maximum supported app scale before regeneration is required
- `motionProfile`: the character's runtime motion behavior
- `renditions`: default, retina2x, and retina3x production derivatives
- `role`: production sprite label
- `approvalStatus`: `approved`
- `promptRef`: the character pose-pack prompt ref
- `alt`: accessible character and pose label
- `characterId`
- `outfitVariant`
- `pose`
- `sourceRunId`
- `assetVersion`
- `checksum`
- `sourceResolution`
- `masterResolution`
- `qaStatus`
- `promotionDate`

## Approval Ledger

Armaan has only two human approval gates per character:

| Gate | Status before generation |
| --- | --- |
| Initial character design | Armaan picks one winner reference from the concept board |
| Final upload-ready board | Armaan reviews every staged sprite and says `approved for app` |

Everything between those two rows is internal factory work. Turnaround sheets, outfit sheets, expression sheets, pose/contact sheets, individual sprite sources, 4K masters, derivatives, and QA boards are generated, repaired, or rejected by agents and scripts without repeatedly asking for approval unless the character identity breaks.

## Factory Commands

```bash
npm run artlab -- status
npm run artlab -- health
npm run artlab -- doctor
npm run artlab -- produce "Create five prompt-only initial Otis designs from scratch."
npm run artlab -- continue <runId>
npm run artlab -- answer <runId> "approve direction 3"
npm run artlab -- answer <runId> "approved for app"
npm run artlab -- show <runId>
```

Older `art:*` factory commands live only in legacy docs and should not be used for new runs.

Legacy lower-level operator commands, if needed while reading archived run ledgers:

```bash
npm run art:generate prepare-api --packet <creative-brief.json> --directive <next-image-generation-step.json> --lane-count 5 --concurrency 5 --resolution 4K --aspect-ratio 9:16 --budget-cents 1000
npm run art:generate run-api --plan <gemini-api-plan.json> --max-attempts 3 --request-timeout-ms 300000
npm run art:generate doctor --plan <gemini-api-plan.json> --board <review-board.html>
npm run art:plan -- otis --run-id <approved-otis-production-run> --identity-ref .artlab/characters/otis/references/identity/<approved-file>.png
npm run art:generate cutout-doctor --plan <gemini-api-plan.json> --strict
npm run art:ingest -- <run.json> --source <generated-file.png> --kind individual-sprite --id source-regular-idle --outfit regular --pose idle
npm run art:split -- <run.json> --source-asset <pose-sheet-id>
npm run art:master -- <run.json>
npm run art:qa -- <run.json>
npm run art:review -- <run.json>
npm run art:promote -- <run.json> --approval-phrase "approved for app"
```

Use individual-sprite source ingestion for production-quality replacement work. Preflight must pass before ingest. Pose sheets are useful for contact sheets and broad consistency checks, but they are not production source unless every split cell independently satisfies the native source-resolution contract.

## Image QA Before Manifest

Reject an image before manifest entry if any of these are true:

- It changes identity from the approved reference.
- It only looks good at large size.
- It has fake text, logos, watermarks, signatures, or unreadable letters.
- It includes a background in a production sprite.
- It changes the approved outfit instead of editing the same clothing system into `regular`, `summer-light`, or `winter-layered`.
- It has visible color spill, edge halo, chopped edges, broken alpha, or source-sheet separation artifacts.
- It has not been checked in a dark-background preview and a light-background preview.
- It breaks the character's silhouette or prop read.
- It resembles a real person, actor, celebrity, named fictional character, or protected likeness.
- It does not fit the locked frame safely.
- It lacks a 4K master or any required responsive derivative.
- It looks ultra-realistic, mascot-like, childish, fantasy, sci-fi, or superhero-coded.

## Browser QA After Manifest

After approved files are added:

1. Run the visual asset tests.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Open `/lobby` and `/lobby/onboarding` first because Otis is the pilot.
5. Check desktop and mobile.
6. Confirm no horizontal overflow, no broken images, no overlapping text, and no motion dependency.
7. Check every floor that gets a newly approved character sprite.

## Current State

The fresh-start reset remains active for new character work, but Otis Vale is now the promoted production baseline and should be treated as protected. Mara Voss (`ceo`) is the next unpromoted character unless Armaan explicitly asks to redo Otis.

Run `npm run artlab -- status` before continuing image work; use `npm run artlab -- produce "<request>"` for a new request.
