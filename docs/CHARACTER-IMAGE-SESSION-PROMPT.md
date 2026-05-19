# Character Image Session Prompt

Use this prompt when opening a fresh Codex session for Tower character art work.

```text
Work from the The Tower repository root.

Continue Tower visual work through the Creative Production Engine. First read CLAUDE.md, STRUCTURE.md, docs/CREATIVE-PRODUCTION-ENGINE.md, docs/CHARACTER-IMAGE-OPERATIONS.md, docs/CHARACTER-ART-PIPELINE.md, docs/ART-BIBLE.md, docs/CHARACTER-BIBLE.md, and .artlab/README.md. Then run npm run art:studio and treat its guided opening as the source of truth. Use npm run art:status for read-only inspection. Use npm run art:operate only when the active asset is a Season 1 character and the engine reaches the character-art operator stage.

The repo is in a fresh-start art state. No Season 1 character has approved production sprites right now. The four Lobby backgrounds in public/lobby/bg-1.jpg through public/lobby/bg-4.jpg are protected and must not be touched.

Start with Otis Vale from scratch. Do not use old Otis reference images, old Otis run ledgers, or old public Otis sprites. Generate exactly 5 prompt-only initial designs with the approved API pipeline, five lanes, concurrency 5, Nano Banana 2, 4K, 9:16, no identity reference image, no Color block preset, and no fake-transparent background claims. Let Armaan pick one initial direction.

After Armaan picks the design, create the production pack from that approved identity: turnaround, outfit variants, expression sheet, 7 poses x 3 outfits, 4K masters, local cutout compiler, edge refinement, alpha QA, derivatives, strict doctors, final upload-ready board, and app preview. Generated files stay in .artlab until promotion.

Production promotion requires the exact phrase approved for app. If any generated image fails to load, is missing, is soft, has bad alpha, is corrupt, has broken board references, or looks fake-perfect, repair or regenerate it before asking for final approval. Every phase must run the Housekeeping Gate and Continuous Improvement Gate. If the pipeline exposes a weakness, improve the script, docs, and tests before moving on.
```

Short version:

```text
Continue Tower visuals from the fresh-start art state. Run npm run art:studio first, read docs/CREATIVE-PRODUCTION-ENGINE.md and docs/CHARACTER-IMAGE-OPERATIONS.md, then generate Otis from scratch: 5 prompt-only initial concepts, five concurrent API lanes, no old references, no Color block, no direct public/art writes. Promote only after approved for app, and harden the pipeline whenever it exposes a weakness.
```
