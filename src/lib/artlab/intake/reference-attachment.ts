import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export interface StoredReferenceImage {
  referenceId: string;
  sourceLabel: string;
  contentType: string;
  absolutePath: string;
  storedAt: string;
}

interface ReferenceImageManifest {
  references: StoredReferenceImage[];
}

function refDir(runDir: string): string {
  const dir = join(runDir, "references");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function manifestPath(runDir: string): string {
  return join(refDir(runDir), "manifest.json");
}

function readManifest(runDir: string): ReferenceImageManifest {
  const path = manifestPath(runDir);
  if (!existsSync(path)) return { references: [] };
  return JSON.parse(readFileSync(path, "utf8")) as ReferenceImageManifest;
}

function writeManifest(runDir: string, manifest: ReferenceImageManifest): void {
  writeFileSync(manifestPath(runDir), JSON.stringify(manifest, null, 2));
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const ACCEPTED_MIME_TYPES: ReadonlySet<string> = new Set(Object.keys(EXT_BY_TYPE));
const MIN_DIMENSION_PX = 512;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface ReferencePhotoValidation {
  ok: boolean;
  width?: number;
  height?: number;
  sizeKB?: number;
  format?: string;
  reason?: string;       // present when ok=false
}

/**
 * Validate a user-supplied reference photo before storing it. Returns
 * `{ ok: true, ... }` with dimensions + size on success, or a clear
 * `reason` string when rejected. The bot dispatcher surfaces the reason
 * to the user and queues the run WITHOUT a reference instead of failing
 * the whole trigger.
 */
export async function validateReferencePhoto(input: { bytes: Buffer; contentType: string }): Promise<ReferencePhotoValidation> {
  const sizeKB = Math.round(input.bytes.length / 1024);
  if (input.bytes.length > MAX_FILE_BYTES) {
    return { ok: false, sizeKB, reason: `photo too large (${sizeKB}KB > 10MB cap) — re-send compressed` };
  }
  if (!ACCEPTED_MIME_TYPES.has(input.contentType.toLowerCase())) {
    return { ok: false, sizeKB, reason: `unsupported format ${input.contentType} — send PNG, JPEG, or WebP` };
  }
  try {
    const meta = await sharp(input.bytes).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    const shortEdge = Math.min(width, height);
    if (shortEdge < MIN_DIMENSION_PX) {
      return {
        ok: false,
        width, height, sizeKB,
        format: meta.format,
        reason: `photo too small (${width}×${height}) — needs ≥ ${MIN_DIMENSION_PX}px on the short edge`,
      };
    }
    return { ok: true, width, height, sizeKB, format: meta.format };
  } catch (err) {
    return { ok: false, sizeKB, reason: `unreadable image (${err instanceof Error ? err.message : String(err)})` };
  }
}

export async function storeReferenceImage(
  runDir: string,
  input: { sourceLabel: string; contentType: string; bytes: Buffer },
): Promise<StoredReferenceImage> {
  const referenceId = randomUUID();
  const ext = EXT_BY_TYPE[input.contentType] ?? "bin";
  const absolutePath = join(refDir(runDir), `${referenceId}.${ext}`);
  writeFileSync(absolutePath, input.bytes);
  const entry: StoredReferenceImage = {
    referenceId,
    sourceLabel: input.sourceLabel,
    contentType: input.contentType,
    absolutePath,
    storedAt: new Date().toISOString(),
  };
  const manifest = readManifest(runDir);
  manifest.references.push(entry);
  writeManifest(runDir, manifest);
  return entry;
}

export function listReferenceImages(runDir: string): StoredReferenceImage[] {
  return readManifest(runDir).references;
}
