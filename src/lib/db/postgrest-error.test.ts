import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PostgrestError } from "@supabase/supabase-js";
import { jsonPostgrestError } from "./postgrest-error";

// Stub the logger so we don't see noise during tests.
vi.mock("@/lib/logger", () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function makeError(code: string, message = "raw db error message"): PostgrestError {
  return {
    code,
    message,
    details: "",
    hint: "",
    name: "PostgrestError",
  } as unknown as PostgrestError;
}

describe("jsonPostgrestError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("maps 22P02 (invalid input — bad UUID/int) to 400 INVALID_INPUT and does not leak the raw message", async () => {
    const res = jsonPostgrestError(
      makeError("22P02", 'invalid input syntax for type uuid: "../../admin"'),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
    // Raw message must not be in the response
    expect(JSON.stringify(body)).not.toContain("admin");
    expect(JSON.stringify(body)).not.toContain("uuid");
  });

  it("maps 23505 (unique violation) to 409 CONFLICT", async () => {
    const res = jsonPostgrestError(
      makeError("23505", 'duplicate key value violates unique constraint "x_key"'),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
    expect(JSON.stringify(body)).not.toContain("constraint");
  });

  it("maps 23514 (check violation) to 400 INVALID_INPUT", async () => {
    const res = jsonPostgrestError(makeError("23514", "violates check"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns generic DB_ERROR for unknown codes (no message leak)", async () => {
    const res = jsonPostgrestError(makeError("XX000", "some internal db error"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("DB_ERROR");
    expect(JSON.stringify(body)).not.toContain("internal");
  });

  it("respects the status override for unknown codes", async () => {
    const res = jsonPostgrestError(makeError("XX000"), 503);
    expect(res.status).toBe(503);
  });
});
