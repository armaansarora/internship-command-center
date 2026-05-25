import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, statSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rotateDaemonLogs } from "./log-rotation";

describe("log-rotation", () => {
  let workspace: string;
  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "artlab-rot-"));
  });
  afterEach(() => {
    try { rmSync(workspace, { recursive: true }); } catch { /* ignore */ }
  });

  function write1mb(path: string, content: string = "x"): void {
    // 1.5MB so it crosses the 1MB threshold.
    writeFileSync(path, content.repeat(1_500_000 / content.length));
  }

  it("is a no-op when files are small", () => {
    writeFileSync(join(workspace, "daemon-errors.jsonl"), "tiny");
    const result = rotateDaemonLogs(workspace);
    expect(result.rotated).toHaveLength(0);
    expect(existsSync(join(workspace, "daemon-errors.jsonl"))).toBe(true);
  });

  it("rotates daemon-errors.jsonl when it exceeds 1MB", () => {
    const errPath = join(workspace, "daemon-errors.jsonl");
    write1mb(errPath, "{\"a\":1}\n");
    const result = rotateDaemonLogs(workspace);
    expect(result.rotated).toContain(errPath);
    expect(existsSync(errPath)).toBe(false);
    expect(existsSync(`${errPath}.1`)).toBe(true);
    expect(statSync(`${errPath}.1`).size).toBeGreaterThan(1_000_000);
  });

  it("shifts existing rotations (.1 → .2)", () => {
    const errPath = join(workspace, "daemon-errors.jsonl");
    writeFileSync(`${errPath}.1`, "OLD ROTATION");
    write1mb(errPath, "NEW SIZE");
    rotateDaemonLogs(workspace);
    expect(readFileSync(`${errPath}.2`, "utf8")).toBe("OLD ROTATION");
  });

  it("drops the oldest rotation (.3 is unlinked when bumped)", () => {
    const errPath = join(workspace, "daemon-errors.jsonl");
    writeFileSync(`${errPath}.3`, "OLDEST");
    writeFileSync(`${errPath}.2`, "MIDDLE");
    writeFileSync(`${errPath}.1`, "NEWEST OLD");
    write1mb(errPath);
    rotateDaemonLogs(workspace);
    // .3 should now hold what was .2 (MIDDLE), not the original OLDEST.
    expect(readFileSync(`${errPath}.3`, "utf8")).toBe("MIDDLE");
  });

  it("rotates per-run worker.out.log files", () => {
    const runDir = join(workspace, "runs", "abc123");
    mkdirSync(runDir, { recursive: true });
    const logPath = join(runDir, "worker.out.log");
    write1mb(logPath, "log line\n");
    const result = rotateDaemonLogs(workspace);
    expect(result.rotated).toContain(logPath);
    expect(existsSync(`${logPath}.1`)).toBe(true);
  });

  it("rotates memory/decision-log.jsonl when it exceeds 1MB", () => {
    const memoryDir = join(workspace, "memory");
    mkdirSync(memoryDir, { recursive: true });
    const decisionLog = join(memoryDir, "decision-log.jsonl");
    write1mb(decisionLog, "{\"kind\":\"x\"}\n");
    const result = rotateDaemonLogs(workspace);
    expect(result.rotated).toContain(decisionLog);
    expect(existsSync(`${decisionLog}.1`)).toBe(true);
  });

  it("also covers style-wins.jsonl + style-rejections.jsonl", () => {
    const memoryDir = join(workspace, "memory");
    mkdirSync(memoryDir, { recursive: true });
    const wins = join(memoryDir, "style-wins.jsonl");
    const rejs = join(memoryDir, "style-rejections.jsonl");
    write1mb(wins);
    write1mb(rejs);
    const result = rotateDaemonLogs(workspace);
    expect(result.rotated).toContain(wins);
    expect(result.rotated).toContain(rejs);
  });
});
