import { cpus } from "node:os";

export const DEFAULT_CUTOUT_CONCURRENCY = Math.max(2, Math.min(4, cpus().length));

export interface CutoutPoolInput {
  tasks: Array<() => Promise<unknown>>;
  concurrency?: number;
}

export async function runCutoutPool(input: CutoutPoolInput): Promise<void> {
  const concurrency = input.concurrency ?? DEFAULT_CUTOUT_CONCURRENCY;
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < input.tasks.length) {
      const idx = cursor;
      cursor += 1;
      await input.tasks[idx]!();
    }
  });
  await Promise.all(workers);
}
