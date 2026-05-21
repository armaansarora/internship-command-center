import { mkdirSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

export interface AttachmentDownloader {
  downloadFile(opts: { fileId: string }): Promise<{ contentType: string; bytes: Buffer }>;
}

export interface SaveReferenceAttachmentInput {
  workspaceRoot: string;
  runId: string;
  fileId: string;
  downloader: AttachmentDownloader;
}

export async function saveReferenceAttachment(input: SaveReferenceAttachmentInput): Promise<string> {
  const downloaded = await input.downloader.downloadFile({ fileId: input.fileId });
  const ext = CONTENT_TYPE_TO_EXT[downloaded.contentType.toLowerCase()] ?? "bin";
  const dir = join(input.workspaceRoot, "inbox", "attachments", input.runId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `${input.fileId}.${ext}`);
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, downloaded.bytes);
  renameSync(tmp, path);
  return path;
}
