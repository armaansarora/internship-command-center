// src/lib/artlab/sdk/canon/loader.ts
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { ArtLabCanonHeaderSchema, type ArtLabCanonLoadResult } from "./types";

export interface LoadArtLabCanonError extends Error {
  code: "yaml-parse" | "header-missing" | "file-missing" | "validation-failed";
  sourcePath: string;
}

function makeError(code: LoadArtLabCanonError["code"], message: string, sourcePath: string): LoadArtLabCanonError {
  const err = new Error(message) as LoadArtLabCanonError;
  err.code = code;
  err.sourcePath = sourcePath;
  return err;
}

export async function loadArtLabCanonFile(absPath: string): Promise<ArtLabCanonLoadResult<unknown>> {
  const start = performance.now();
  let raw: string;
  try {
    raw = await readFile(absPath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw makeError("file-missing", `canon file not found: ${absPath}`, absPath);
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw makeError(
      "yaml-parse",
      `yaml parse error in ${absPath}: ${(err as Error).message}`,
      absPath,
    );
  }

  if (!parsed || typeof parsed !== "object" || !("header" in parsed)) {
    throw makeError("header-missing", `canon header missing in ${absPath}`, absPath);
  }

  const headerResult = ArtLabCanonHeaderSchema.safeParse((parsed as { header: unknown }).header);
  if (!headerResult.success) {
    throw makeError(
      "validation-failed",
      `canon header invalid in ${absPath}: ${headerResult.error.message}`,
      absPath,
    );
  }

  return {
    header: headerResult.data,
    data: parsed,
    sourcePath: absPath,
    loadDurationMs: Math.round(performance.now() - start),
  };
}
