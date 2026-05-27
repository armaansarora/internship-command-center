# ArtLab SDK — Phase 8 acceptance walkthrough

This document is the human-facing proof that Phase 8 closed. Every item
below should be runnable verbatim in the repo's root directory.

## 1. Install paths

```bash
# ArtLab SDK MCP server (stdio).
npm run artlab:sdk-mcp -- --help

# Register the server with Claude Code (interactive).
ARTLAB_INSTALL_YES=1 npm run artlab:sdk-install-mcp

# Drop the Claude Code skill description.
ARTLAB_INSTALL_YES=1 npm run artlab:sdk-install-claude-skill

# Drop the Antigravity workspace template.
ARTLAB_INSTALL_YES=1 npm run artlab:sdk-install-antigravity-workspace
```

## 2. The 9 MCP tools

A spawned MCP client will see these via `client.listTools()`:

- `artlab/canon_list`
- `artlab/canon_get`
- `artlab/asset_pack_list`
- `artlab/asset_pack_get`
- `artlab/asset_pack_integration`
- `artlab/slot_audit`
- `artlab/generate`
- `artlab/generate_status`
- `artlab/diagnostics`

## 3. Acceptance tests

```bash
# Per-tool unit tests (Phase 6).
npx vitest run src/lib/artlab/sdk/mcp

# Per-agent brain tests + golden routing table (Phase 7).
npx vitest run src/lib/artlab/sdk/brain

# Agent loop end-to-end (Phase 8).
npx vitest run src/lib/artlab/sdk/integration/agent-loop.acceptance.test.ts

# Next build with artlab-demo.
npx vitest run src/app/artlab-demo/build.integration.test.ts
```

## 4. What "complete" means

Phase 8 is complete when:

1. All four install scripts succeed.
2. `agent-loop.acceptance.test.ts` exits 0 against the real stdio MCP server.
3. `build.integration.test.ts` exits 0 (Next compiles the demo page).
4. `STRUCTURE.md` and `CLAUDE.md` both describe the ArtLab SDK.
5. The `git tag artlab-sdk-phase-8-complete` lands.

## 5. Branding policy

The single brand name is **ArtLab**. The SDK layer (this directory) is
**ArtLab SDK**; the underlying engine is **ArtLab** (engine). Both are
internal layers of one system. Use the ArtLab brand exclusively in code,
docs, comments, commit messages, and user-facing strings — no legacy
project names anywhere.
