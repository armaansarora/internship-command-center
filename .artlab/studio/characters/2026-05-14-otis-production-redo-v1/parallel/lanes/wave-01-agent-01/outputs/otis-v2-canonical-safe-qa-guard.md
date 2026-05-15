# Otis v2 Canonical Safe QA Guard

Lane: wave-01-agent-01
Approval state: draft lane output, not promoted

## Immediate Preflight

Run source preflight on the first three generated individual sources before generating the full 21-sprite pack:

```sh
npm run art:preflight -- <source-file> --minimum-long-edge 4096 --json
```

Pass requirements:

- Long edge is at least 4096 px natively.
- Transparent source has real alpha with clean edges.
- If a non-alpha source is used, mask extraction must be audited before ingest.
- Full body is visible with hands, feet, beard, jacket hem, and props uncropped.
- No glow halo, fuzzy cutout edge, or color spill.
- No sheet split is accepted as production source unless the extracted cell still passes all checks.

## Identity Consistency Checks

- Compare idle, greeting, and working side by side before continuing.
- Face age, beard volume, belly, shoulder slope, and height should remain consistent.
- Outfit changes must feel like wardrobe edits on the same person, not new generations.
- Otis must stay warm and human. Reject plastic skin, fake-perfect symmetry, mascot proportions, or exaggerated Santa costuming.

## App-Scale Checks

Preview every accepted source at these approximate display heights before derivative generation:

- 64 px: silhouette and beard should still read.
- 96 px: pose state should be identifiable.
- 160 px: face and hands should not blur.
- 320 px: fabric and alpha edges should hold up.

## Known Risks From This Run

- Built-in generation already produced sub-4096 sources earlier in the run.
- Chroma-key backgrounds were not flat enough in earlier probes.
- Thinking and working poses are the highest risk for hand and prop artifacts.
- Outfit B can drift theatrical if brass trim and oxblood accents get too loud.
- Outfit C can drift generic maintenance worker if the concierge posture and face are not locked.

## Stop Conditions

Stop generation and return to coordinator if:

- Any first-batch source is below 4096 px long edge.
- Alpha or mask quality is not production-clean.
- The same face cannot be maintained across the first three sources.
- Hands, feet, ledger, tablet, or key ring are malformed.
- The output starts reading as a Christmas Santa, fantasy innkeeper, or child-oriented mascot.
