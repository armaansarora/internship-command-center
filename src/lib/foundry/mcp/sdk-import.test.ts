import { describe, expect, it } from "vitest";

describe("MCP SDK availability", () => {
  it("can import @modelcontextprotocol/sdk Server class", async () => {
    const mod = await import("@modelcontextprotocol/sdk/server/index.js");
    expect(typeof mod.Server).toBe("function");
  });

  it("can import the stdio transport", async () => {
    const mod = await import("@modelcontextprotocol/sdk/server/stdio.js");
    expect(typeof mod.StdioServerTransport).toBe("function");
  });
});
