# wave-03-agent-02 Result

Parent run: 2026-05-14-otis-production-redo-v1
Asset: Otis (character)
Strategy: Technical Cleanroom

## Strongest Idea Or Output

The strongest output is a ship-ready cleanroom gate for Otis production: generate individual source sprites in a strict GPT Image 2 probe order, block the full 21-sprite pack until the first source, hand-gesture, and prop/crop probes pass, and use exact canonical outfit/pose filenames from the app contract.

This lane should function as the coordinator's production filter. It protects the approved threshold-keeper Otis identity while refusing low-resolution, cropped, haloed, or manifest-drifting source art.

## What Is Meaningfully Different

Other lanes provide identity, gesture, comedy, motion, and art-direction guidance. This lane turns that synthesis into a hard acceptance contract: source dimensions, alpha/chroma requirements, safe padding, derivative dimensions, file naming, probe sequencing, hard rejects, and promotion blockers.

The main recommendation is to stop treating the full 3 outfit x 7 pose pack as the next action. The next action should be three gated probes: regular/idle, regular/greeting, and regular/working. If those fail, the coordinator should switch source strategy rather than quietly lowering the quality bar.

## Files Or Prompts Created

- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-03-agent-02/outputs/technical-cleanroom-ship-ready-contract.md`
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-03-agent-02/outputs/gpt-image-2-probe-order.json`
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-03-agent-02/outputs/otis-production-file-map.json`
- `.artlab/studio/characters/2026-05-14-otis-production-redo-v1/parallel/lanes/wave-03-agent-02/preflight.json`

No actual image files were generated in this lane. The lane produced QA/spec artifacts because local production image generation with a guaranteed native 4K-class output was not available in this subagent context, and prior parent-run probes already showed the current built-in path failing long-edge and alpha/chroma requirements.

## Quality Risks

- GPT Image 2 native 4K-class transparent source output remains unproven for this Otis run.
- Prior built-in generation probes failed on long-edge and alpha/chroma requirements.
- Seasonal outfits can easily drift Otis into Santa costume, resort staff, or coat-heavy blob unless identity is locked against the regular reference.
- Hands, ledger/keycard props, coat hems, and beard edges are the highest-risk crop/halo zones.
- A contact sheet may look good as a board while still failing production because each cell lacks native source preflight.

## Housekeeping Notes

- Kept: all created artifacts are inside this lane root and the lane `outputs` folder.
- Deleted or archived: none.
- Loose files: none found or created.
- Public/art status: untouched.
- Manifest status: untouched.
- Parent packet and sibling lanes: read-only or untouched.

## Continuous-Improvement Notes

- Slow step: deriving the exact production map required checking app slugs and frame metadata because the creative prompt said "three outfit variants" but did not name them.
- Error or confusion: the general Creative Production Engine skill says to run parent studio commands, but this dispatched lane forbids parent/shared mutations. I followed the lane prompt and did not run coordinator-owned promotion or studio mutation commands.
- Engine improvement recommended: include canonical outfit slugs, pose slugs, source/display frames, and derivative dimensions directly in each lane prompt for Technical Cleanroom lanes.

## Fallback Model

Required profile was GPT-5.5 fast mode with extra-high reasoning. This session exposed Codex GPT-5 rather than a selectable GPT-5.5 fast profile, so the lane was completed with the available Codex GPT-5 coding agent.

Coordinator reminder: this lane cannot approve, promote, edit public/art, edit manifests, delete live assets, or integrate the app.
