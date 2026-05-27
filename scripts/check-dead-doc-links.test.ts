// scripts/check-dead-doc-links.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findDeadDocLinks } from "./check-dead-doc-links";

function makeTempRoot(): string {
  return mkdtempSync(join(tmpdir(), "dead-doc-links-"));
}

describe("findDeadDocLinks", () => {
  let root: string;

  beforeEach(() => {
    root = makeTempRoot();
  });

  it("returns an empty array when all referenced docs exist (live fixture)", () => {
    // Setup: CLAUDE.md referencing docs/foo.md and STRUCTURE.md referencing
    // docs/artlab/sdk/README.md and ./peer.md (relative).
    mkdirSync(join(root, "docs", "artlab", "sdk"), { recursive: true });
    writeFileSync(
      join(root, "CLAUDE.md"),
      "See `docs/foo.md` and [bar](docs/bar.md) for context.\n",
    );
    writeFileSync(
      join(root, "STRUCTURE.md"),
      "Refer to docs/artlab/sdk/README.md for the SDK overview.\n",
    );
    writeFileSync(join(root, "docs", "foo.md"), "# Foo\n");
    writeFileSync(join(root, "docs", "bar.md"), "# Bar\n");
    writeFileSync(
      join(root, "docs", "artlab", "sdk", "README.md"),
      "See [peer doc](./peer.md) here.\n",
    );
    writeFileSync(join(root, "docs", "artlab", "sdk", "peer.md"), "# Peer\n");

    const dead = findDeadDocLinks({ root });
    expect(dead).toEqual([]);
  });

  it("returns dead entries with correct source, line, and path (dead fixture)", () => {
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(
      join(root, "CLAUDE.md"),
      "intro\nReference docs/missing.md here.\nlast line\n",
    );

    const dead = findDeadDocLinks({ root });
    expect(dead).toEqual([
      { source: "CLAUDE.md", line: 2, path: "docs/missing.md" },
    ]);
  });

  it("detects dead `](./...md)` relative links resolved against the source dir", () => {
    mkdirSync(join(root, "docs", "artlab"), { recursive: true });
    writeFileSync(join(root, "CLAUDE.md"), "no refs here\n");
    writeFileSync(
      join(root, "docs", "artlab", "ENGINE.md"),
      "line one\nline two [peer](./MISSING-PEER.md)\n",
    );

    const dead = findDeadDocLinks({ root });
    expect(dead).toEqual([
      {
        source: "docs/artlab/ENGINE.md",
        line: 2,
        path: "docs/artlab/MISSING-PEER.md",
      },
    ]);
  });

  it("skips files under docs/legacy/", () => {
    mkdirSync(join(root, "docs", "legacy"), { recursive: true });
    writeFileSync(join(root, "CLAUDE.md"), "no refs here\n");
    writeFileSync(
      join(root, "docs", "legacy", "OLD.md"),
      "Reference docs/does-not-exist.md from legacy.\n",
    );

    const dead = findDeadDocLinks({ root });
    expect(dead).toEqual([]);
  });

  it("skips references inside fenced code blocks (``` and ~~~)", () => {
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(
      join(root, "CLAUDE.md"),
      [
        "intro line",
        "```bash",
        "git mv docs/old.md docs/legacy/old.md",
        "```",
        "~~~text",
        "see docs/another-fake.md inside a tilde fence",
        "~~~",
        "trailing prose",
      ].join("\n") + "\n",
    );

    const dead = findDeadDocLinks({ root });
    expect(dead).toEqual([]);
  });

  it("sorts dead entries by source then line for deterministic output", () => {
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(
      join(root, "STRUCTURE.md"),
      "line one\nrefs docs/zz-missing.md\n",
    );
    writeFileSync(
      join(root, "CLAUDE.md"),
      "needs docs/aa-missing.md\nand docs/bb-missing.md too\n",
    );

    const dead = findDeadDocLinks({ root });
    expect(dead).toEqual([
      { source: "CLAUDE.md", line: 1, path: "docs/aa-missing.md" },
      { source: "CLAUDE.md", line: 2, path: "docs/bb-missing.md" },
      { source: "STRUCTURE.md", line: 2, path: "docs/zz-missing.md" },
    ]);
  });
});
