import { writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "..", "..");
const TEST_RUN = join(root, ".artlab/engine/runs/0966ad16-6fe0-41b3-acfa-e77465618742");
const OUT_DIR = "/tmp/cutout-test-out";

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(join(OUT_DIR, "production-slots"), { recursive: true });
const src = join(TEST_RUN, "production-slots");
for (const f of readdirSync(src)) cpSync(join(src, f), join(OUT_DIR, "production-slots", f));

const cutoutMod = await import(join(root, "src/lib/artlab/runners/cutout-runner.ts"));
const composeMod = await import(join(root, "src/lib/artlab/speed/placeholder-images.ts"));

const result = await cutoutMod.cutoutRunner.run({
  runId: "test", runDir: OUT_DIR, assetType: "character",
  characterId: "cno", providerId: "gemini-api",
});
console.log("cutout result:", result.status, "paths:", result.artifacts?.cutoutPaths?.length);

const cutPaths = readdirSync(join(OUT_DIR, "cutouts")).map((f) => join(OUT_DIR, "cutouts", f)).sort();
const board = await composeMod.composeFinalBoard({
  cutoutPaths: cutPaths,
  characterId: "cno",
  displayName: "Sol Navarro",
  title: "Chief Networking Officer · 21 upload-ready sprites (FIXED)",
});
writeFileSync(join(OUT_DIR, "final-board.png"), board);
console.log("Wrote", join(OUT_DIR, "final-board.png"));
