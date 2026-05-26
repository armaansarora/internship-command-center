export interface RenderFoundryClaudeSkillOpts {
  repoRoot: string;
}

export function renderFoundryClaudeSkill(opts: RenderFoundryClaudeSkillOpts): string {
  return `---
name: tower-art-foundry
description: |
  Tower Art Foundry — the SDK that lets you list canon, fetch promoted
  Asset Packs, generate new modality artifacts (characters, floors,
  textures, icons, sprite animations, Lottie), preview them, and get a
  copy-paste TSX integration snippet for any pack. Use this skill when
  you need ANY image, animation, or UI texture for The Tower app.

  Triggers: "make me a", "generate a", "find a character", "I need an
  icon for", "Tower background", "Sol Navarro idle animation", "what art
  exists for the war room", anything about the Tower visual layer.
---

# Tower Art Foundry — SDK skill for Claude Code sessions

## What this is

The **Tower Art Foundry** is an MCP server (\`tower-art-foundry\`) that exposes the Tower's multimodal art system to AI agents. It speaks 9 typed tools over stdio. Every artifact is **self-describing** (manifest + integration metadata), so when you fetch one you get told exactly how to paste it into a Next.js page.

## When to use which tool

| You want to... | Tool | Notes |
|---|---|---|
| See every canonical character / floor / palette | \`foundry/canon_list\` | Optional \`kind\` filter |
| Fetch one canon entry (YAML-as-JSON) | \`foundry/canon_get\` | Required \`id\` |
| See every promoted Asset Pack | \`foundry/asset_pack_list\` | Filters: kind / characterId / space |
| Fetch one Asset Pack manifest + file paths | \`foundry/asset_pack_get\` | Required \`packId\` |
| Get a copy-paste TSX integration snippet | \`foundry/asset_pack_integration\` | Required \`packId\`; \`targetFramework\` defaults to next-app-router |
| Audit what art is MISSING | \`foundry/slot_audit\` | Returns slots with no promoted pack |
| Request a NEW artifact be generated | \`foundry/generate\` | Returns a \`runId\` immediately; poll with \`generate_status\` |
| Poll an in-flight generation | \`foundry/generate_status\` | Status: queued / running / blocked / promoted / cancelled / failed |
| Health snapshot | \`foundry/diagnostics\` | daemonUp, provider reachability, backlog, recent runs |

## Canonical paths

- Canon YAML lives in **\`${opts.repoRoot}/.artlab/canon/\`** — never edit promoted Asset Pack files directly; canon edits feed the next regeneration.
- Promoted Asset Packs live in **\`${opts.repoRoot}/.artlab/engine/promoted/\`** — these are byte-protected by CI.
- Inbox for new generation runs: **\`${opts.repoRoot}/.artlab/engine/inbox/foundry/\`** — written by \`foundry/generate\`, consumed by the ArtLab daemon.

## Typical session flow

1. Caller says: "I need a Sol Navarro idle animation."
2. You call \`foundry/canon_get\` with id \`sol-navarro\` to ground in canon.
3. You call \`foundry/asset_pack_list\` with kind \`sprite-animation\` and characterId \`sol-navarro\` to check if one exists already.
4. If none: \`foundry/generate\` with kind=\`sprite-animation\`, description=\`Sol idle breathe loop, 1.2s, ease-in-out\`. You get a \`runId\`.
5. Poll \`foundry/generate_status\` until status=\`promoted\`. You get a \`promotedPackId\`.
6. Call \`foundry/asset_pack_integration\` with that packId to get the exact TSX snippet.
7. Paste the snippet into the right \`src/app/\` page. Run \`npm run build\`. Ship.

## Hard rules — DO NOT BREAK

- **Never** byte-edit a promoted Asset Pack on disk. Treat \`promoted/\` as read-only.
- **Never** invent a character or floor outside canon. If the user names something unknown, call \`foundry/canon_list\` first and surface that as an error.
- **Never** describe the foundry as "ArtLab" in user-facing copy — internally they're layers of one system, externally the SDK is the **Tower Art Foundry**.
- **Never** call \`foundry/generate\` without a description >= 8 chars (the schema will reject it).

## Examples (paste-ready)

\`\`\`ts
// Listing every War Room background:
mcp.callTool({ name: "foundry/asset_pack_list", arguments: { kind: "floor", space: "war-room" } });

// Generating a new icon:
const run = await mcp.callTool({ name: "foundry/generate", arguments: {
  kind: "icon", description: "Elevator chevron in brass, 24px, monoline",
}});

// Polling:
const status = await mcp.callTool({ name: "foundry/generate_status", arguments: { runId: run.runId }});
\`\`\`
`;
}
