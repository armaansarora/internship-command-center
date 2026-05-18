# Tower Art Bible

This document is the source of truth for Tower visual assets. The first rule is simple: generated art is treated like production design, not decoration. Nothing becomes app art until it has a prompt reference, an approval record, stable dimensions, and a manifest entry.

## Visual North Star

The Tower should feel like a living internship headquarters: cinematic, adult, precise, and warm at the human touchpoints. The Lobby is the visual bar. Its four existing background plates stay canonical and untouched:

- `public/lobby/bg-1.jpg`
- `public/lobby/bg-2.jpg`
- `public/lobby/bg-3.jpg`
- `public/lobby/bg-4.jpg`

## Style Rules

- Locked character style: `tower-flat-plus-depth-v1`.
- Favor premium web-game sprites over ultra-realism, generic vector art, or mascot cartooning.
- Character art uses clean raster shapes, strong silhouettes, adult professional proportions, subtle depth, controlled rim/highlight, and mobile-readable poses.
- Use true-alpha character sprites in production. Because Gemini API does not reliably produce real transparent PNGs, source prompts must use a flat removable `#00ff00` chroma matte and the local alpha extractor must create the transparent master.
- Use stable room plates for environments.
- Preserve the building metaphor: every asset should feel like it belongs inside the Tower, not beside it.
- Keep UI data legible. Art sits behind, beside, or around work surfaces; it does not obscure decisions.
- Respect reduced motion. Image assets may animate through opacity, transform, or crossfade, but must still read cleanly when static.
- Story tone for character art: Professional Scars. The look must carry the character's wound, doctrine, flaw, and comedic engine without making them melodramatic or silly.
- Production generation path: Creative Production Engine adapter layer. Current v3 paid automation path is Gemini API with Nano Banana 2 (`gemini-3.1-flash-image-preview`) after Armaan approved a limited API budget. The subscription fallback remains Gemini Pro / Nano Banana via `gemini-subscription-browser`; ChatGPT subscription generation remains an allowed fallback.
- Gemini API v3 defaults: initial character design is exactly five total prompt-only concepts, `imageSize: "4K"`, `aspectRatio: "9:16"` for character sprites, `responseModalities: ["IMAGE"]`, Google Search grounding off, and budget-capped plan creation before any billable run.
- Secret rule: API keys are read only from local `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or macOS Keychain service `tower-gemini-api-key`; they must never be written into repo files, command flags, prompt decks, receipts, screenshots, or run JSON.
- Production generation UI settings are part of the art contract. Use Pro, Thinking, Redo with Pro, or highest-quality available mode for production; Fast is draft-only. Default style preset is `none/default`. Do not use the Color block preset for Tower production.
- Subscription UI downloads may be below native 4K even when generated through Pro. The Creative Production Engine must capture the best full-size Pro output, keep source-resolution warnings visible, and block promotion if the final master/derivative QA does not pass.
- Subscription UI work must happen in an isolated Tower Art Studio Playwright Chromium profile, never Armaan's daily Chrome profile. The creative pipeline may use batch boards for broad exploration, but it may not scale by opening many visible provider tabs in the user's browser.
- Style presets can improve consistency only when used as an explicit approved lock. They can also overpower the Tower look. The preferred consistency stack is approved identity reference, locked `tower-flat-plus-depth-v1` prompt language, fixed model/quality mode, fixed camera/canvas, then optional recorded preset only if it wins testing.
- No production character asset may be generated from text alone after a winner reference is approved; future poses and expressions must use the approved identity reference.
- Character pose production uses 4K transparent masters outside `public/art`, then responsive WebP derivatives in production. Low-resolution board crops are direction only, never app art.
- Character production uses the batch factory approval model: Armaan approves the initial identity direction, then the final upload-ready board. Turnarounds, outfit sheets, expressions, pose sheets, splitting, QA, and derivative export are internal pipeline gates.

## Prompt References

### art-bible:lobby-existing-backgrounds

Approved existing Lobby background set. These four assets are already in production and are the environmental anchor for the Lobby art direction.

### art-bible:season-one-character-style-v1

Approved style direction for Season 1 cast production: `tower-flat-plus-depth-v1`. This is a premium flat-plus-depth web-game sprite system with clean raster shapes, adult professional proportions, strong mobile silhouettes, subtle depth, no ultra-realism, and no mascot exaggeration.

### art-bible:otis-character-bible-v1

Approved character-bible prompt reference for Otis Vale, the Lobby Concierge. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:mara-voss-character-bible-v1

Approved character-bible prompt reference for Mara Voss, Chief Executive Officer. Generate only from the canon in `docs/CHARACTER-BIBLE.md`; power cues may reference commanding boardroom women as broad archetypes, but must never copy a real actor, celebrity, or protected likeness.

### art-bible:rafe-calder-character-bible-v1

Approved character-bible prompt reference for Rafe Calder, Chief Revenue Officer. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:priya-sen-character-bible-v1

Approved character-bible prompt reference for Priya Sen, Chief Financial Officer. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:dylan-shorts-character-bible-v1

Approved character-bible prompt reference for Dylan Shorts, Chief Operating Officer. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:vera-bloom-character-bible-v1

Approved character-bible prompt reference for Vera Bloom, Chief Marketing Officer. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:sol-navarro-character-bible-v1

Approved character-bible prompt reference for Sol Navarro, Chief Networking Officer. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:inez-park-character-bible-v1

Approved character-bible prompt reference for Dr. Inez Park, Chief Preparation Officer. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:mina-rook-character-bible-v1

Approved character-bible prompt reference for Mina Rook, Chief Intelligence Officer. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:etta-knox-character-bible-v1

Approved character-bible prompt reference for Etta Knox, Chief Trust Officer. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:rowan-vale-character-bible-v1

Approved character-bible prompt reference for Rowan Vale, Archivist. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:nadia-flint-character-bible-v1

Approved character-bible prompt reference for Nadia Flint, Red Team Counsel. Generate only from the canon in `docs/CHARACTER-BIBLE.md`.

### art-bible:season-one-concept-board-refs-v1

Approved concept-board prompt references for the 12-character Season 1 cast. Each concept board must produce exactly 5 prompt-only options by default and must stay inside `tower-flat-plus-depth-v1`.

- art-bible:otis-concept-board-v1
- art-bible:mara-voss-concept-board-v1
- art-bible:rafe-calder-concept-board-v1
- art-bible:priya-sen-concept-board-v1
- art-bible:dylan-shorts-concept-board-v1
- art-bible:vera-bloom-concept-board-v1
- art-bible:sol-navarro-concept-board-v1
- art-bible:inez-park-concept-board-v1
- art-bible:mina-rook-concept-board-v1
- art-bible:etta-knox-concept-board-v1
- art-bible:rowan-vale-concept-board-v1
- art-bible:nadia-flint-concept-board-v1

### art-bible:season-one-pose-pack-refs-v1

Approved pose-pack prompt references for the 12-character Season 1 cast. These remain blocked until bible readiness and one winner identity reference are approved for the character; later turnaround, outfit, expression, and pose work is handled by the batch factory before the final upload-ready board.

- art-bible:otis-pose-pack-v1
- art-bible:mara-voss-pose-pack-v1
- art-bible:rafe-calder-pose-pack-v1
- art-bible:priya-sen-pose-pack-v1
- art-bible:dylan-shorts-pose-pack-v1
- art-bible:vera-bloom-pose-pack-v1
- art-bible:sol-navarro-pose-pack-v1
- art-bible:inez-park-pose-pack-v1
- art-bible:mina-rook-pose-pack-v1
- art-bible:etta-knox-pose-pack-v1
- art-bible:rowan-vale-pose-pack-v1
- art-bible:nadia-flint-pose-pack-v1

### art-bible:otis-concept-board-v1

Pending approval. Generate exactly 5 distinct prompt-only Otis concepts before production integration. Each concept should vary meaningfully in age impression, posture, uniform, silhouette, warmth, and sprite read while staying inside `tower-flat-plus-depth-v1` and fitting the existing Lobby backgrounds.

Base prompt:

```text
Design Otis Vale, the concierge of The Tower, an immersive internship command-center skyscraper. Style: tower-flat-plus-depth-v1, premium adult web-game sprite, clean raster shapes, strong mobile-readable silhouette, flat forms with subtle controlled depth. He stands at a luxury reception desk in a moody architectural lobby with burgundy, brass, ivory, and deep navy atmosphere. Use the Otis canon in docs/CHARACTER-BIBLE.md: warm front desk, professional, observant, unhurried, distinct from executive agents. No cartoon mascot styling, no superhero costume, no generic hotel stock-photo look, no visible text, no logo, no watermark.
```

Required first-board lanes:

1. Classic burgundy concierge, older and composed.
2. Softer warm front-desk host with lived-in imperfections.
3. Tall elegant maître d' silhouette, formal and quiet.
4. Warm retired-professor concierge, bookish and reassuring.
5. Painterly web-game sprite with strong brass lighting.
### art-bible:otis-pose-pack-v1

Blocked until an Otis concept winner reference is approved through the five-image initial design gate. Required outfit variants are `regular`, `summer-light`, and `winter-layered`; they must be edits of the approved Otis concierge outfit, not new outfits. Required poses are `idle`, `greeting`, `listening`, `thinking`, `talking`, `alert`, and `working` for each outfit variant. The batch factory must create a 4K true-alpha master, dark/light QA preview, default WebP, `@2x`, and `@3x` derivative for every sprite before the final upload-ready board can be approved for `public/art/lobby/otis/<outfitVariant>/`.

## Negative Prompt Rules

- No fake UI text, unreadable lettering, signatures, logos, or watermarks.
- No photoreal celebrity resemblance.
- No childish mascot proportions.
- No sci-fi armor, fantasy costume, or superhero staging.
- No over-rendered glowing eyes.
- No random props that do not belong at the reception desk.
- No ultra-realistic character renders for Season 1 production sprites.
- No likeness copying from real actors, celebrities, public figures, or named fictional characters.

## Asset Naming

- Character source masters: `.artlab/characters/<characterId>/masters/<outfitVariant>/<pose>.png`
- Character run ledgers: `.artlab/runs/<characterId>/<runId>/run.json`
- Character staged derivatives: `.artlab/characters/<characterId>/staged-public/<runId>/art/<space>/<characterId>/<outfitVariant>/<pose>.webp`
- Character QA previews: `.artlab/characters/<characterId>/qa/<runId>/<outfitVariant>/<pose>-dark.png` and `<pose>-light.png`
- Character production assets: `public/art/<floor-or-space>/<character>/<outfitVariant>/<pose>.webp`, plus `@2x` and `@3x` derivatives
- Room plates: `public/art/<floor-or-space>/<room>/<state>.<ext>`
- Props: `public/art/<floor-or-space>/props/<name>.<ext>`

All production image assets must be referenced by `src/lib/visual-assets/manifest.ts`.

## Privacy Rules

- Never put resumes, emails, contact names, school records, companies from a user's private data, or calendar content into image prompts.
- User-specific art can only use sanitized campaign states, such as "high momentum", "follow-up overdue", or "interview week".
- Runtime image generation is out of scope for this phase.
