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
});
