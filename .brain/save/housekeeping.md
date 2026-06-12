# 💾 SAVE — housekeeping (2026-06-12)

## GOAL / STATE
✅ Done: popup-spam fix shipped (see dashboard-popup-spam.md) · `.brain/` wired into
STRUCTURE.md + CLAUDE.md · overnight-*.html → docs/reports/ · **artlab SYSTEM removed**
(skill, MCP server, launchd daemon, .artlab workspace — user order) · full suite green
after removal: 4313 passed.

## TRAPS
- ⚠️ `src/lib/artlab/` + `src/app/artlab-demo/` + `scripts/artlab*` are STILL IN THE
  REPO (392 src references — live art-rendering features). User wants artlab gone
  entirely; ripping these out is a surgical, suite-gated lane of its own. Until then
  the app keeps rendering existing art; nothing generates new art (pipeline is dead).

## NEXT
1. (when ordered) the in-repo artlab extraction lane: delete src/lib/artlab +
   consumers + tests together, suite-gated, cross-family reviewed.
## FLAGS — all ✅ <!-- 2026-06-12T02:14 by Claude (Fable) -->
