// src/lib/artlab/daemon/sleep-guard.test.ts
import { describe, expect, it, vi } from "vitest";
import { createSleepGuard } from "./sleep-guard";

describe("sleep guard", () => {
  it("starts caffeinate -i child on activate, kills on deactivate", () => {
    const child = { kill: vi.fn(), pid: 1234 };
    const spawn = vi.fn().mockReturnValue(child);
    const guard = createSleepGuard({ spawn });
    guard.activate();
    expect(spawn).toHaveBeenCalledWith("caffeinate", ["-i"], expect.any(Object));
    expect(guard.isActive()).toBe(true);
    guard.deactivate();
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(guard.isActive()).toBe(false);
  });

  it("double activate is idempotent (only one caffeinate spawned)", () => {
    const child = { kill: vi.fn(), pid: 1234 };
    const spawn = vi.fn().mockReturnValue(child);
    const guard = createSleepGuard({ spawn });
    guard.activate();
    guard.activate();
    expect(spawn).toHaveBeenCalledOnce();
  });
});
