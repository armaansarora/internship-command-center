# Character Image Session Prompt

Use this prompt when opening a fresh Codex session for Tower character art work.

```text
Work from the The Tower repository root.

Continue Tower visual work through the Creative Production Engine. First read CLAUDE.md, STRUCTURE.md, docs/CREATIVE-PRODUCTION-ENGINE.md, docs/CHARACTER-IMAGE-OPERATIONS.md, docs/CHARACTER-ART-PIPELINE.md, docs/ART-BIBLE.md, docs/CHARACTER-BIBLE.md, and .artlab/README.md. Then run npm run art:studio and treat its guided opening as the source of truth. Use npm run art:status for read-only inspection. Use npm run art:operate only when the active asset is a Season 1 character and the engine reaches the character-art operator stage.

Otis Vale is already promoted, browser-QA verified, closed, and protected as the Lobby baseline in public/art/lobby/otis and src/lib/visual-assets/approved-character-assets.generated.json. The four Lobby backgrounds in public/lobby/bg-1.jpg through public/lobby/bg-4.jpg are protected and must not be touched.

For a new character such as Mara Voss, start from scratch unless the durable run-state explicitly names an approved identity reference. Generate exactly 5 prompt-only initial designs with the approved API pipeline, five lanes, concurrency 5, Nano Banana 2, 4K, 9:16, no identity reference image, no Color block preset, and no fake-transparent background claims. Let Armaan pick one initial direction.

After Armaan picks the design, continue automatically from that approved identity to the next normal human gate: production pack, required production sprite work, 4K masters, local cutout compiler, edge refinement, alpha QA, derivatives, strict doctors, and the final upload-ready board. Do not stop at `initial-direction-approved`; generated files stay in .artlab until promotion.

Production promotion requires the exact phrase approved for app. If any generated image fails to load, is missing, is soft, has bad alpha, is corrupt, has broken board references, or looks fake-perfect, repair or regenerate it before asking for final approval. Every phase must run the Housekeeping Gate and Continuous Improvement Gate. If the pipeline exposes a weakness, improve the script, docs, and tests before moving on.
```

Short version:

```text
Continue Tower visuals from the current Otis-protected baseline. Run npm run art:status first, read docs/CREATIVE-PRODUCTION-ENGINE.md and docs/CHARACTER-IMAGE-OPERATIONS.md, then start the requested new asset through npm run art:produce. New characters start from scratch with 5 prompt-only initial concepts, five concurrent API lanes, no old references unless approved in run-state, no Color block, and no direct public/art writes. Promote only after approved for app, and harden the pipeline whenever it exposes a weakness.
```
