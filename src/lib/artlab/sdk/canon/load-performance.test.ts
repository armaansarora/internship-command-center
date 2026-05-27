import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadArtLabCanon } from "./load-canon";

describe("canon load performance", () => {
  it("loads the full real canon in under 50 ms", async () => {
    const canon = await loadArtLabCanon({ canonRoot: join(process.cwd(), "docs/artlab/sdk/canon") });
    expect(canon.loadDurationMs).toBeLessThan(50);
  });

  it("second load is also under 50 ms (no per-call cost regression)", async () => {
    await loadArtLabCanon({ canonRoot: join(process.cwd(), "docs/artlab/sdk/canon") });
    const canon = await loadArtLabCanon({ canonRoot: join(process.cwd(), "docs/artlab/sdk/canon") });
    expect(canon.loadDurationMs).toBeLessThan(50);
  });
});
