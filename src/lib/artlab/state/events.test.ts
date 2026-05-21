import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendArtLabEvent, readArtLabEvents } from "./events";

describe("artlab events.jsonl writer", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-events-"));
  });

  it("appends one event as one line of JSON", () => {
    appendArtLabEvent(dir, {
      runId: "r1",
      at: "2026-05-20T00:00:00.000Z",
      kind: "phase-transition",
      payload: { from: "routed", to: "generating-concepts" },
    });
    const path = join(dir, "events.jsonl");
    expect(existsSync(path)).toBe(true);
    const raw = readFileSync(path, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(raw.trim());
    expect(parsed.kind).toBe("phase-transition");
  });

  it("readArtLabEvents returns all events as objects", () => {
    appendArtLabEvent(dir, { runId: "r1", at: "2026-05-20T00:00:00.000Z", kind: "a", payload: {} });
    appendArtLabEvent(dir, { runId: "r1", at: "2026-05-20T00:00:01.000Z", kind: "b", payload: {} });
    const events = readArtLabEvents(dir);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.kind)).toEqual(["a", "b"]);
  });

  it("readArtLabEvents on missing file returns []", () => {
    expect(readArtLabEvents(dir)).toEqual([]);
  });
});
