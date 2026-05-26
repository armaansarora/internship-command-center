import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFoundryMcpServer } from "../src/lib/artlab/sdk/mcp/server";

const HELP = `tower-art-foundry - MCP stdio server

Usage:
  npx tsx scripts/foundry-mcp.ts           Start the server on stdio.
  npx tsx scripts/foundry-mcp.ts --help    Print this help and exit 0.
  npx tsx scripts/foundry-mcp.ts --version Print server version and exit 0.

Environment:
  FOUNDRY_WORKSPACE_ROOT    Path to ArtLab workspace (default: .artlab/engine)
  FOUNDRY_CANON_ROOT        Path to canon root      (default: .artlab/canon)
  FOUNDRY_PACKS_ROOT        Path to promoted packs  (default: .artlab/engine/promoted)
  FOUNDRY_SLOT_REGISTRY     Path to slot registry   (default: .artlab/engine/slots/registry.json)
  FOUNDRY_MEMORY_DIR        Path to memory ledger   (default: .artlab/engine/memory)
`;

function readVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(here, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  return pkg.version;
}

async function main(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }
  if (argv.includes("--version") || argv.includes("-v")) {
    process.stdout.write(`${readVersion()}\n`);
    return 0;
  }

  const cwd = process.cwd();
  const workspaceRoot = process.env.FOUNDRY_WORKSPACE_ROOT ?? join(cwd, ".artlab", "engine");
  const canonRoot = process.env.FOUNDRY_CANON_ROOT ?? join(cwd, ".artlab", "canon");
  const packsRoot = process.env.FOUNDRY_PACKS_ROOT ?? join(workspaceRoot, "promoted");
  const slotRegistryPath =
    process.env.FOUNDRY_SLOT_REGISTRY ?? join(workspaceRoot, "slots", "registry.json");
  const memoryDir = process.env.FOUNDRY_MEMORY_DIR ?? join(workspaceRoot, "memory");

  if (!existsSync(workspaceRoot)) {
    if (process.env.FOUNDRY_AUTOCREATE_WORKSPACE === "1") {
      mkdirSync(workspaceRoot, { recursive: true });
    } else {
      process.stderr.write(`foundry: workspace not found at ${workspaceRoot}\n`);
      return 2;
    }
  }

  const built = createFoundryMcpServer({
    workspaceRoot,
    canonRoot,
    packsRoot,
    slotRegistryPath,
    memoryDir,
    providerProbes: {},
    version: readVersion(),
    env: process.env,
  });
  const transport = new StdioServerTransport();
  await built.server.connect(transport);
  return 0;
}

const invokedPath = process.argv[1] ?? "";
const isDirectInvocation =
  invokedPath.endsWith("/foundry-mcp.ts") ||
  invokedPath.endsWith("\\foundry-mcp.ts") ||
  invokedPath.endsWith("/foundry-mcp.js") ||
  invokedPath.endsWith("\\foundry-mcp.js");

if (isDirectInvocation) {
  void main(process.argv.slice(2)).then((code) => {
    if (code !== 0) process.exit(code);
  });
}
