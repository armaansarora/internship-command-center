import { describe, it, expect, beforeEach, vi } from "vitest";
import JSZip from "jszip";

/**
 * Tests for `buildUserExport` — the pure zip-assembler for the R0.6 user-data
 * export flow. The assembler must:
 *   1. Return a Buffer containing a valid zip archive
 *   2. Include manifest.json with per-table row counts and the schema version
 *   3. Query every table by `user_id = <id>` EXCEPT user_profiles (by `id`)
 *   4. Throw synchronously if any table read errors (so the cron worker can
 *      mark the job failed instead of delivering a partial archive)
 */

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
//
// We mock the admin client to produce a per-table query builder. Each table's
// response can be controlled by `tableResponses`, keyed by table name.
const { selectByTable, mockAdminClient } = vi.hoisted(() => {
  const tableResponses = new Map<
    string,
    { data: Array<Record<string, unknown>> | null; error: { message: string } | null }
  >();

  const selectByTable = {
    set(table: string, data: Array<Record<string, unknown>>): void {
      tableResponses.set(table, { data, error: null });
    },
    fail(table: string, message: string): void {
      tableResponses.set(table, { data: null, error: { message } });
    },
    reset(): void {
      tableResponses.clear();
    },
  };

  const mockAdminClient = {
    from(table: string) {
      return {
        select() {
          return {
            eq: async () => {
              const res = tableResponses.get(table);
              if (!res) return { data: [], error: null };
              return res;
            },
          };
        },
      };
    },
  };

  return { selectByTable, mockAdminClient };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => mockAdminClient,
}));

// Re-import after the mock is registered so the module picks it up.
const { buildUserExport } = await import("./export");

const EXPECTED_TABLES = [
  "user_profiles",
  "companies",
  "applications",
  "contacts",
  "emails",
  "documents",
  "interviews",
  "calendar_events",
  "notifications",
  "outreach_queue",
  "daily_snapshots",
  "agent_logs",
  "audit_logs",
] as const;

describe("buildUserExport", () => {
  beforeEach(() => {
    selectByTable.reset();
  });

  it("returns a Buffer containing a valid zip", async () => {
    selectByTable.set("user_profiles", [{ id: "u-1", email: "a@b.com" }]);
    selectByTable.set("companies", []);

    const buf = await buildUserExport("u-1");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(22); // minimum for an end-of-central-dir record

    // Confirm we can round-trip parse it.
    const zip = await JSZip.loadAsync(buf);
    const manifestFile = zip.file("manifest.json");
    expect(manifestFile).not.toBeNull();
  });

  it("writes one JSON file per table under data/ plus a manifest", async () => {
    selectByTable.set("user_profiles", [{ id: "u-2" }]);
    selectByTable.set("applications", [
      { id: "a1", user_id: "u-2" },
      { id: "a2", user_id: "u-2" },
    ]);

    const buf = await buildUserExport("u-2");
    const zip = await JSZip.loadAsync(buf);

    for (const table of EXPECTED_TABLES) {
      const file = zip.file(`data/${table}.json`);
      expect(file, `expected data/${table}.json to exist`).not.toBeNull();
    }

    const manifestText = await zip.file("manifest.json")!.async("string");
    const manifest = JSON.parse(manifestText) as {
      userId: string;
      exportedAt: string;
      schemaVersion: number;
      counts: Record<string, number>;
    };

    expect(manifest.userId).toBe("u-2");
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.counts.applications).toBe(2);
    expect(manifest.counts.user_profiles).toBe(1);
    // Tables with no data default to 0.
    expect(manifest.counts.audit_logs).toBe(0);
  });

  it("always includes a README.txt explaining the archive", async () => {
    selectByTable.set("user_profiles", []);

    const buf = await buildUserExport("u-3");
    const zip = await JSZip.loadAsync(buf);
    const readme = zip.file("README.txt");
    expect(readme).not.toBeNull();
    const text = await readme!.async("string");
    expect(text.toLowerCase()).toContain("tower");
  });

  it("throws if any table read fails — partial archives are unacceptable", async () => {
    selectByTable.set("user_profiles", [{ id: "u-4" }]);
    selectByTable.fail("emails", "rls denied");

    await expect(buildUserExport("u-4")).rejects.toThrow(/emails.*rls denied/);
  });

  it("stores each table's payload as a JSON array", async () => {
    const contacts = [
      { id: "c1", user_id: "u-5", name: "Alice" },
      { id: "c2", user_id: "u-5", name: "Bob" },
    ];
    selectByTable.set("user_profiles", [{ id: "u-5" }]);
    selectByTable.set("contacts", contacts);

    const buf = await buildUserExport("u-5");
    const zip = await JSZip.loadAsync(buf);
    const text = await zip.file("data/contacts.json")!.async("string");
    const parsed = JSON.parse(text) as unknown;
    expect(parsed).toEqual(contacts);
  });
});
