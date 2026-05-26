// src/lib/artlab/daemon/launchd.test.ts
import { describe, expect, it } from "vitest";
import { renderLaunchdPlist, ARTLAB_LAUNCHD_LABEL } from "./launchd";

describe("launchd plist generator", () => {
  it("uses the canonical label com.tower.artlab", () => {
    expect(ARTLAB_LAUNCHD_LABEL).toBe("com.tower.artlab");
  });

  it("renders a plist with Label, ProgramArguments, KeepAlive, RunAtLoad, StdoutPath, StderrPath, WorkingDirectory", () => {
    const xml = renderLaunchdPlist({
      nodeBinary: "/usr/local/bin/node",
      daemonEntry: "/Users/armaanarora/Documents/The Tower/scripts/artlab.ts",
      workspaceRoot: "/Users/armaanarora/Documents/The Tower/.artlab/engine",
      logRoot: "/Users/armaanarora/Library/Logs/artlab",
    });
    expect(xml).toContain("<key>Label</key>");
    expect(xml).toContain("<string>com.tower.artlab</string>");
    expect(xml).toContain("<key>ProgramArguments</key>");
    expect(xml).toContain("<string>/usr/local/bin/node</string>");
    expect(xml).toContain("<key>KeepAlive</key>");
    expect(xml).toContain("<true/>");
    expect(xml).toContain("<key>RunAtLoad</key>");
    expect(xml).toContain("<key>StandardOutPath</key>");
    expect(xml).toContain("<key>StandardErrorPath</key>");
    expect(xml).toContain("/Users/armaanarora/Library/Logs/artlab/artlab.out.log");
  });

  it("escapes XML special characters in paths", () => {
    const xml = renderLaunchdPlist({
      nodeBinary: "/usr/bin/node",
      daemonEntry: "/path with & ampersand/artlab.ts",
      workspaceRoot: "/tmp",
      logRoot: "/tmp/logs",
    });
    expect(xml).toContain("&amp;");
    expect(xml).not.toMatch(/ & /);
  });

  it("sets PATH including the node binary's dir so spawned hooks find npm", () => {
    const xml = renderLaunchdPlist({
      nodeBinary: "/Users/me/.local/share/fnm/node-versions/v22.22.1/installation/bin/node",
      daemonEntry: "/x/scripts/artlab.ts",
      workspaceRoot: "/x/.artlab/engine",
      logRoot: "/x/logs",
    });
    expect(xml).toContain("<key>PATH</key>");
    expect(xml).toContain("/Users/me/.local/share/fnm/node-versions/v22.22.1/installation/bin");
    expect(xml).toContain("/usr/local/bin");
    expect(xml).toContain("/opt/homebrew/bin");
  });

  it("inserts tsxLoaderPath before daemonEntry so node can load TypeScript", () => {
    const xml = renderLaunchdPlist({
      nodeBinary: "/usr/local/bin/node",
      daemonEntry: "/proj/scripts/artlab.ts",
      workspaceRoot: "/proj/.artlab/engine",
      logRoot: "/proj/.artlab/engine/logs",
      tsxLoaderPath: "/proj/node_modules/tsx/dist/cli.mjs",
    });
    const nodeIdx = xml.indexOf("<string>/usr/local/bin/node</string>");
    const tsxIdx = xml.indexOf("<string>/proj/node_modules/tsx/dist/cli.mjs</string>");
    const entryIdx = xml.indexOf("<string>/proj/scripts/artlab.ts</string>");
    expect(nodeIdx).toBeGreaterThan(-1);
    expect(tsxIdx).toBeGreaterThan(nodeIdx);
    expect(entryIdx).toBeGreaterThan(tsxIdx);
  });
});
