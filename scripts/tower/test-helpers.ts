import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { execa, type Options } from "execa";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const TSX_BIN = path.join(PROJECT_ROOT, "node_modules/.bin/tsx");
const CLI_ENTRY = path.join(PROJECT_ROOT, "scripts/tower/index.ts");

export async function runCLI(
  args: string[],
  opts: Options = {},
): Promise<ReturnType<typeof execa>> {
  return execa(TSX_BIN, [CLI_ENTRY, ...args], opts);
}

export async function createFixtureRepo(
  files: Record<string, string> = {},
): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tower-fixture-"));
  await execa("git", ["init", "-q", "-b", "main"], { cwd: dir });
  await execa("git", ["config", "user.email", "test@tower.local"], { cwd: dir });
  await execa("git", ["config", "user.name", "Tower Test"], { cwd: dir });
  await execa("git", ["config", "commit.gpgsign", "false"], { cwd: dir });

  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    await fs.ensureDir(path.dirname(full));
    await fs.writeFile(full, content);
  }

  await fs.writeFile(path.join(dir, "README.md"), "# fixture\n");
  await execa("git", ["add", "."], { cwd: dir });
  await execa("git", ["commit", "-q", "-m", "init"], { cwd: dir });

  return dir;
}

export async function cleanupFixture(dir: string): Promise<void> {
  if (!dir.startsWith(os.tmpdir())) {
    throw new Error(`refusing to remove non-tmpdir: ${dir}`);
  }
  await fs.remove(dir);
}

export async function commitFile(
  dir: string,
  rel: string,
  content: string,
  message: string,
): Promise<string> {
  const full = path.join(dir, rel);
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, content);
  await execa("git", ["add", rel], { cwd: dir });
  await execa("git", ["commit", "-q", "-m", message], { cwd: dir });
  const { stdout } = await execa("git", ["rev-parse", "HEAD"], { cwd: dir });
  return stdout.trim();
}
