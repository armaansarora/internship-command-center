# Creative Production Engine

## Purpose

The Creative Production Engine is the Tower-wide system for producing characters, environments, props, UI textures, animations, scenes, icon systems, and marketing hero art. It is a guided creative mode for Codex and Claude, backed by scripts and ledgers so the work stays organized, testable, and promotable.

## Command Surface

- `npm run art:studio`: guided conversational opening, studio state creation, Housekeeping Gate entry, and Continuous Improvement Gate entry.
- `npm run art:studio -- --request "<natural language request>"`: adaptive request router for any Tower visual work. Use this first when Armaan asks for a character, background, screen, button, animation, prop, scene, icon system, or marketing visual in normal language.
- `npm run art:studio -- --asset-type <type> --name "<asset name>" --brief "<brief>" --run-id <safe-run-id>`: converts an approved guided brief into a strict production packet under `.artlab/studio/<asset-type>/<run-id>/` with `creative-brief.json`, `prompt.md`, `next-action.md`, and phase ledgers.
- `npm run art:operate`: strict character-art operator packet for Season 1 character work.
- `npm run art:status`: read-only character art status.
- `npm run art:clean`: removes volatile run-owned art binaries while keeping ledgers, references, live `public/art`, and manifest data protected.

`art:studio` rejects unknown flags, unsafe run ids, path traversal, symlink escapes, and production writes outside `.artlab/studio`. If the studio state is corrupt, it preserves a `.corrupt-*` backup before creating a valid state snapshot.

## Adaptive Request Router

The engine must accept Armaan's request in normal language and convert it into the closest strict asset class without making him learn internal categories.

Examples:

- `npm run art:studio -- --request "redo Otis from scratch with the same approved design"` routes to `character`.
- `npm run art:studio -- --request "create a new immersive background screen for the application war room"` routes to `environment`.
- `npm run art:studio -- --request "make a small premium UI button texture for the lobby controls"` routes to `ui-texture`.
- `npm run art:studio -- --request "generate an animated elevator arrival loop for the lobby"` routes to `animation`.

Every adaptive packet records the raw request, inferred type, routing reason, confidence, required outputs, acceptance checks, organization policy, quality bar, and the same approval gates as manually typed packets. If the route feels wrong or slow, the Continuous Improvement Gate must add signals or rewrite the router before the next similar run.

## Natural-Language Trigger

When Armaan says "Creative Production Engine" or asks to add/generate Tower visuals, run `npm run art:studio` and follow `.agents/skills/creative-production-engine/SKILL.md`.

## Mandatory Gates

### Housekeeping Gate

Every phase inventories files, labels status, cleans loose artifacts, updates ledgers, and blocks unapproved `public/art` writes.

### Continuous Improvement Gate

Every phase records friction, slowness, errors, manual work, QA failures, confusion, and rewrite triggers. The engine improves itself when a weakness repeats or becomes severe.

The command layer records both mandatory gates for orientation and production-packet phases. Later generation, ingest, QA, promotion, and app-integration phases must follow the same ledger contract before any asset is allowed into `public/art`.

## Human Approval Gates

1. Initial direction approval.
2. Final upload-ready approval using `approved for app`.

## V1 Asset Classes

- `character`: cast members, outfits, poses, expressions, and motion profiles.
- `environment`: floor backgrounds, lighting states, and responsive crops.
- `prop`: transparent props and storytelling objects.
- `ui-texture`: approved raster materials and interface surfaces.
- `animation`: ambient loops, transition motion, and sprite-state motion.
- `scene`: composed Tower moments for onboarding and floor beats.
- `icon-system`: custom symbols only where library icons are insufficient.
- `marketing-hero`: public-facing Tower imagery.
