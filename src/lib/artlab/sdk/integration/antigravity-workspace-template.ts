export interface RenderArtLabAntigravityWorkspaceOpts {
  repoRoot: string;
}

export function renderArtLabAntigravityWorkspace(opts: RenderArtLabAntigravityWorkspaceOpts): string {
  return `workspace: tower-art-foundry
description: |
  Tower Art ArtLab workspace for Antigravity sessions. This workspace
  gives the session access to the ArtLab SDK MCP server and the canon
  source of truth. Use it when generating, integrating, or editing any
  visual artifact for The Tower app.

mcp:
  - name: tower-art-foundry
    command: npx
    args:
      - tsx
      - ${opts.repoRoot}/scripts/artlab-sdk-mcp.ts
    env:
      ARTLAB_WORKSPACE_ROOT: ${opts.repoRoot}/.artlab/engine
      ARTLAB_CANON_ROOT: ${opts.repoRoot}/.artlab/canon

paths:
  read-write:
    - ${opts.repoRoot}/.artlab/canon
    - ${opts.repoRoot}/src/app/foundry-demo
    - ${opts.repoRoot}/src/components/artlab
  byte-protected:
    # Promoted Asset Packs are NEVER directly edited. The ArtLab SDK pipeline
    # regenerates them. Touching these paths is a hard error.
    - ${opts.repoRoot}/.artlab/engine/promoted
    - ${opts.repoRoot}/public/art/lobby/otis
    - ${opts.repoRoot}/public/art/penthouse/ceo
    - ${opts.repoRoot}/public/lobby

rules:
  - "Treat any path under \`byte-protected\` as read-only. CI (\`.github/workflows/artlab-byte-diff.yml\`) will reject any byte-level drift."
  - "When the user asks for new art, prefer calling \`artlab/generate\` over hand-editing files."
  - "Canon edits land in \`.artlab/canon/\` and feed the next regeneration — they do NOT change existing promoted packs."
  - "Use \`artlab/asset_pack_integration\` to get a copy-paste TSX snippet; never invent integration shapes by hand."

primary-actions:
  - artlab/canon_list
  - artlab/canon_get
  - artlab/asset_pack_list
  - artlab/asset_pack_get
  - artlab/asset_pack_integration
  - artlab/slot_audit
  - artlab/generate
  - artlab/generate_status
  - artlab/diagnostics
`;
}
