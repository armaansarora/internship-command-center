import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isHeartbeatStale, scanDaemonErrors } from "./daemon-errors";

describe("daemon-errors scanner", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-derr-")); });
  afterEach(() => { try { rmSync(dir, { recursive: true }); } catch { /* ignore */ } });

  it("returns zeros when log and heartbeat are missing", () => {
    const r = scanDaemonErrors(dir);
    expect(r.recent24hCount).toBe(0);
    expect(r.lastError).toBeUndefined();
    expect(r.heartbeat).toBeUndefined();
  });

  it("counts entries within last 24h, ignores older", () => {
    const fresh1 = new Date(Date.now() - 60_000).toISOString();
    const fresh2 = new Date(Date.now() - 120_000).toISOString();
    const ancient = new Date(Date.now() - 26 * 60 * 60_000).toISOString();
    writeFileSync(join(dir, "daemon-errors.jsonl"), [
      JSON.stringify({ at: ancient, source: "old", message: "stale" }),
      JSON.stringify({ at: fresh2, source: "older", message: "second" }),
      JSON.stringify({ at: fresh1, source: "telegram-poller", message: "boom" }),
    ].join("\n"));
    const r = scanDaemonErrors(dir);
    expect(r.recent24hCount).toBe(2);
    expect(r.lastError?.source).toBe("telegram-poller");
    expect(r.lastError?.message).toBe("boom");
  });

  it("reads heartbeat staleness in ms", () => {
    const ts = new Date(Date.now() - 5_000).toISOString();
    writeFileSync(join(dir, "daemon-heartbeat.json"), JSON.stringify({ pid: 1234, at: ts }));
    const r = scanDaemonErrors(dir);
    expect(r.heartbeat?.pid).toBe(1234);
    expect(r.heartbeat?.staleMs).toBeGreaterThanOrEqual(5_000);
    expect(r.heartbeat?.staleMs).toBeLessThan(8_000);
  });

  it("isHeartbeatStale flags >10s as stale", () => {
    expect(isHeartbeatStale(5_000)).toBe(false);
    expect(isHeartbeatStale(11_000)).toBe(true);
    expect(isHeartbeatStale(undefined)).toBe(false);
  });

  it("tolerates malformed log lines (skips them)", () => {
    const fresh = new Date(Date.now() - 60_000).toISOString();
    writeFileSync(join(dir, "daemon-errors.jsonl"), [
      "not valid json",
      JSON.stringify({ at: fresh, source: "x", message: "ok" }),
      "another bad line",
    ].join("\n"));
    const r = scanDaemonErrors(dir);
    expect(r.recent24hCount).toBe(1);
  });
});
