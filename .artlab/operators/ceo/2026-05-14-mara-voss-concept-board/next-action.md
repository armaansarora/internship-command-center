# Tower Character Operator Packet

## Next Legal Action

- Character: Mara Voss (ceo)
- Run id: 2026-05-14-mara-voss-concept-board
- Action: generate-concept-board
- Status: blocked-on-human-choice
- Human gate: initial-character-design
- Blocked until: Armaan chooses one initial character design from the 12-option concept board.

Generate exactly 12 initial design concepts before any production run exists.

## Files

- nextActionJson: `.artlab/operators/ceo/2026-05-14-mara-voss-concept-board/next-action.json`
- nextActionMarkdown: `.artlab/operators/ceo/2026-05-14-mara-voss-concept-board/next-action.md`
- conceptPrompt: `.artlab/operators/ceo/2026-05-14-mara-voss-concept-board/concept-board-prompt.md`

## Allowed Commands

- `npm run art:operate`
- `npm run art:status`
- `npm run art:plan`
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
