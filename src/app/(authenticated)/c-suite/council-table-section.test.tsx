// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Server-component tests for CouncilTableSection.
 *
 * The section is a server component that:
 *   1. Returns `null` when the gate flag is off.
 *   2. Calls `listRecentDossiersForUser(supabase, userId, { limit: 20 })`
 *      when the flag is on and returns the rendered surface.
 *
 * We mock the gate-config, the supabase server client, and the dossiers
 * REST helper directly (rather than going through Drizzle) — same approach
 * as the other rest-helper test files.
 */

// ---------------------------------------------------------------------------
// Hoisted spies — referenced inside vi.mock factories.
// ---------------------------------------------------------------------------
const { councilTableEnabledMock, listRecentMock, createClientMock } =
  vi.hoisted(() => ({
    councilTableEnabledMock: vi.fn<() => boolean>(() => false),
    listRecentMock: vi.fn(),
    createClientMock: vi.fn(),
  }));

vi.mock("@/lib/config/gate-config", () => ({
  GATE_CONFIG: {
    flags: {
      councilTableEnabled: councilTableEnabledMock,
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
  getUser: vi.fn(async () => ({ id: "u-1" })),
}));

vi.mock("@/lib/db/queries/handoff-dossiers-rest", () => ({
  listRecentDossiersForUser: listRecentMock,
  updateDossierDecision: vi.fn(),
}));

// Re-import after mocks. We deliberately use a dynamic import so the mocks
// above are wired in before the module under test reads them.
async function loadSection() {
  return await import("./council-table-section");
}

beforeEach(() => {
  councilTableEnabledMock.mockReset();
  listRecentMock.mockReset();
  createClientMock.mockReset();
  // Default safe values.
  councilTableEnabledMock.mockReturnValue(false);
  createClientMock.mockResolvedValue({ from: vi.fn() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CouncilTableSection — flag gate", () => {
  it("returns null when councilTableEnabled() === false", async () => {
    councilTableEnabledMock.mockReturnValue(false);
    const { CouncilTableSection } = await loadSection();

    const node = await CouncilTableSection({ userId: "u-1" });
    expect(node).toBeNull();
    // Should NOT touch the supabase client or the REST helper.
    expect(createClientMock).not.toHaveBeenCalled();
    expect(listRecentMock).not.toHaveBeenCalled();
  });

  it("renders the section + delegates to listRecentDossiersForUser when flag is on", async () => {
    councilTableEnabledMock.mockReturnValue(true);
    listRecentMock.mockResolvedValue([]);
    const { CouncilTableSection } = await loadSection();

    const node = await CouncilTableSection({ userId: "u-1" });
    expect(node).not.toBeNull();

    // The supabase client is acquired exactly once.
    expect(createClientMock).toHaveBeenCalledTimes(1);
    // The REST helper is called with the same userId + the 20-row cap.
    expect(listRecentMock).toHaveBeenCalledTimes(1);
    const callArgs = listRecentMock.mock.calls[0];
    expect(callArgs?.[1]).toBe("u-1");
    expect(callArgs?.[2]).toEqual({ limit: 20 });

    // Surface markup carries the section test id + aria label.
    const html = renderToStaticMarkup(node as React.ReactElement);
    const doc = new DOMParser().parseFromString(
      `<!doctype html><body>${html}</body>`,
      "text/html",
    );
    const section = doc.querySelector('[data-testid="council-table-section"]');
    expect(section).not.toBeNull();
    expect(section?.getAttribute("aria-label")).toContain("Council Table");
  });

  it("renders the empty state when the REST helper returns []", async () => {
    councilTableEnabledMock.mockReturnValue(true);
    listRecentMock.mockResolvedValue([]);
    const { CouncilTableSection } = await loadSection();

    const node = await CouncilTableSection({ userId: "u-1" });
    const html = renderToStaticMarkup(node as React.ReactElement);
    const doc = new DOMParser().parseFromString(
      `<!doctype html><body>${html}</body>`,
      "text/html",
    );
    expect(
      doc.querySelector('[data-testid="council-table-empty"]'),
    ).not.toBeNull();
  });

  it("renders Council Table content when dossiers come back", async () => {
    councilTableEnabledMock.mockReturnValue(true);
    listRecentMock.mockResolvedValue([
      {
        id: "d-1",
        user_id: "u-1",
        request_id: "r-1",
        dispatch_id: null,
        owner: "cro",
        requesting_agent: "ceo",
        task: "Review pipeline",
        evidence: [],
        open_questions: [],
        confidence: 80,
        disagreement: null,
        proposed_action: "Reach out",
        permission_needed: "none",
        deadline: null,
        recommendation: "Push forward this week.",
        status: "ready",
        decided_at: null,
        executed_at: null,
        created_at: "2026-05-10T12:00:00.000Z",
        updated_at: "2026-05-10T12:00:00.000Z",
      },
    ]);
    const { CouncilTableSection } = await loadSection();

    const node = await CouncilTableSection({ userId: "u-1" });
    const html = renderToStaticMarkup(node as React.ReactElement);
    const doc = new DOMParser().parseFromString(
      `<!doctype html><body>${html}</body>`,
      "text/html",
    );
    expect(doc.querySelector('[data-testid="council-table"]')).not.toBeNull();
    expect(doc.querySelector('[data-testid="department-lane"]')).not.toBeNull();
    expect(doc.querySelector('[data-testid="dossier-recommendation"]')?.textContent).toContain(
      "Push forward",
    );
  });
});
