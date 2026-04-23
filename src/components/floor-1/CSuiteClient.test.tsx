// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";

import {
  extractBatchRequestId,
  mergeGraphDispatches,
} from "./CSuiteClient";
import { DISPATCH_GRAPH_AGENTS } from "./DispatchGraph";
import type { DispatchProgressMap } from "@/hooks/useDispatchProgress";

/**
 * Unit tests for the two pure helpers the R3.7 integration relies on:
 *
 *   1. `extractBatchRequestId` — walks the assistant UIMessage stream for the
 *      most recent `dispatchBatch` tool part in `output-available` and pulls
 *      `requestId` out of its output. Without this the live graph can't know
 *      which bell-ring to poll for.
 *
 *   2. `mergeGraphDispatches` — folds the live `dispatchEvents` signal
 *      (camelCase tool keys like `dispatchToCRO`) and the `useDispatchProgress`
 *      polling map (lowercase agent keys) into the single lowercase-keyed
 *      `Record<string, DispatchEntry>` shape the `DispatchGraph` consumes.
 *
 * The full `CSuiteClient` component mounts a chat panel, a CEO character, the
 * dialogue dispatcher, and a handful of hooks — testing it end-to-end would
 * require mocking seven modules. Since all of the non-trivial logic lives in
 * these two helpers, we test them directly, matching the pure-helper testing
 * pattern the rest of the R3 phase already uses (see `DispatchGraph.test.tsx`
 * and `useDispatchProgress.test.ts`).
 */

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers to hand-craft minimal UIMessage shapes.                            */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Build an assistant UIMessage with a single `dispatchBatch` tool part in
 * the specified lifecycle state. Cast to `UIMessage` because we're not
 * trying to satisfy every field of the AI SDK's generic-heavy UIMessage type
 * — `isToolUIPart` / `getToolName` check by shape (`type: "tool-..."`).
 */
function makeBatchMessage(
  state: "input-streaming" | "input-available" | "output-available" | "output-error",
  output?: unknown,
): UIMessage {
  const base = {
    type: "tool-dispatchBatch" as const,
    toolCallId: `call_${Math.random().toString(36).slice(2, 10)}`,
  };
  let part: unknown;
  switch (state) {
    case "input-streaming":
      part = { ...base, state, input: { tasks: {} } };
      break;
    case "input-available":
      part = { ...base, state, input: { tasks: {} } };
      break;
    case "output-available":
      part = { ...base, state, input: { tasks: {} }, output };
      break;
    case "output-error":
      part = { ...base, state, input: { tasks: {} }, errorText: "boom" };
      break;
  }
  return {
    id: `msg_${Math.random().toString(36).slice(2, 10)}`,
    role: "assistant",
    parts: [part],
  } as unknown as UIMessage;
}

