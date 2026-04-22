import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

export const ConfigSchema = z.object({
  roadmapPath: z.string().default("docs/NEXT-ROADMAP.md"),
  lockTtlMinutes: z.number().int().positive().default(120),
  handoffDir: z.string().default(".handoff"),
  ledgerDir: z.string().default(".ledger"),
  towerDir: z.string().default(".tower"),
  tagFormat: z.string().default("[{phase}/{task}]"),
  driftStrict: z.boolean().default(false),
});
export type TowerConfig = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: TowerConfig = ConfigSchema.parse({});

export async function loadConfig(repo: string): Promise<TowerConfig> {
  const p = path.join(repo, ".tower", "config.yml");
  if (!(await fs.pathExists(p))) return DEFAULT_CONFIG;
  const raw = await fs.readFile(p, "utf-8");
  const parsed = YAML.parse(raw) ?? {};
  return ConfigSchema.parse(parsed);
}
