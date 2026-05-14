# Creative Production Engine V2 Design

## Purpose

Creative Production Engine v2 turns the current packet-and-lane system into a real studio coordinator. The engine must support any Tower creative work: character sprites, environments, props, UI surfaces, real app UI, shader effects, motion systems, Three.js/WebGPU scenes, marketing art, icon systems, and composed story moments.

## Approved Direction

Armaan approved the outside critique: the engine is strong at organizing prompts, but weak at autonomous coordination, image/code QA, ranking, review boards, and broad creative coverage. V2 keeps the 15x default lane model and adds a coordinator that can merge lane output into a small set of production-grade options.

## The Eleven Workstreams

1. **Finished asset path:** every run needs a coordinator packet that moves from lanes to ranked options, review board, QA, and promotion readiness.
2. **True parallel coordination:** the parent run owns a dispatch queue, lane validation, and coordinator review artifacts.
3. **Noise control:** lane results are scored, deduped, ranked, and condensed into top options.
4. **Hard quality control:** quality evidence is machine-readable and blocks merge when missing.
5. **Style and identity consistency:** every lane carries style, identity, forbidden-trait, and drift notes.
6. **Approval experience:** review board is a first-class HTML artifact, not folder spelunking.
7. **Machine-readable state:** coordinator artifacts are JSON plus Markdown/HTML, not Markdown-only.
8. **Production preview:** every asset type declares app preview surfaces before promotion.
9. **Model profile honesty:** lane prompts state the preferred model and require fallback reporting.
10. **Asset-type maturity:** each asset type has capabilities, outputs, QA gates, and integration targets.
11. **Multifunction creative scope:** the engine explicitly supports code-driven UI, shaders, animations, and immersive web effects, not just static images.

## Architecture

V2 adds three modules:

- `capabilities.ts`: declares what the engine can produce, how each capability is delivered, what QA it needs, and which asset types can use it.
- `coordinator.ts`: validates lane results, scores quality, dedupes similar ideas, ranks the strongest options, blocks promotion when evidence is missing, and renders review artifacts.
- CLI coordinator mode: `npm run art:studio -- --mode coordinate --parallel-plan <parallel-plan.json>` reads a 15-lane plan, gathers completed lanes, writes `coordinator-review.json`, `coordinator-report.md`, and `review-board.html`.

## Command Contract

Normal creation:

```bash
npm run art:studio -- --request "<creative request>"
```

Lane setup:

```bash
npm run art:studio -- --mode lane --lane-brief <lane-brief.json>
```

Lane validation:

```bash
npm run art:studio -- --mode validate-lane --lane-brief <lane-brief.json>
```

Coordinator merge:

```bash
npm run art:studio -- --mode coordinate --parallel-plan <parallel-plan.json>
```

## Acceptance

- Every registered asset type maps to at least one creative capability.
- UI, shader, animation, and immersive scene requests route to a meaningful asset type and carry capability instructions.
- A 15-lane run can be reduced into a ranked review with top options, duplicate groups, promotion blockers, and a review board.
- The coordinator blocks promotion when too few lanes are complete, when lane results contain placeholders, or when quality evidence is missing.
- Tests prove the command surface, scoring, dedupe, review board rendering, capability coverage, and docs stay synchronized.
