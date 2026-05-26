import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function sha256OfBytes(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function sha256OfFile(absPath: string): Promise<string> {
  const buf = await readFile(absPath);
  return sha256OfBytes(buf);
}
