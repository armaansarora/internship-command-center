import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ARTLAB_MCP_TOOL_NAMES } from "./tools";

const ManifestSchema = z
  .object({
    name: z.literal("artlab"),
    description: z.string().min(20),
    homepage: z.string().url(),
    tools: z
      .array(
        z
          .object({
            name: z.string().min(1),
            summary: z.string().min(8),
          })
          .strict(),
      )
      .length(ARTLAB_MCP_TOOL_NAMES.length),
    transport: z.literal("stdio"),
    command: z.string().min(1),
    args: z.array(z.string()),
  })
  .strict();

describe("manifest.json", () => {
  it("matches the MCP descriptor schema", () => {
    const raw = readFileSync(join(__dirname, "manifest.json"), "utf8");
    const parsed = ManifestSchema.parse(JSON.parse(raw));
    expect(parsed.tools.map((t) => t.name).sort()).toEqual([...ARTLAB_MCP_TOOL_NAMES].sort());
  });

  it("uses the canonical bootstrap script in command/args", () => {
    const raw = readFileSync(join(__dirname, "manifest.json"), "utf8");
    const parsed = JSON.parse(raw) as { command: string; args: string[] };
    expect(parsed.command).toBe("npx");
    expect(parsed.args).toContain("tsx");
    expect(parsed.args.some((a) => a.endsWith("artlab-sdk-mcp.ts"))).toBe(true);
  });
});
