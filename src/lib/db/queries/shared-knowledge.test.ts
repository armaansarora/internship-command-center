import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Unit tests for shared-knowledge-rest.ts.
 *
 * Contract:
 *   - `readSharedKnowledge` selects `shared_knowledge` from `user_profiles`,
 *     flattens the two-level map into `"{agent}:{key}" → Entry`, and
 *     optionally filters out a given agent's own entries.
 *   - `writeSharedKnowledge` reads the current jsonb, merges in the new
 *     entry under the writer's namespace, and writes back. Both legs funnel
 *     supabase errors into `log.error`.
 *
 * No real DB calls — all supabase chains are spied.
 */

// ---------------------------------------------------------------------------
// Mocks — all created via vi.hoisted so they can be referenced inside
// vi.mock factories.
// ---------------------------------------------------------------------------

const {
  selectSpy,
  updateSpy,
  eqAfterSelectSpy,
  eqAfterUpdateSpy,
  singleSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  selectSpy: vi.fn(),
  updateSpy: vi.fn(),
  eqAfterSelectSpy: vi.fn(),
  eqAfterUpdateSpy: vi.fn(),
  singleSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: selectSpy,
      update: updateSpy,
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: logErrorSpy,
  },
}));

// Re-import after mocks.
const { readSharedKnowledge, writeSharedKnowledge } = await import(
  "./shared-knowledge-rest"
);

// ---------------------------------------------------------------------------
// Chain helpers
// ---------------------------------------------------------------------------

/** select("shared_knowledge").eq("id", u).single() → result */
function chainSelectSingle(result: {
  data: { shared_knowledge: unknown } | null;
  error: { message: string } | null;
}): void {
  singleSpy.mockResolvedValue(result);
  eqAfterSelectSpy.mockReturnValue({ single: singleSpy });
  selectSpy.mockReturnValue({ eq: eqAfterSelectSpy });
}

/** update({...}).eq("id", u) → result */
function chainUpdateEqId(result: { error: { message: string } | null }): void {
  eqAfterUpdateSpy.mockResolvedValue(result);
  updateSpy.mockReturnValue({ eq: eqAfterUpdateSpy });
}

// ---------------------------------------------------------------------------
// Reset before each test.
// ---------------------------------------------------------------------------

beforeEach(() => {
  selectSpy.mockReset();
  updateSpy.mockReset();
  eqAfterSelectSpy.mockReset();
  eqAfterUpdateSpy.mockReset();
  singleSpy.mockReset();
  logErrorSpy.mockReset();
});

// ===========================================================================
// readSharedKnowledge
// ===========================================================================

