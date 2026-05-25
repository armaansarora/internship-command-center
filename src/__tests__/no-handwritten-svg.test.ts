import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SOURCE_ROOTS = ["src"];
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

function extensionOf(file: string): string {
  const dot = file.lastIndexOf(".");
  return dot === -1 ? "" : file.slice(dot);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") return [];
      return walk(abs);
    }
    return SCANNED_EXTENSIONS.has(extensionOf(abs)) ? [abs] : [];
  });
}

// Files allowed to contain inline SVG markup because they intentionally
// build a vector image at runtime (handed to sharp for PNG rasterization,
// never inlined into the React tree).
const ALLOWED_SVG_FILES = new Set<string>([
  "src/lib/artlab/speed/placeholder-images.ts",
]);

describe("handwritten SVG retirement", () => {
  it("keeps local source free of handwritten SVG markup and SVG data URLs", () => {
    const svgTag = "<" + "svg";
    const svgDataUrl = "data:image/" + "svg";
    const offenders: string[] = [];

    for (const root of SOURCE_ROOTS) {
      for (const file of walk(join(process.cwd(), root))) {
        const relPath = relative(process.cwd(), file).split("\\").join("/");
        if (ALLOWED_SVG_FILES.has(relPath)) continue;
        const src = readFileSync(file, "utf8");
        if (src.includes(svgTag) || src.includes(svgDataUrl)) {
          offenders.push(relPath);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
