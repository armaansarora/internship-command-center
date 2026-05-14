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
