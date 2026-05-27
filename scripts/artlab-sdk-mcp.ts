import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createArtLabMcpServer } from "../src/lib/artlab/sdk/mcp/server";

const HELP = `artlab - MCP stdio server

Usage:
  npx tsx scripts/artlab-sdk-mcp.ts           Start the server on stdio.
  npx tsx scripts/artlab-sdk-mcp.ts --help    Print this help and exit 0.
  npx tsx scripts/artlab-sdk-mcp.ts --version Print server version and exit 0.

Environment:
  ARTLAB_WORKSPACE_ROOT    Path to ArtLab workspace (default: .artlab/engine)
  ARTLAB_CANON_ROOT        Path to canon root      (default: .artlab/canon)
  ARTLAB_PACKS_ROOT        Path to promoted packs  (default: .artlab/engine/promoted)
  ARTLAB_SLOT_REGISTRY     Path to slot registry   (default: .artlab/engine/slots/registry.json)
  ARTLAB_MEMORY_DIR        Path to memory ledger   (default: .artlab/engine/memory)
`;

function readVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(here, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  return pkg.version;
}

const LEGACY_ENV_VARS: ReadonlyArray<{ legacy: string; modern: string }> = [
  { legacy: "FOUNDRY_WORKSPACE_ROOT", modern: "ARTLAB_WORKSPACE_ROOT" },
  { legacy: "FOUNDRY_CANON_ROOT", modern: "ARTLAB_CANON_ROOT" },
];

async function main(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }
  if (argv.includes("--version") || argv.includes("-v")) {
    process.stdout.write(`${readVersion()}\n`);
    return 0;
  }

  const offending = LEGACY_ENV_VARS.filter(({ legacy }) => Boolean(process.env[legacy]));
  if (offending.length > 0) {
    const names = offending.map(({ legacy }) => legacy).join(", ");
    process.stderr.write(
      `artlab-sdk: refusing to start with deprecated env var(s) set: ${names}.\n`,
    );
    for (const { legacy, modern } of offending) {
      process.stderr.write(`  Use ${modern} instead (and unset ${legacy}).\n`);
    }
    return 2;
  }

  const cwd = process.cwd();
  const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? join(cwd, ".artlab", "engine");
  const canonRoot = process.env.ARTLAB_CANON_ROOT ?? join(cwd, ".artlab", "canon");
  const packsRoot = process.env.ARTLAB_PACKS_ROOT ?? join(workspaceRoot, "promoted");
  const slotRegistryPath =
    process.env.ARTLAB_SLOT_REGISTRY ?? join(workspaceRoot, "slots", "registry.json");
  const memoryDir = process.env.ARTLAB_MEMORY_DIR ?? join(workspaceRoot, "memory");

  if (!existsSync(workspaceRoot)) {
    if (process.env.ARTLAB_AUTOCREATE_WORKSPACE === "1") {
      mkdirSync(workspaceRoot, { recursive: true });
    } else {
      process.stderr.write(`artlab-sdk: workspace not found at ${workspaceRoot}\n`);
      return 2;
    }
  }

  const built = createArtLabMcpServer({
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
  invokedPath.endsWith("/artlab-sdk-mcp.ts") ||
  invokedPath.endsWith("\\artlab-sdk-mcp.ts") ||
  invokedPath.endsWith("/artlab-sdk-mcp.js") ||
  invokedPath.endsWith("\\artlab-sdk-mcp.js");

if (isDirectInvocation) {
  void main(process.argv.slice(2)).then((code) => {
    if (code !== 0) process.exit(code);
  });
}
