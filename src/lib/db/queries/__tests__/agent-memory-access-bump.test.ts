/**
 * getAgentMemories access-count maintenance.
 *
 * The bump must be a SINGLE atomic `increment_memory_access` RPC (not the old
 * N parallel read-modify-write UPDATEs), and it must be fire-and-forget — a
 * failing bump can never break retrieval.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { createClientSpy, rpcSpy } = vi.hoisted(() => ({
  createClientSpy: vi.fn(),
  rpcSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientSpy }));
vi.mock("@/lib/logger", () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { getAgentMemories } = await import("../agent-memory-rest");

type QueryResult = { data: unknown; error: unknown };

function makeSelectChain(result: QueryResult): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.limit = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeClient(result: QueryResult, rpc: typeof rpcSpy) {
  return { from: vi.fn(() => makeSelectChain(result)), rpc };
}

const ID_A = "11111111-1111-1111-1111-111111111111";
const ID_B = "22222222-2222-2222-2222-222222222222";

describe("getAgentMemories — atomic access-count bump", () => {
  beforeEach(() => {
    createClientSpy.mockReset();
    rpcSpy.mockReset();
  });

  it("bumps the whole batch with ONE increment_memory_access RPC (no N+1)", async () => {
    const rows = [
      { id: ID_A, user_id: "u1", agent: "cro", access_count: 3 },
      { id: ID_B, user_id: "u1", agent: "cro", access_count: 7 },
    ];
    rpcSpy.mockResolvedValue({ data: null, error: null });
    createClientSpy.mockResolvedValue(makeClient({ data: rows, error: null }, rpcSpy));

    const out = await getAgentMemories("u1", "cro", 20);

    expect(out).toHaveLength(2);
    expect(out.map((m) => m.id)).toEqual([ID_A, ID_B]);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith("increment_memory_access", {
      p_ids: [ID_A, ID_B],
      p_user_id: "u1",
    });
  });

  it("still returns memories when the bump RPC reports an error", async () => {
    const rows = [{ id: ID_A, user_id: "u1", agent: "cro", access_count: 0 }];
    rpcSpy.mockResolvedValue({ data: null, error: { message: "boom" } });
    createClientSpy.mockResolvedValue(makeClient({ data: rows, error: null }, rpcSpy));

    const out = await getAgentMemories("u1", "cro");

    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(ID_A);
  });

  it("does not call the RPC when there are no rows", async () => {
    createClientSpy.mockResolvedValue(makeClient({ data: [], error: null }, rpcSpy));

    const out = await getAgentMemories("u1", "cro");

    expect(out).toEqual([]);
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