describe("readSharedKnowledge", () => {
  it("returns an empty flat map when shared_knowledge is {}", async () => {
    chainSelectSingle({ data: { shared_knowledge: {} }, error: null });

    const result = await readSharedKnowledge("user-1");

    expect(result).toEqual({});
    expect(selectSpy).toHaveBeenCalledWith("shared_knowledge");
    expect(eqAfterSelectSpy).toHaveBeenCalledWith("id", "user-1");
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  it("flattens a populated shared_knowledge into '{agent}:{key}' → Entry", async () => {
    const entry = {
      value: "Alpha is hiring aggressively",
      writtenAt: "2026-04-22T10:00:00.000Z",
      writtenBy: "cio",
    };
    chainSelectSingle({
      data: { shared_knowledge: { cio: { companyAlpha: entry } } },
      error: null,
    });

    const result = await readSharedKnowledge("user-1");

    expect(result).toEqual({ "cio:companyAlpha": entry });
  });

  it("filters out entries written by excludeAgent while keeping peers", async () => {
    const cioEntry = {
      value: "Alpha is hiring",
      writtenAt: "2026-04-22T10:00:00.000Z",
      writtenBy: "cio",
    };
    const croEntry = {
      value: "Stage=interview",
      writtenAt: "2026-04-22T11:00:00.000Z",
      writtenBy: "cro",
    };
    chainSelectSingle({
      data: {
        shared_knowledge: {
          cio: { companyAlpha: cioEntry },
          cro: { appXYZ: croEntry },
        },
      },
      error: null,
    });

    const result = await readSharedKnowledge("user-1", "cro");

    expect(result).toEqual({ "cio:companyAlpha": cioEntry });
    expect(result["cro:appXYZ"]).toBeUndefined();
  });

  it("returns {} and logs once when supabase returns an error", async () => {
    chainSelectSingle({
      data: null,
      error: { message: "RLS denied" },
    });

    const result = await readSharedKnowledge("user-1");

    expect(result).toEqual({});
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("shared_knowledge.read_failed");
  });

  it("returns {} when shared_knowledge is null", async () => {
    chainSelectSingle({
      data: { shared_knowledge: null },
      error: null,
    });

    const result = await readSharedKnowledge("user-1");

    expect(result).toEqual({});
    expect(logErrorSpy).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// writeSharedKnowledge
// ===========================================================================

describe("writeSharedKnowledge", () => {
  it("creates the agent namespace when shared_knowledge is {}", async () => {
    chainSelectSingle({ data: { shared_knowledge: {} }, error: null });
    chainUpdateEqId({ error: null });

    await writeSharedKnowledge(
      "user-1",
      "cio",
      "companyAlpha",
      "Alpha is hiring aggressively",
    );

    // Read leg scoped correctly.
    expect(selectSpy).toHaveBeenCalledWith("shared_knowledge");
    expect(eqAfterSelectSpy).toHaveBeenCalledWith("id", "user-1");

    // Write leg fires once with merged shape.
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    const nested = payload.shared_knowledge as Record<
      string,
      Record<string, { value: string; writtenAt: string; writtenBy: string }>
    >;

    expect(Object.keys(nested)).toEqual(["cio"]);
    expect(nested.cio.companyAlpha.value).toBe("Alpha is hiring aggressively");
    expect(nested.cio.companyAlpha.writtenBy).toBe("cio");
    expect(typeof nested.cio.companyAlpha.writtenAt).toBe("string");
    expect(
      () => new Date(nested.cio.companyAlpha.writtenAt).toISOString(),
    ).not.toThrow();

    expect(eqAfterUpdateSpy).toHaveBeenCalledWith("id", "user-1");
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  it("merges a new key under an existing agent namespace without loss", async () => {
    const oldEntry = {
      value: "old-value",
      writtenAt: "2026-04-21T09:00:00.000Z",
      writtenBy: "cio",
    };
    chainSelectSingle({
      data: { shared_knowledge: { cio: { oldKey: oldEntry } } },
      error: null,
    });
    chainUpdateEqId({ error: null });

    await writeSharedKnowledge("user-1", "cio", "newKey", "new-value");

    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    const nested = payload.shared_knowledge as Record<
      string,
      Record<string, { value: string; writtenAt: string; writtenBy: string }>
    >;

    expect(nested.cio.oldKey).toEqual(oldEntry);
    expect(nested.cio.newKey.value).toBe("new-value");
    expect(nested.cio.newKey.writtenBy).toBe("cio");
  });

  it("adds a new agent namespace alongside existing ones", async () => {
    const existingCio = {
      value: "cio-note",
      writtenAt: "2026-04-21T09:00:00.000Z",
      writtenBy: "cio",
    };
    chainSelectSingle({
      data: { shared_knowledge: { cio: { keyA: existingCio } } },
      error: null,
    });
    chainUpdateEqId({ error: null });

    await writeSharedKnowledge("user-1", "cro", "appXYZ", "cro-note");

    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    const nested = payload.shared_knowledge as Record<
      string,
      Record<string, { value: string; writtenAt: string; writtenBy: string }>
    >;

    expect(nested.cio.keyA).toEqual(existingCio);
    expect(nested.cro.appXYZ.value).toBe("cro-note");
    expect(nested.cro.appXYZ.writtenBy).toBe("cro");
  });

  it("overwrites value + writtenAt when the same entryKey is written twice", async () => {
    const old = {
      value: "old",
      writtenAt: "2026-04-20T00:00:00.000Z",
      writtenBy: "cio",
    };
    chainSelectSingle({
      data: { shared_knowledge: { cio: { sameKey: old } } },
      error: null,
    });
    chainUpdateEqId({ error: null });

    await writeSharedKnowledge("user-1", "cio", "sameKey", "new");

    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    const nested = payload.shared_knowledge as Record<
      string,
      Record<string, { value: string; writtenAt: string; writtenBy: string }>
    >;

    expect(nested.cio.sameKey.value).toBe("new");
    expect(nested.cio.sameKey.writtenAt).not.toBe(old.writtenAt);
    // Only one key in the namespace — overwrite, not append.
    expect(Object.keys(nested.cio)).toEqual(["sameKey"]);
  });

  it("logs and skips the update when the read leg errors", async () => {
    chainSelectSingle({
      data: null,
      error: { message: "RLS denied" },
    });

    await writeSharedKnowledge("user-1", "cio", "k", "v");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe(
      "shared_knowledge.read_for_write_failed",
    );
  });

  it("logs once when the update leg errors", async () => {
    chainSelectSingle({ data: { shared_knowledge: {} }, error: null });
    chainUpdateEqId({ error: { message: "write conflict" } });

    await writeSharedKnowledge("user-1", "cio", "k", "v");

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("shared_knowledge.write_failed");
  });
});
