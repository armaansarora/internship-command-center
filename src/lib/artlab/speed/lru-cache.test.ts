// src/lib/artlab/speed/lru-cache.test.ts
import { describe, expect, it, vi } from "vitest";
import { createLruCache } from "./lru-cache";

describe("LRU cache", () => {
  it("hits cache for repeated key", async () => {
    const fetcher = vi.fn().mockResolvedValue({ payload: "data" });
    const cache = createLruCache<string, { payload: string }>({ capacity: 3 });
    const a = await cache.getOrFetch("k1", fetcher);
    const b = await cache.getOrFetch("k1", fetcher);
    expect(a).toEqual(b);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("evicts least-recently-used when capacity exceeded", async () => {
    const fetcher = vi.fn().mockImplementation((k: string) => Promise.resolve({ payload: k }));
    const cache = createLruCache<string, { payload: string }>({ capacity: 2 });
    await cache.getOrFetch("a", () => fetcher("a"));
    await cache.getOrFetch("b", () => fetcher("b"));
    await cache.getOrFetch("a", () => fetcher("a")); // bumps a to MRU
    await cache.getOrFetch("c", () => fetcher("c")); // evicts b
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });
});
