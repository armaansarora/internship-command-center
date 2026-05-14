# Tower Character Operator Packet

## Next Legal Action

- Character: Otis Vale (otis)
- Run id: 2026-05-14-otis-production-redo-v1
- Action: ingest-generated-sources
- Status: blocked-on-generated-sources
- Human gate: none
- Blocked until: Generated source sheets exist and are ingested into the run ledger.

Continue from the existing run ledger and ingest the next required generated sources.

## Files

- nextActionJson: `.artlab/operators/otis/2026-05-14-otis-production-redo-v1/next-action.json`
- nextActionMarkdown: `.artlab/operators/otis/2026-05-14-otis-production-redo-v1/next-action.md`
- runJson: `.artlab/runs/otis/2026-05-14-otis-production-redo-v1/run.json`

## Allowed Commands

- `npm run art:operate`
- `npm run art:status`
- `npm run art:clean`
- `npm run art:plan`
- `npm run art:preflight`
- `npm run art:ingest`
- `npm run art:split`
- `npm run art:master`
- `npm run art:qa`
- `npm run art:review`
- `npm run art:promote`

## Forbidden Actions

- Do not copy generated files directly into public/art.
- Do not update the approved manifest without a promoted QA-passed run.
- Do not proceed past the initial design gate without Armaan choosing one concept.
- Do not promote without the exact phrase approved for app.
- Do not hide source-quality warnings.
