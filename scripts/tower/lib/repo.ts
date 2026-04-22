import fs from "fs-extra";
import path from "node:path";

export async function findRepoRoot(
  from: string = process.cwd(),
): Promise<string> {
  let dir = path.resolve(from);
  while (true) {
    if (await fs.pathExists(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`no git repo found upward from ${from}`);
    }
    dir = parent;
  }
}
