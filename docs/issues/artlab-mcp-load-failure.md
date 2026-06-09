# ArtLab MCP server fails to load in fresh Claude Code sessions

## Summary

In a fresh Claude Code session opened in this repo, `mcp__artlab__*` tools
never appear in the deferred tool list. `claude mcp list` does not show
`artlab`. The MCP entry IS present in `~/.claude/settings.json` and the
server itself runs correctly when invoked from the repo root with the
right cwd. There are two independent bugs that combine to make the SDK
invisible to AI agents.

## Bug 1 — Install script writes to the wrong file

`scripts/artlab-sdk-install-mcp.ts` (line 70) defaults `settingsPath` to
`~/.claude/settings.json`. Claude Code does NOT read MCP servers from
that file — the canonical store is `~/.claude.json` (or any of: project
`.mcp.json`, project `.claude/settings.local.json`, user-scope
`~/.claude.json`). `claude mcp list` agrees: it shows `codex` and
`github` (which live in `~/.claude.json`) but not `artlab` (which lives
in `~/.claude/settings.json`).

Evidence:

```
$ claude mcp list 2>&1 | grep -E "codex|github|artlab"
codex: /Users/armaanarora/.npm-global/bin/codex mcp-server - Connected
github: npx -y @modelcontextprotocol/server-github - Connected
# no artlab line

$ node -e 'const c=JSON.parse(require("fs").readFileSync("/Users/armaanarora/.claude.json","utf8")); console.log(Object.keys(c.mcpServers||{}))'
[ 'codex', 'github' ]

$ grep -A 2 '"artlab"' ~/.claude/settings.json | head -5
    "artlab": {
      "command": "npx",
      "args": [
        "tsx",
```

## Bug 2 — Server crashes when spawned from a non-repo cwd

Even if Bug 1 is patched, the server fails when Claude Code spawns it
because `scripts/artlab-sdk-mcp.ts` imports
`../src/lib/artlab/sdk/mcp/server` which itself uses `@/lib/...` path
aliases. `tsx` resolves the `@/` alias via `tsconfig.json` from `cwd`
— if Claude Code launches in any directory other than the repo root,
or has no explicit `cwd` set on the MCP entry, the server explodes
during module load:

```
$ cd / && npx tsx "/Users/armaanarora/Developer/The Tower/scripts/artlab-sdk-mcp.ts" --help
Error: Cannot find module '@/lib/artlab/state/snapshots'
Require stack:
- /Users/armaanarora/Developer/The Tower/src/lib/artlab/sdk/mcp/tool-handlers/generate.ts
- /Users/armaanarora/Developer/The Tower/src/lib/artlab/sdk/mcp/server.ts
- /Users/armaanarora/Developer/The Tower/scripts/artlab-sdk-mcp.ts
```

The same command from the repo root succeeds and prints `--help`. The
MCP snippet computed by `computeArtLabClaudeSnippet` (install-mcp.ts
line 17) does not set a `cwd` on the server entry, so Claude Code
inherits the launching shell's cwd.

## Reproduction

1. From a fresh shell, run `claude` in this repo.
2. In the session, ask for any artlab tool (e.g. trigger the skill and
   try `mcp__artlab__diagnostics`).
3. Observe: tool not in deferred list. ToolSearch for the name returns
   "No matching deferred tools found".
4. Run `claude mcp list` — no `artlab` line.

## Proposed fix

1. **Switch install target.** Use `claude mcp add-json artlab <json>` (or
   equivalent native API) instead of patching `~/.claude/settings.json`.
   This guarantees the entry lands in `~/.claude.json` where Claude Code
   actually reads from. Alternatively keep the current file-patch
   approach but target `~/.claude.json` and respect its nested
   `projects.{repoPath}.mcpServers` schema.
2. **Pin server cwd.** Either add `cwd` to the MCP entry (if the schema
   supports it) so the server always spawns at the repo root, or change
   `scripts/artlab-sdk-mcp.ts` to `process.chdir(<resolved repo root>)`
   before importing the SDK, or restructure imports to avoid `@/` path
   aliases.
3. **Verify after install.** Append a post-install step that runs
   `claude mcp get artlab` (or a programmatic equivalent) and tells the
   user whether the entry is now visible to Claude Code. The current
   script reports "Wrote /Users/.../settings.json" with no signal that
   the file is the wrong one.

## Workaround

Until fixed, agents should fall back to the CLI:

```
cd "/Users/armaanarora/Developer/The Tower"
npm run artlab -- doctor       # session-readiness check
npm run artlab -- status       # see runs
npm run artlab -- produce "<request>"
```

The skill file (`~/.claude/skills/artlab/SKILL.md`) carries a
Troubleshooting section that documents this fallback.
