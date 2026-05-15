# wave-01-agent-03 Result

Parent run: 2026-05-14-otis-production-redo-v1
Asset: Otis (character)
Strategy: Human Imperfection

## Strongest Idea Or Output

The strongest output is a GPT Image 2 prompt packet for "the concierge who has actually lived here": Otis stays premium, soft Santa, and app-ready, but the prompt makes believable human specificity mandatory. The direction locks in a softer belly, relaxed uneven shoulders, natural older hands, asymmetrical warm smile, tired kind eyes, imperfect groomed beard/hair, and lived-in fabric creases without turning him sloppy or comic.

## What Is Meaningfully Different

This lane attacks the main failure mode directly: fake-perfect AI Otis. Instead of pushing silhouette, game-readability, or material simplification, it defines a human-imperfection dial that every generated source must preserve across identity, outfit variants, and poses. The divergence is emotional and anatomical: he should feel lovable, specific, and real at app scale while still belonging to the premium Tower visual system.

## Files Or Prompts Created

- `outputs/otis-v2-human-imperfection-gpt-image-2-prompt-packet.md`
- `outputs/otis-v2-human-imperfection-shot-matrix.json`
- `outputs/otis-v2-human-imperfection-qa-guard.md`

## Quality Risks

- No native image files were generated in this lane, so there is no visual preflight evidence yet.
- The model may exaggerate the softer belly or asymmetry into caricature if the coordinator does not enforce the premium competence guardrails.
- Beard and hair imperfection can create noisy edges or alpha haloing during transparent staging.
- Continuity across three outfits and seven poses may drift unless the identity reference is generated and locked before pose production.

## Housekeeping Notes

- Kept: three prompt/QA artifacts under this lane's `outputs` folder, plus the required `result.md` and `result.json`.
- Deleted or archived: none.
- Loose files: none created outside the assigned lane root.
- Public promotion: none; no files were written to `public/art`, manifests, parent packet files, sibling lanes, or source code.

## Continuous-Improvement Notes

- Slow step: prompt specificity took most of the time because "human imperfection" needs guardrails against both glossy perfection and caricature.
- Error or confusion: the requested GPT-5.5 fast/xhigh profile was not exposed in this session, so I used the available Codex model and recorded the fallback in `result.json`.
- Engine improvement recommended: add a first-class "anti-AI-perfect character" prompt module to the Creative Production Engine so future character lanes can reuse body, face, hair, hand, and material imperfection checks without rewriting them from scratch.

Coordinator reminder: this lane cannot approve, promote, edit public/art, edit manifests, delete live assets, or integrate the app.
