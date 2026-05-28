// src/lib/artlab/sdk/canon/canon-identity-map.test.ts
//
// Telemetry contract for the sync canon identity loader. Before the
// 2026-05-27 follow-up landed, malformed canon YAMLs and unreadable canon
// directories silently degraded the loader to "no identities" with NO
// signal to the operator — every downstream consumer regressed to legacy
// roleSlug shape and `daemon-errors.jsonl` stayed empty.
//
// This test asserts the opt-in `options.onError` accumulator fires:
//   1. Once per individual YAML that fails to parse.
//   2. Once at the directory level when `readdirSync` fails (missing canon).
//
// Run-time consumers (sdk-poller, promotion-runner, intake/router) pass an
// onError that pipes errors into `recordDaemonError`. Unit tests pass an
// accumulator array so we can assert the callback contract without
// filesystem side effects.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadCanonIdentities,
  resetCanonIdentityCache,
  resolveCanonIdentity,
} from "./canon-identity-map";

describe("canon-identity-map — onError telemetry", () => {
  let canonRoot: string;
  beforeEach(() => {
    canonRoot = mkdtempSync(join(tmpdir(), "artlab-canon-identity-"));
    resetCanonIdentityCache();
  });
  afterEach(() => {
    resetCanonIdentityCache();
    rmSync(canonRoot, { recursive: true, force: true });
  });

  it("invokes onError when the characters directory is unreachable", () => {
    // canonRoot exists but has no `characters/` subdirectory — readdirSync
    // will throw ENOENT. The loader must surface that via onError.
    const errors: Array<{ file: string; message: string }> = [];
    const identities = loadCanonIdentities({
      canonRoot,
      onError: (err, file) => {
        errors.push({ file, message: err.message });
      },
    });
    expect(identities).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("characters");
    expect(errors[0]!.message).toMatch(/ENOENT|no such file/i);
  });

  it("invokes onError per malformed YAML file but still returns valid identities", () => {
    const charactersDir = join(canonRoot, "characters");
    mkdirSync(charactersDir, { recursive: true });
    // One valid file — picked up.
    writeFileSync(
      join(charactersDir, "sol-navarro.yaml"),
      [
        "header:",
        "  kind: character",
        "  id: sol-navarro",
        "roleSlug: cno",
        "displayName: \"Sol Navarro\"",
        "shortLabel: Sol",
        "title: Chief Networking Officer",
        "floorId: rolodex-lounge",
        "floorLabel: Floor 6",
        "",
      ].join("\n"),
    );
    // One malformed YAML — must trigger onError with the filename.
    writeFileSync(
      join(charactersDir, "broken.yaml"),
      "this is not: valid: yaml: at all: [unclosed",
    );

    const errors: Array<{ file: string; message: string }> = [];
    const identities = loadCanonIdentities({
      canonRoot,
      onError: (err, file) => {
        errors.push({ file, message: err.message });
      },
    });
    expect(identities).toHaveLength(1);
    expect(identities[0]!.headerId).toBe("sol-navarro");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("broken.yaml");
    expect(errors[0]!.message).toBeTruthy();
  });

  it("invokes onError once when a YAML parses but is missing required identity fields", () => {
    const charactersDir = join(canonRoot, "characters");
    mkdirSync(charactersDir, { recursive: true });
    // Missing header.id — incomplete identity record.
    writeFileSync(
      join(charactersDir, "missing-header.yaml"),
      ["roleSlug: nothing", "displayName: Anon", ""].join("\n"),
    );

    const errors: Array<{ file: string; message: string }> = [];
    const identities = loadCanonIdentities({
      canonRoot,
      onError: (err, file) => {
        errors.push({ file, message: err.message });
      },
    });
    expect(identities).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("missing-header.yaml");
    expect(errors[0]!.message).toMatch(/header\.id|roleSlug|floorId/i);
  });

  it("does NOT invoke onError on the happy path", () => {
    const charactersDir = join(canonRoot, "characters");
    mkdirSync(charactersDir, { recursive: true });
    writeFileSync(
      join(charactersDir, "sol-navarro.yaml"),
      [
        "header:",
        "  kind: character",
        "  id: sol-navarro",
        "roleSlug: cno",
        "displayName: \"Sol Navarro\"",
        "shortLabel: Sol",
        "title: Chief Networking Officer",
        "floorId: rolodex-lounge",
        "floorLabel: Floor 6",
        "",
      ].join("\n"),
    );
    const errors: Array<{ file: string; message: string }> = [];
    const identities = loadCanonIdentities({
      canonRoot,
      onError: (err, file) => {
        errors.push({ file, message: err.message });
      },
    });
    expect(identities).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("threads onError through resolveCanonIdentity", () => {
    // Missing canon directory — resolveCanonIdentity must propagate the
    // onError to its caller via the same options.onError parameter.
    const errors: Array<{ file: string; message: string }> = [];
    const resolved = resolveCanonIdentity("sol-navarro", {
      canonRoot,
      onError: (err, file) => {
        errors.push({ file, message: err.message });
      },
    });
    expect(resolved).toBeUndefined();
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("characters");
  });
});