function makeUserMessage(text: string): UIMessage {
  return {
    id: `msg_${Math.random().toString(36).slice(2, 10)}`,
    role: "user",
    parts: [{ type: "text", text }],
  } as unknown as UIMessage;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* extractBatchRequestId                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

describe("extractBatchRequestId", () => {
  it("returns null for an empty message list", () => {
    expect(extractBatchRequestId([])).toBeNull();
  });

  it("returns null when there are only user messages", () => {
    expect(
      extractBatchRequestId([
        makeUserMessage("hello"),
        makeUserMessage("ring the bell"),
      ]),
    ).toBeNull();
  });

  it("returns null when dispatchBatch is still streaming input (no output yet)", () => {
    expect(
      extractBatchRequestId([makeBatchMessage("input-streaming")]),
    ).toBeNull();
    expect(
      extractBatchRequestId([makeBatchMessage("input-available")]),
    ).toBeNull();
  });

  it("extracts requestId when dispatchBatch reaches output-available", () => {
    const id = "d3baae1c-4e94-4abf-9f1c-f2e1b1eab2bf";
    const result = extractBatchRequestId([
      makeBatchMessage("output-available", { requestId: id, agents: [] }),
    ]);
    expect(result).toBe(id);
  });

  it("returns null when output is missing a requestId key", () => {
    expect(
      extractBatchRequestId([
        makeBatchMessage("output-available", { agents: [] }),
      ]),
    ).toBeNull();
  });

  it("returns null when requestId is not a string", () => {
    expect(
      extractBatchRequestId([
        makeBatchMessage("output-available", { requestId: 42, agents: [] }),
      ]),
    ).toBeNull();
  });

  it("returns null when requestId is an empty string", () => {
    expect(
      extractBatchRequestId([
        makeBatchMessage("output-available", { requestId: "", agents: [] }),
      ]),
    ).toBeNull();
  });

  it("returns null when output is null", () => {
    expect(
      extractBatchRequestId([
        makeBatchMessage("output-available", null),
      ]),
    ).toBeNull();
  });

  it("returns null for output-error state (the tool aborted)", () => {
    expect(
      extractBatchRequestId([makeBatchMessage("output-error")]),
    ).toBeNull();
  });

  it("walks in reverse — returns the LATEST requestId when there are multiple dispatchBatch parts", () => {
    // Two separate bell-rings within the same conversation. The client
    // should always reflect the most recent one so the graph tracks the
    // bell the user just rang, not an old one.
    const old = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const recent = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const result = extractBatchRequestId([
      makeBatchMessage("output-available", { requestId: old, agents: [] }),
      makeUserMessage("ring again"),
      makeBatchMessage("output-available", { requestId: recent, agents: [] }),
    ]);
    expect(result).toBe(recent);
  });

  it("ignores non-dispatchBatch tool parts (e.g. dispatchToCRO)", () => {
    const msg = {
      id: "m1",
      role: "assistant" as const,
      parts: [
        {
          type: "tool-dispatchToCRO",
          toolCallId: "c1",
          state: "output-available",
          input: { task: "x" },
          output: { requestId: "not-a-batch", result: "ok" },
        },
      ],
    } as unknown as UIMessage;
    expect(extractBatchRequestId([msg])).toBeNull();
  });

  it("ignores non-tool parts (text parts, reasoning parts)", () => {
    const msg = {
      id: "m1",
      role: "assistant" as const,
      parts: [
        { type: "text", text: "here's your briefing" },
        { type: "reasoning", text: "thinking..." },
      ],
    } as unknown as UIMessage;
    expect(extractBatchRequestId([msg])).toBeNull();
  });

  it("ignores messages without a parts array (guards against malformed UIMessage shapes)", () => {
    const bad = { id: "m1", role: "assistant" } as unknown as UIMessage;
    expect(extractBatchRequestId([bad])).toBeNull();
  });
});

/* ────────────────────────────────────────────────────────────────────────── */
/* mergeGraphDispatches                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

describe("mergeGraphDispatches", () => {
  it("(a) no dispatch state → every agent is idle", () => {
    const merged = mergeGraphDispatches({}, {});
    expect(Object.keys(merged).sort()).toEqual([...DISPATCH_GRAPH_AGENTS].sort());
    for (const agent of DISPATCH_GRAPH_AGENTS) {
      expect(merged[agent]).toEqual({
        status: "idle",
        startedAt: null,
        completedAt: null,
      });
    }
  });

  it("(b) three running via dispatchEvents (no polling data yet)", () => {
    const merged = mergeGraphDispatches(
      {},
      {
        dispatchToCRO: "running",
        dispatchToCOO: "running",
        dispatchToCNO: "running",
      },
    );
    expect(merged.cro).toEqual({
      status: "running",
      startedAt: null,
      completedAt: null,
    });
    expect(merged.coo.status).toBe("running");
    expect(merged.cno.status).toBe("running");
    // Others untouched.
    expect(merged.cio.status).toBe("idle");
    expect(merged.cmo.status).toBe("idle");
    expect(merged.cpo.status).toBe("idle");
    expect(merged.cfo.status).toBe("idle");
  });

  it("(c) three running + one completed via polling — polling data enriches with startedAt/completedAt", () => {
    const progressMap: DispatchProgressMap = {
      cro: { status: "running", startedAt: "2026-04-22T10:00:00Z", completedAt: null },
      coo: { status: "running", startedAt: "2026-04-22T10:00:01Z", completedAt: null },
      cio: { status: "running", startedAt: "2026-04-22T10:00:02Z", completedAt: null },
      cfo: { status: "completed", startedAt: "2026-04-22T10:00:00Z", completedAt: "2026-04-22T10:00:03Z" },
    };
    const merged = mergeGraphDispatches(progressMap, {});
    expect(merged.cro).toEqual({
      status: "running",
      startedAt: "2026-04-22T10:00:00Z",
      completedAt: null,
    });
    expect(merged.cfo).toEqual({
      status: "completed",
      startedAt: "2026-04-22T10:00:00Z",
      completedAt: "2026-04-22T10:00:03Z",
    });
    // Agents not in the polling map stay idle.
    expect(merged.cno.status).toBe("idle");
    expect(merged.cmo.status).toBe("idle");
    expect(merged.cpo.status).toBe("idle");
  });

  it("(d) mixed: 2 from dispatchEvents + 2 from polling — polling wins for overlapping, events fill the rest", () => {
    const progressMap: DispatchProgressMap = {
      cro: { status: "completed", startedAt: "t0", completedAt: "t3" },
      coo: { status: "running", startedAt: "t0", completedAt: null },
    };
    const dispatchEvents = {
      dispatchToCNO: "running" as const,
      dispatchToCIO: "completed" as const,
    };
    const merged = mergeGraphDispatches(progressMap, dispatchEvents);
    // Polling data wins + carries timing.
    expect(merged.cro).toEqual({
      status: "completed",
      startedAt: "t0",
      completedAt: "t3",
    });
    expect(merged.coo).toEqual({
      status: "running",
      startedAt: "t0",
      completedAt: null,
    });
    // Streaming-only agents — no timing, just status.
    expect(merged.cno).toEqual({
      status: "running",
      startedAt: null,
      completedAt: null,
    });
    expect(merged.cio).toEqual({
      status: "completed",
      startedAt: null,
      completedAt: null,
    });
    // The remaining three agents stay idle.
    expect(merged.cmo.status).toBe("idle");
    expect(merged.cpo.status).toBe("idle");
    expect(merged.cfo.status).toBe("idle");
  });

  it("progressMap overrides dispatchEvents when both describe the same agent", () => {
    // Streaming already reported CRO as "completed", but the polling row
    // carries the authoritative startedAt/completedAt timestamps. Polling
    // must win so the graph's return-streak animation has real timing data.
    const merged = mergeGraphDispatches(
      {
        cro: {
          status: "completed",
          startedAt: "2026-04-22T10:00:00Z",
          completedAt: "2026-04-22T10:00:05Z",
        },
      },
      { dispatchToCRO: "completed" },
    );
    expect(merged.cro).toEqual({
      status: "completed",
      startedAt: "2026-04-22T10:00:00Z",
      completedAt: "2026-04-22T10:00:05Z",
    });
  });

  it("collapses polling statuses `queued` → graph visual `running`", () => {
    const merged = mergeGraphDispatches(
      { cro: { status: "queued", startedAt: null, completedAt: null } },
      {},
    );
    expect(merged.cro.status).toBe("running");
  });

  it("collapses polling statuses `failed` → graph visual `failed`", () => {
    const merged = mergeGraphDispatches(
      {
        cro: {
          status: "failed",
          startedAt: "t0",
          completedAt: "t2",
        },
      },
      {},
    );
    expect(merged.cro.status).toBe("failed");
    expect(merged.cro.completedAt).toBe("t2");
  });

  it("returns all 7 canonical agents even when neither input mentions them", () => {
    const merged = mergeGraphDispatches({}, {});
    expect(Object.keys(merged)).toHaveLength(DISPATCH_GRAPH_AGENTS.length);
    for (const agent of DISPATCH_GRAPH_AGENTS) {
      expect(merged).toHaveProperty(agent);
    }
  });

  it("ignores unknown polling keys (e.g., 'ceo', 'foo') — only canonical agents land in the output", () => {
    const merged = mergeGraphDispatches(
      {
        ceo: { status: "running", startedAt: null, completedAt: null },
        foo: { status: "completed", startedAt: null, completedAt: null },
      },
      {},
    );
    expect(merged).not.toHaveProperty("ceo");
    expect(merged).not.toHaveProperty("foo");
    // All 7 canonical agents present + idle.
    for (const agent of DISPATCH_GRAPH_AGENTS) {
      expect(merged[agent].status).toBe("idle");
    }
  });
});
