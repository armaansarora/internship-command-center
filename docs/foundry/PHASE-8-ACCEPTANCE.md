# Tower Art Foundry SDK — Phase 8 acceptance walkthrough

This document is the human-facing proof that Phase 8 closed. Every item
below should be runnable verbatim in the repo's root directory.

## 1. Install paths

```bash
# Tower Art Foundry MCP server (stdio).
npm run foundry:mcp -- --help

# Register the server with Claude Code (interactive).
FOUNDRY_INSTALL_YES=1 npm run foundry:install-mcp

# Drop the Claude Code skill description.
FOUNDRY_INSTALL_YES=1 npm run foundry:install-claude-skill

# Drop the Antigravity workspace template.
FOUNDRY_INSTALL_YES=1 npm run foundry:install-antigravity-workspace
```

## 2. The 9 MCP tools

A spawned MCP client will see these via `client.listTools()`:

- `foundry/canon_list`
- `foundry/canon_get`
- `foundry/asset_pack_list`
- `foundry/asset_pack_get`
- `foundry/asset_pack_integration`
- `foundry/slot_audit`
- `foundry/generate`
- `foundry/generate_status`
- `foundry/diagnostics`

## 3. Acceptance tests

```bash
# Per-tool unit tests (Phase 6).
npx vitest run src/lib/foundry/mcp

# Per-agent brain tests + golden routing table (Phase 7).
npx vitest run src/lib/foundry/brain

# Agent loop end-to-end (Phase 8).
npx vitest run src/lib/foundry/integration/agent-loop.acceptance.test.ts

# Next build with foundry-demo.
npx vitest run src/app/foundry-demo/build.integration.test.ts
```

## 4. What "complete" means

Phase 8 is complete when:

1. All four install scripts succeed.
2. `agent-loop.acceptance.test.ts` exits 0 against the real stdio MCP server.
3. `build.integration.test.ts` exits 0 (Next compiles the demo page).
4. `STRUCTURE.md` and `CLAUDE.md` both describe the foundry SDK.
5. The `git tag foundry-phase-8-complete` lands.

## 5. Branding policy

User-facing copy says **Tower Art Foundry** (or **Foundry** short). The
engine layer remains **ArtLab** in internal code paths and developer docs —
the two are layers of one system, never marketed as separate products.
