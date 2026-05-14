import { existsSync, realpathSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

function isPathInside(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);

  return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.startsWith("/"));
}

function nearestExistingPath(path: string): string {
  let current = path;

  while (!existsSync(current)) {
    const parent = dirname(current);

    if (parent === current) return current;

    current = parent;
  }

  return current;
}

export function assertSafeWorkspacePath(path: string, allowedRoots: string[]): string {
  const absolutePath = resolve(path);
  const allowed = allowedRoots.some((root) => {
    const absoluteRoot = resolve(root);
    const lexicalAllowed = isPathInside(absoluteRoot, absolutePath);

    if (!lexicalAllowed) return false;

    const existingRoot = nearestExistingPath(absoluteRoot);
    const existingCandidate = nearestExistingPath(absolutePath);
    const realRoot = realpathSync(existingRoot);
    const realCandidate = realpathSync(existingCandidate);

    return isPathInside(realRoot, realCandidate);
  });

  if (!allowed) {
    throw new Error(`state-root must stay inside one of: ${allowedRoots.join(", ")}`);
  }

  return absolutePath;
}
