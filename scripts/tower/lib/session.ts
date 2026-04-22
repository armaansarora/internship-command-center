import fs from "fs-extra";
import path from "node:path";
import { randomUUID } from "node:crypto";

const SESS_REL = ".tower/.cache/session-id";

export function getSessionId(): string {
  const envId = process.env.TOWER_SESSION_ID;
  if (envId) return envId;
  const p = path.resolve(process.cwd(), SESS_REL);
  try {
    if (fs.pathExistsSync(p)) return fs.readFileSync(p, "utf-8").trim();
  } catch {
    // fall through to new id
  }
  const id = `sess-${randomUUID().slice(0, 6)}`;
  try {
    fs.ensureDirSync(path.dirname(p));
    fs.writeFileSync(p, id);
  } catch {
    // best-effort; a volatile session id is fine
  }
  return id;
}
