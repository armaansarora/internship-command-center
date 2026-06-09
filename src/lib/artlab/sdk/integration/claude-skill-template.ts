export interface RenderArtLabClaudeSkillOpts {
  repoRoot: string;
}

export function renderArtLabClaudeSkill(opts: RenderArtLabClaudeSkillOpts): string {
  return `---
name: artlab
description: |
  ArtLab SDK for The Tower app — acquire or generate a concrete Tower ART ASSET
  (character, floor background, UI texture, icon, sprite animation, Lottie) through
  the artlab MCP server, then hand back its copy-paste TSX integration snippet. Use
  this skill when the user wants an actual asset for The Tower: "make me a / generate
  a / find a character", "I need an icon for the elevator", "Tower background for the
  war room", "Sol Navarro idle animation", "what art exists for the war room", "audit
  what art is missing", or anything that produces or fetches an image/animation/texture
  file for The Tower visual layer. Workflow: list canon, check promoted Asset Packs,
  generate only if none exists, then return the integration snippet. NOT for design
  judgment, UX/visual critique, layout, visual hierarchy, typography, color, spacing,
  accessibility, or "make this floor/panel feel more luxurious / bolder / quieter /
  cleaner" — that is the impeccable or ui-ux-pro-max skills. NOT for writing or
  refactoring app feature code, and NOT for generic image generation outside The
  Tower's canon (no Tower character/floor/canon involved → defer to general/fal-ai
  image tooling). artlab is ONLY the asset-acquisition pipeline, never the
  design-decision layer.
---

# ArtLab SDK — SDK skill for Claude Code sessions

## What this is

The **ArtLab SDK** is an MCP server (\`artlab\`) that exposes the Tower's multimodal art system to AI agents. It speaks 9 typed tools over stdio. Every artifact is **self-describing** (manifest + integration metadata), so when you fetch one you get told exactly how to paste it into a Next.js page.

artlab acquires/generates ART ASSETS. Design judgment, critique, layout, or making a floor/panel look better/bolder/quieter → defer to **impeccable** / **ui-ux-pro-max**. Generic non-Tower image gen (no Tower canon involved) → defer to **general/fal-ai image tooling** (\`mcp__fal-ai__*\`), not this skill.

## Preflight — MCP-vs-CLI branch (run on EVERY trigger, before the tool table)

Decide your execution path FIRST:

- **If \`mcp__artlab__diagnostics\` IS in your tool list → MCP path.** Use the \`mcp__artlab__*\` tool table below. Call \`mcp__artlab__diagnostics\` first to confirm reachability + daemon health.
- **If it is NOT in your tool list → the MCP server did not load this session.** SKIP straight to the CLI path. Run the CLI column for everything — do **not** attempt \`mcp__artlab__*\` calls, they will \`InputValidationError\`. Start with:
  \`\`\`bash
  ROOT=$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || echo "${opts.repoRoot}")
  cd "$ROOT"
  npm run artlab -- doctor
  \`\`\`
  \`doctor\` runs the same checks (settings.json validity, daemon alive, canon loadable, promoted/ exists, inbox/sdk/ exists) and prints pass/fail per line. If \`doctor\` is also missing, the repo is older than this skill — check \`git log --oneline -5\` from the project root.
- **If present but \`daemonUp=false\`:** surface that to the user and STOP. Do not call \`generate\` — generation is daemon-gated and will sit queued forever.

The MCP path frequently does NOT load (the installer writes to the wrong settings file — see Troubleshooting), so the CLI branch is the working fallback, not an afterthought.

## When to use which tool

Generation + health have real engine-CLI twins (\`npm run artlab -- ...\`); the canon/pack READ tools are MCP-only — when the MCP server is down, Read those files directly off disk (paths in the CLI/fallback column).

| You want to... | MCP tool | CLI equivalent | Notes |
|---|---|---|---|
| See every canonical character / floor / palette | \`mcp__artlab__canon_list\` | Read \`$ROOT/docs/artlab/sdk/canon/\` directly (no list CLI) | Optional \`kind\` filter; canon also readable directly under \`docs/artlab/sdk/canon/\` |
| Fetch one canon entry (YAML-as-JSON) | \`mcp__artlab__canon_get\` | Read \`$ROOT/docs/artlab/sdk/canon/<id>.yaml\` directly | Required \`id\` |
| See every promoted Asset Pack | \`mcp__artlab__asset_pack_list\` | Read \`$ROOT/.artlab/engine/promoted/\` directly (no pack-list CLI) | Filters: kind / characterId / space |
| Fetch one Asset Pack manifest + file paths | \`mcp__artlab__asset_pack_get\` | Read \`$ROOT/.artlab/engine/promoted/<packId>/\` directly | Required \`packId\` |
| Get a copy-paste TSX integration snippet | \`mcp__artlab__asset_pack_integration\` | MCP-only (no CLI twin) | Required \`packId\`; \`targetFramework\` defaults to next-app-router |
| Audit what art is MISSING | \`mcp__artlab__slot_audit\` | MCP-only (no CLI twin; compare canon vs promoted/ by hand) | Returns slots with no promoted pack |
| Request a NEW artifact be generated | \`mcp__artlab__generate\` | \`npm run artlab -- produce "..."\` | Returns a \`runId\` immediately; poll with \`generate_status\` |
| Poll an in-flight generation | \`mcp__artlab__generate_status\` | \`npm run artlab -- status <runId>\` (omit runId or \`queue\` for the whole queue) | Status: queued / running / blocked / promoted / cancelled / failed |
| Health snapshot | \`mcp__artlab__diagnostics\` | \`npm run artlab -- doctor\` / \`health\` | daemonUp, provider reachability, backlog, recent runs |

## Decision tree

- **Broad "what's missing / what art do we still need"** → \`mcp__artlab__slot_audit\` (MCP-only — or compare canon vs promoted/ by hand). Don't enumerate canon by hand.
- **"This might already exist" (a specific character/floor/space)** → \`mcp__artlab__asset_pack_list\` to check, then \`mcp__artlab__asset_pack_integration\` to hand back the snippet if a pack is found.
- **Generate ONLY when the list comes back empty.** Generation is async, daemon-gated, and costs a run — never the first move.

## Canonical paths

Resolve the repo root with \`ROOT=$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || echo "${opts.repoRoot}")\`, then:

- Canon YAML lives in **\`${opts.repoRoot}/docs/artlab/sdk/canon/\`** — never edit promoted Asset Pack files directly; canon edits feed the next regeneration.
- Promoted Asset Packs live in **\`${opts.repoRoot}/.artlab/engine/promoted/\`** — these are byte-protected by CI.
- Inbox for new generation runs: **\`${opts.repoRoot}/.artlab/engine/inbox/sdk/\`** — written by \`mcp__artlab__generate\`, consumed by the ArtLab daemon.

## Typical session flow

1. Caller says: "I need a Sol Navarro idle animation."
2. Call \`mcp__artlab__canon_get\` with id \`sol-navarro\` to ground in canon.
3. Call \`mcp__artlab__asset_pack_list\` with kind \`sprite-animation\` and characterId \`sol-navarro\` to check if one exists already.
4. If none: call \`mcp__artlab__generate\` with kind=\`sprite-animation\`, description=\`Sol idle breathe loop, 1.2s, ease-in-out\`. You get a \`runId\`.
5. Poll \`mcp__artlab__generate_status\` until status=\`promoted\`. You get a \`promotedPackId\`.
6. Call \`mcp__artlab__asset_pack_integration\` with that packId to get the exact TSX snippet.
7. Paste the snippet into the right \`src/app/\` page. Run \`npm run build\`. Ship.

Two prose call examples (no \`mcp\` object exists in the runtime — call the tools by name):

- List War Room backgrounds: call \`mcp__artlab__asset_pack_list\` with \`{ kind: "floor", space: "war-room" }\`.
- Generate then poll an icon: call \`mcp__artlab__generate\` with \`{ kind: "icon", description: "Elevator chevron in brass, 24px, monoline" }\` → take the returned \`runId\` → call \`mcp__artlab__generate_status\` with \`{ runId }\` until \`status: "promoted"\`.

## Hard rules — DO NOT BREAK

- **Never** byte-edit a promoted Asset Pack on disk. Treat \`promoted/\` as read-only.
- **Never** invent a character or floor outside canon. If the user names something unknown, call \`mcp__artlab__canon_list\` first and surface that as an error.
- **Never** describe the ArtLab SDK as the underlying generation engine in user-facing copy — internally they're layers of one system, externally the SDK is the **ArtLab SDK**.
- **Never** call \`mcp__artlab__generate\` without a description >= 8 chars (the schema will reject it).
- **Prefer an existing promoted pack over generate** — generation is async, daemon-gated, and costs a run. (Note: in the current environment \`${opts.repoRoot}/.artlab/engine/promoted/\` is empty except \`.gitkeep\`, so a list/audit will legitimately return nothing and route you to generate until packs exist — that is expected, not a contradiction.)

## Troubleshooting

### \`mcp__artlab__*\` tools don't appear in my session

If the artlab MCP tools aren't in your tool list (visible via ToolSearch or in deferred tool listings), the MCP server failed to load in this session. Recovery steps:

1. **Verify Claude Code sees the server.** Run \`claude mcp list\` from the project root. Look for an \`artlab\` line. If it is missing, Claude Code is not aware of the entry.

2. **Check where the entry actually lives.** Claude Code reads MCP servers from \`~/.claude.json\` (and project-scope \`.mcp.json\` / \`.claude/settings.local.json\`), NOT from \`~/.claude/settings.json\`. The current \`npm run artlab:sdk-install-mcp\` writes to \`~/.claude/settings.json\` — known bug, see \`docs/issues/artlab-mcp-load-failure.md\` in the repo. To register the server correctly, copy the entry from \`~/.claude/settings.json\` mcpServers.artlab into \`~/.claude.json\` (top-level \`mcpServers\`), or use \`claude mcp add\` directly:
   \`\`\`bash
   ROOT=$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || echo "${opts.repoRoot}")
   claude mcp add artlab npx -- tsx "$ROOT/scripts/artlab-sdk-mcp.ts"
   \`\`\`
   Then add the two env vars (\`ARTLAB_WORKSPACE_ROOT\`, \`ARTLAB_CANON_ROOT\`) via \`claude mcp\` flags or by editing \`~/.claude.json\`. Ensure the entry's \`command\` + \`ARTLAB_CANON_ROOT\` point at the real repo root (\`${opts.repoRoot}\`), not a stale path.

3. **Verify the server starts.** Run from the repo root:
   \`\`\`bash
   ROOT=$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || echo "${opts.repoRoot}")
   cd "$ROOT"
   npx tsx scripts/artlab-sdk-mcp.ts --help
   \`\`\`
   It MUST be run from the repo root — the server uses \`@/lib/...\` path aliases that resolve via \`tsconfig.json\` in cwd. Running it from any other directory (including \`/\`) fails with \`Cannot find module '@/lib/artlab/state/snapshots'\`. If Claude Code launches in a non-repo directory, the spawned server will crash on module load. Workaround: launch \`claude\` from inside the repo root.

4. **Restart Claude Code.** MCP server registration happens at session start. New servers added via \`claude mcp add\` or by editing \`~/.claude.json\` are NOT picked up by an in-flight session — you must exit and reopen.

5. **Fall back to the CLI / direct file reads.** Generation and health have real \`npm run artlab -- ...\` twins (\`produce\`, \`status\`, \`doctor\`/\`health\`); the canon/pack READ tools have no list CLI, but the underlying files are readable directly with the standard \`Read\` tool — canon under \`${opts.repoRoot}/docs/artlab/sdk/canon/\` and promoted packs under \`${opts.repoRoot}/.artlab/engine/promoted/\`. Two tools are MCP-only with no fallback: \`asset_pack_integration\` (snippet generation) and \`slot_audit\` (compare canon vs promoted/ by hand). See the CLI column in the tool table above for the exact per-tool fallback.

### Tool naming note

The MCP tools are registered server-side as \`artlab/canon_list\`, \`artlab/canon_get\`, etc. (with a slash — that is only the on-the-wire server name). Claude Code surfaces them as \`mcp__artlab__canon_list\` style — the harness sanitizes the slash to underscores. Always invoke the \`mcp__artlab__*\` form; the slash form is non-invocable in the agent runtime.
`;
}
