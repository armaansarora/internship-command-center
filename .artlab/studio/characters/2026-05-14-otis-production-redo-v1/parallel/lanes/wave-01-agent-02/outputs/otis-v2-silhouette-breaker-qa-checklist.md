# Otis v2 Silhouette Breaker QA Checklist

laneId: wave-01-agent-02
artifactType: lane QA guard
approvalState: exploratory lane output only

## Readability Gate

- At 96 px tall, Otis should still read as an older warm concierge, not a generic man in formalwear.
- Outer contour should show one clear silhouette hook: open threshold arm, ledger side weight, or bell/key low anchor.
- There must be visible negative space around at least one arm so the pose does not collapse into a centerline blob.
- The slight belly should be present and warm, not exaggerated into a joke and not flattened into a model torso.
- Hands should look useful: welcoming, holding, listening, checking, pausing. Reject mannequin hands and hidden fingers.

## Identity Gate

- Keep the approved Otis face family: rounded white beard, silver hair, tired kind eyes, ruddy cheeks, smile lines, slight asymmetry.
- Reject any output that reads young, thin, sharp-jawed, CEO-like, Santa costume, fantasy innkeeper, waiter, mascot, or stock-photo hotel host.
- Outfit changes must be edits of the approved concierge outfit, not alternate characters or new palettes.
- Props must be quiet and Tower-appropriate: plain ledger, small brass bell, brass key ring. No readable text, no logos, no oversized gimmick.

## Source Gate

- Native long edge must be 4096 px or larger before master normalization.
- Prefer transparent source. If alpha is unavailable, background must be perfectly flat and removable.
- Full body must have 10 to 14 percent safe padding with both hands and feet visible.
- Reject glow halos, soft/fuzzy edges, low-res blur, upscaled artifacts, cropped props, merged fingers, extra fingers, or prop-body intersections.
- Do not generate the remaining 21-sprite pack until at least one probe passes native source preflight.

## Lane-Specific Failure Modes

- Too theatrical: open-hand gesture becomes a presenter pose instead of a concierge making space.
- Too administrative: ledger direction becomes accountant, office clerk, or paperwork mascot.
- Too subtle: bell/key direction keeps canon but does not improve silhouette enough to justify this lane.
- Too perfect: face symmetry, skin polish, sharp tailoring, and model posture erase the lived-in warmth.
- Too costume: winter layer drifts into Santa coat, fantasy cloak, or holiday character.

## Recommendation

Promote this lane's **Asymmetric Threshold Keeper** posture language only if another lane supplies a strong canonical face/outfit anchor or if generated probes preserve the approved identity reference exactly. The silhouette idea is useful; it is not a standalone approval without source preflight and identity comparison.
