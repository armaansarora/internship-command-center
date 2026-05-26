export interface RenderArtLabClaudeSkillOpts {
  repoRoot: string;
}

export function renderArtLabClaudeSkill(opts: RenderArtLabClaudeSkillOpts): string {
  return `---
name: tower-art-foundry
description: |
  Tower Art ArtLab — the SDK that lets you list canon, fetch promoted
  Asset Packs, generate new modality artifacts (characters, floors,
  textures, icons, sprite animations, Lottie), preview them, and get a
  copy-paste TSX integration snippet for any pack. Use this skill when
  you need ANY image, animation, or UI texture for The Tower app.

  Triggers: "make me a", "generate a", "find a character", "I need an
  icon for", "Tower background", "Sol Navarro idle animation", "what art
  exists for the war room", anything about the Tower visual layer.
---

# Tower Art ArtLab — SDK skill for Claude Code sessions

## What this is

The **Tower Art ArtLab** is an MCP server (\`tower-art-foundry\`) that exposes the Tower's multimodal art system to AI agents. It speaks 9 typed tools over stdio. Every artifact is **self-describing** (manifest + integration metadata), so when you fetch one you get told exactly how to paste it into a Next.js page.

## When to use which tool

| You want to... | Tool | Notes |
|---|---|---|
| See every canonical character / floor / palette | \`artlab/canon_list\` | Optional \`kind\` filter |
| Fetch one canon entry (YAML-as-JSON) | \`artlab/canon_get\` | Required \`id\` |
| See every promoted Asset Pack | \`artlab/asset_pack_list\` | Filters: kind / characterId / space |
| Fetch one Asset Pack manifest + file paths | \`artlab/asset_pack_get\` | Required \`packId\` |
| Get a copy-paste TSX integration snippet | \`artlab/asset_pack_integration\` | Required \`packId\`; \`targetFramework\` defaults to next-app-router |
| Audit what art is MISSING | \`artlab/slot_audit\` | Returns slots with no promoted pack |
| Request a NEW artifact be generated | \`artlab/generate\` | Returns a \`runId\` immediately; poll with \`generate_status\` |
| Poll an in-flight generation | \`artlab/generate_status\` | Status: queued / running / blocked / promoted / cancelled / failed |
| Health snapshot | \`artlab/diagnostics\` | daemonUp, provider reachability, backlog, recent runs |

## Canonical paths

- Canon YAML lives in **\`${opts.repoRoot}/.artlab/canon/\`** — never edit promoted Asset Pack files directly; canon edits feed the next regeneration.
- Promoted Asset Packs live in **\`${opts.repoRoot}/.artlab/engine/promoted/\`** — these are byte-protected by CI.
- Inbox for new generation runs: **\`${opts.repoRoot}/.artlab/engine/inbox/foundry/\`** — written by \`artlab/generate\`, consumed by the ArtLab daemon.

## Typical session flow

1. Caller says: "I need a Sol Navarro idle animation."
2. You call \`artlab/canon_get\` with id \`sol-navarro\` to ground in canon.
3. You call \`artlab/asset_pack_list\` with kind \`sprite-animation\` and characterId \`sol-navarro\` to check if one exists already.
4. If none: \`artlab/generate\` with kind=\`sprite-animation\`, description=\`Sol idle breathe loop, 1.2s, ease-in-out\`. You get a \`runId\`.
5. Poll \`artlab/generate_status\` until status=\`promoted\`. You get a \`promotedPackId\`.
6. Call \`artlab/asset_pack_integration\` with that packId to get the exact TSX snippet.
7. Paste the snippet into the right \`src/app/\` page. Run \`npm run build\`. Ship.

## Hard rules — DO NOT BREAK

- **Never** byte-edit a promoted Asset Pack on disk. Treat \`promoted/\` as read-only.
- **Never** invent a character or floor outside canon. If the user names something unknown, call \`artlab/canon_list\` first and surface that as an error.
- **Never** describe the ArtLab SDK as the underlying generation engine in user-facing copy — internally they're layers of one system, externally the SDK is the **Tower Art ArtLab**.
- **Never** call \`artlab/generate\` without a description >= 8 chars (the schema will reject it).

## Examples (paste-ready)

\`\`\`ts
// Listing every War Room background:
mcp.callTool({ name: "artlab/asset_pack_list", arguments: { kind: "floor", space: "war-room" } });

// Generating a new icon:
const run = await mcp.callTool({ name: "artlab/generate", arguments: {
  kind: "icon", description: "Elevator chevron in brass, 24px, monoline",
}});

// Polling:
const status = await mcp.callTool({ name: "artlab/generate_status", arguments: { runId: run.runId }});
\`\`\`
`;
}
