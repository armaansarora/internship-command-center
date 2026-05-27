# ArtLab SDK

The ArtLab SDK is the agent-native layer that sits on top of the ArtLab engine.
It is the surface AI agents (Claude Code, Antigravity, the Telegram bot) call
into to acquire, generate, preview, and integrate Tower art across every
modality: characters, floors, UI textures, icons, sprite animations, and Lottie.

The SDK and the engine are two layers of one system. The engine produces; the
SDK is how agents and humans reach in and use what the engine produces.

## Where things live

| What | Path |
|---|---|
| Tool registry (source of truth) | `src/lib/artlab/sdk/mcp/manifest.json` |
| Tool input/output schemas | `src/lib/artlab/sdk/mcp/tools.ts` |
| Tool handlers (one file per tool) | `src/lib/artlab/sdk/mcp/tool-handlers/` |
| MCP server factory | `src/lib/artlab/sdk/mcp/server.ts` |
| Brain layer (intent routing) | `src/lib/artlab/sdk/brain/` |
| Demo page | `src/app/artlab-demo/page.tsx` |

Full file map: `STRUCTURE.md` → "ArtLab SDK" section.

## How to invoke

The MCP server identifier is `artlab` and uses stdio transport.

| Command | What it does |
|---|---|
| `npm run artlab:sdk-mcp` | Start the MCP server on stdio. |
| `npm run artlab:sdk-install-mcp` | Register the server in Claude Code's `settings.json`. |
| `npm run artlab:sdk-install-claude-skill` | Write `~/.claude/skills/artlab/SKILL.md`. |
| `npm run artlab:sdk-install-antigravity-workspace` | Write `.antigravity/workspaces/artlab/workspace.yaml`. |

Telegram fallback (no MCP needed): `/sdk status`, `/sdk list <kind>`,
`/sdk generate <kind> <description>`, `/sdk preview <packId>`.

## The 9 tools

From `src/lib/artlab/sdk/mcp/manifest.json`:

| Tool | Summary |
|---|---|
| `artlab/canon_list` | List canonical characters/floors/palettes/style-envelopes. |
| `artlab/canon_get` | Fetch one canon entry by id (returns YAML-as-JSON). |
| `artlab/asset_pack_list` | List promoted Asset Packs filtered by kind/character/space. |
| `artlab/asset_pack_get` | Fetch one Asset Pack manifest + file paths. |
| `artlab/asset_pack_integration` | Get a copy-paste TSX integration snippet for one pack. |
| `artlab/slot_audit` | List registered slots that lack a promoted Asset Pack. |
| `artlab/generate` | Queue a new generation run; returns a runId in `queued` status. |
| `artlab/generate_status` | Poll a runId; returns phase, percent, blockers, ETA, promoted packId. |
| `artlab/diagnostics` | Daemon health + provider reachability + last 5 runs + backlog depth. |

A typical agent flow: `canon_list` to discover what exists, `asset_pack_list` to
find what's already promoted, `asset_pack_integration` to get the TSX snippet,
or `generate` + `generate_status` to produce something new.

## See also

- `CLAUDE.md` — high-level ArtLab SDK section + project conventions.
- `STRUCTURE.md` — full file map ("ArtLab SDK" section).
- `docs/artlab/ENGINE.md` — engine architecture and state machine.
- `docs/artlab/OPERATIONS.md` — daemon runbook and troubleshooting.
