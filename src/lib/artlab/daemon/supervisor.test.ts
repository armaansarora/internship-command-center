// src/lib/artlab/daemon/supervisor.test.ts
import { describe, expect, it } from "vitest";
import { createSupervisor, MAX_CHILDREN } from "./supervisor";

describe("daemon supervisor", () => {
  it("MAX_CHILDREN is 2 (spec parallelism cap)", () => {
    expect(MAX_CHILDREN).toBe(2);
  });

  it("spawn returns ok up to MAX_CHILDREN", () => {
    const sup = createSupervisor();
    expect(sup.canSpawn()).toBe(true);
    const a = sup.registerChild({ runId: "a", pid: 111 });
    expect(a.accepted).toBe(true);
    const b = sup.registerChild({ runId: "b", pid: 222 });
    expect(b.accepted).toBe(true);
    expect(sup.canSpawn()).toBe(false);
    const c = sup.registerChild({ runId: "c", pid: 333 });
    expect(c.accepted).toBe(false);
    expect(c.reason).toMatch(/cap/i);
  });

  it("releaseChild frees a slot", () => {
    const sup = createSupervisor();
    sup.registerChild({ runId: "a", pid: 111 });
    sup.registerChild({ runId: "b", pid: 222 });
    sup.releaseChild("a");
    expect(sup.canSpawn()).toBe(true);
    expect(sup.activeChildren()).toEqual([{ runId: "b", pid: 222 }]);
  });

  it("findChildByRunId returns matching child or null", () => {
    const sup = createSupervisor();
    sup.registerChild({ runId: "x", pid: 999 });
    expect(sup.findChildByRunId("x")).toEqual({ runId: "x", pid: 999 });
    expect(sup.findChildByRunId("missing")).toBeNull();
  });
});
