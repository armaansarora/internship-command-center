export interface RenderFoundryAntigravityWorkspaceOpts {
  repoRoot: string;
}

export function renderFoundryAntigravityWorkspace(opts: RenderFoundryAntigravityWorkspaceOpts): string {
  return `workspace: tower-art-foundry
description: |
  Tower Art Foundry workspace for Antigravity sessions. This workspace
  gives the session access to the foundry MCP server and the canon
  source of truth. Use it when generating, integrating, or editing any
  visual artifact for The Tower app.

mcp:
  - name: tower-art-foundry
    command: npx
    args:
      - tsx
      - ${opts.repoRoot}/scripts/foundry-mcp.ts
    env:
      FOUNDRY_WORKSPACE_ROOT: ${opts.repoRoot}/.artlab/engine
      FOUNDRY_CANON_ROOT: ${opts.repoRoot}/.artlab/canon

paths:
  read-write:
    - ${opts.repoRoot}/.artlab/canon
    - ${opts.repoRoot}/src/app/foundry-demo
    - ${opts.repoRoot}/src/components/foundry
  byte-protected:
    # Promoted Asset Packs are NEVER directly edited. The foundry pipeline
    # regenerates them. Touching these paths is a hard error.
    - ${opts.repoRoot}/.artlab/engine/promoted
    - ${opts.repoRoot}/public/art/lobby/otis
    - ${opts.repoRoot}/public/art/penthouse/ceo
    - ${opts.repoRoot}/public/lobby

rules:
  - "Treat any path under \`byte-protected\` as read-only. CI (\`.github/workflows/artlab-byte-diff.yml\`) will reject any byte-level drift."
  - "When the user asks for new art, prefer calling \`foundry/generate\` over hand-editing files."
  - "Canon edits land in \`.artlab/canon/\` and feed the next regeneration — they do NOT change existing promoted packs."
  - "Use \`foundry/asset_pack_integration\` to get a copy-paste TSX snippet; never invent integration shapes by hand."

primary-actions:
  - foundry/canon_list
  - foundry/canon_get
  - foundry/asset_pack_list
  - foundry/asset_pack_get
  - foundry/asset_pack_integration
  - foundry/slot_audit
  - foundry/generate
  - foundry/generate_status
  - foundry/diagnostics
`;
}
