import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";
import { LedgerSchema, type Ledger } from "./ledger-schema.js";

export const LEDGER_DIR = ".ledger";

export async function ledgerPath(repo: string, phase: string): Promise<string> {
  const dir = path.join(repo, LEDGER_DIR);
  if (!(await fs.pathExists(dir))) {
    throw new Error(`no ledger directory at ${dir}`);
  }
  const entries = await fs.readdir(dir);
  const match = entries.find(
    (f) => f.startsWith(`${phase}-`) && f.endsWith(".yml"),
  );
  if (!match) throw new Error(`no ledger file for phase ${phase} in ${dir}`);
  return path.join(dir, match);
}

export async function readLedger(repo: string, phase: string): Promise<Ledger> {
  const p = await ledgerPath(repo, phase);
  const raw = await fs.readFile(p, "utf-8");
  const parsed = YAML.parse(raw);
  return LedgerSchema.parse(parsed);
}

export async function writeLedger(repo: string, led: Ledger): Promise<void> {
  const validated = LedgerSchema.parse(led);
  const slug = slugify(validated.name);
  const filename = `${validated.phase}-${slug}.yml`;
  const dir = path.join(repo, LEDGER_DIR);
  await fs.ensureDir(dir);

  const existing = (await fs.readdir(dir)).find(
    (f) => f.startsWith(`${validated.phase}-`) && f.endsWith(".yml"),
  );
  const target = existing ? path.join(dir, existing) : path.join(dir, filename);
  await fs.writeFile(target, YAML.stringify(validated), "utf-8");
}

export async function listLedgers(repo: string): Promise<string[]> {
  const dir = path.join(repo, LEDGER_DIR);
  if (!(await fs.pathExists(dir))) return [];
  const entries = await fs.readdir(dir);
  return entries
    .filter((f) => f.endsWith(".yml"))
    .map((f) => f.split("-")[0])
    .filter((p) => /^R\d+$/.test(p));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
