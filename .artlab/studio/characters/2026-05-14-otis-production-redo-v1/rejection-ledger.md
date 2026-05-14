# Otis Production Redo Rejection Ledger

## 2026-05-14 Regular Pose Sheet Attempt

- Status: rejected before ingest
- Asset: regular outfit pose sheet
- Generated dimensions: 1774x887
- Required quality: native 4K-class source before master/derivative processing
- Blocking issues:
  - long edge below 4096px
  - chroma-key background was not perfectly flat/uniform
- Workspace binary status: deleted; not kept in `.artlab` because it is not usable production source
- Pipeline improvement made: replacement QA now blocks source art that is below the native source contract or upscaled into a 4K master

Next generation should avoid a seven-pose single sheet if the model keeps returning low source resolution. Prefer fewer poses per generated source or true high-resolution source output, then ingest only assets that pass the native source preflight.

## 2026-05-14 Regular Idle Individual Sprite Probe

- Status: rejected before ingest
- Asset: regular/idle individual sprite source
- Generated dimensions: 948x1659
- Required quality: native 4K-class source before master/derivative processing
- Blocking issues:
  - long edge below 4096px
  - chroma-key background was not perfectly flat/uniform
- Workspace binary status: not copied into `.artlab`; original remains only in the default generated-image cache
- Pipeline result: do not generate the remaining 20 production sprites from this path until the source-resolution problem is solved

This confirms the production path must not depend on a single built-in generation output as final source unless it can satisfy the source contract. The pipeline now has `npm run art:preflight` to reject generated images immediately by dimensions and alpha/chroma flatness before ingest.

## 2026-05-14 Three-Probe Source Quality Test

- Status: all three probes rejected before ingest
- Goal: determine whether Otis can proceed through built-in image generation before creating the full 21-sprite pack

### Probe 1: normal chroma individual sprite

- Asset: regular/idle individual sprite source
- Generated dimensions: 887x1774
- Preflight command: `npm run art:preflight -- <generated-file> --minimum-long-edge 4096 --chroma-key 00ff00 --json`
- Blocking issues:
  - `source-long-edge-below-4096`
  - `chroma-key-background-not-flat`

### Probe 2: simpler padded chroma individual sprite

- Asset: regular/idle individual sprite source with simpler rendering and extra padding
- Generated dimensions: 1024x1536
- Preflight command: `npm run art:preflight -- <generated-file> --minimum-long-edge 4096 --chroma-key 00ff00 --json`
- Blocking issues:
  - `source-long-edge-below-4096`
  - `chroma-key-background-not-flat`

### Probe 3: no-chroma individual sprite

- Asset: regular/idle individual sprite source on a plain off-white background
- Generated dimensions: 1024x1536
- Preflight command: `npm run art:preflight -- <generated-file> --minimum-long-edge 4096 --json`
- Blocking issues:
  - `source-long-edge-below-4096`
  - `source-missing-alpha`

### Decision

Do not generate the full 21-sprite Otis replacement pack through the current built-in generation path. The source-resolution blocker remains even when chroma-key is removed, so the next production step is choosing a higher-resolution source strategy or changing the quality contract explicitly. Until then, the live pilot remains protected and the production redo run stays blocked on acceptable generated sources.
