// @vitest-environment happy-dom

/**
 * Trust Console — client island UI tests.
 *
 * Covers the Day 1 Trust Console requirements that live in the client
 * surface (not the server actions):
 *
 *   1. Retention banner renders when flagOn = true and hides when off.
 *   2. Revoke confirm modal renders real `items` and `tables` counts
 *      pulled from the page-level preview.
 *   3. The "type REVOKE to confirm" gate keeps the confirm button
 *      disabled until the user types the canonical word.
 *   4. After a successful revoke the modal closes, the success banner
 *      shows, and the AuditFeed anchor receives `scrollIntoView` on the
 *      next render that includes a new event.
 *
 * Server actions are stubbed so the assertions can focus on the DOM
 * behavior without booting the full Next.js runtime.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

(globalThis as unknown as {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const {
  revokeMock,
  exportMock,
  deleteMock,
} = vi.hoisted(() => ({
  revokeMock: vi.fn(),
  exportMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("../actions", () => ({
  revokeNetworkingConsentAction: revokeMock,
  requestDataExportAction: exportMock,
  requestDataDeleteAction: deleteMock,
}));

const { PrivacyClient, REVOKE_CONFIRM_WORD, AUDIT_HISTORY_RETENTION_DAYS } =
  await import("../privacy-client");
import type { AuditLogRow } from "@/lib/db/queries/trust-console-rest";

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(node: ReactElement): Mounted {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return {
    host,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

const baseProps = (
  overrides: Partial<Parameters<typeof PrivacyClient>[0]> = {},
): Parameters<typeof PrivacyClient>[0] => ({
  userEmail: "alice@example.com",
  consentState: {
    networking: {
      state: "opted_in",
      sinceIso: "2026-05-01T00:00:00Z",
      consentVersion: 2,
    },
  },
  auditTimeline: [],
  gmail: { connected: true, sinceIso: null },
  calendar: { connected: true, sinceIso: null },
  flagPreview: false,
  flagOn: true,
  revokePreview: { itemsToErase: 7, tablesTouched: ["user_profiles", "x"] },
  ...overrides,
});

let cleanups: Array<() => void> = [];
beforeEach(() => {
  cleanups = [];
  revokeMock.mockReset();
  exportMock.mockReset();
  deleteMock.mockReset();
});
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});

describe("PrivacyClient — retention banner", () => {
  it("renders the banner when flagOn = true", () => {
    const m = mount(<PrivacyClient {...baseProps({ flagOn: true })} />);
    cleanups.push(m.unmount);
    const banner = m.host.querySelector("[data-testid='retention-banner']");
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain(
      `${AUDIT_HISTORY_RETENTION_DAYS} day`,
    );
    expect(banner!.textContent).toContain("retention SLA");
  });

  it("hides the banner when flagOn = false (preview / graceful degrade)", () => {
    const m = mount(
      <PrivacyClient {...baseProps({ flagOn: false, flagPreview: true })} />,
    );
    cleanups.push(m.unmount);
    expect(
      m.host.querySelector("[data-testid='retention-banner']"),
    ).toBeNull();
  });
});

describe("PrivacyClient — revoke confirm modal", () => {
  it("does not render the modal initially", () => {
    const m = mount(<PrivacyClient {...baseProps()} />);
    cleanups.push(m.unmount);
    expect(m.host.querySelector("[data-testid='revoke-modal']")).toBeNull();
  });

  it("renders real items + tables counts when opened", () => {
    const m = mount(
      <PrivacyClient
        {...baseProps({
          revokePreview: {
            itemsToErase: 12,
            tablesTouched: [
              "user_profiles",
              "networking_match_index",
              "match_candidate_index",
            ],
          },
        })}
      />,
    );
    cleanups.push(m.unmount);
    const openBtn = m.host.querySelector<HTMLButtonElement>(
      "[data-testid='revoke-button']",
    );
    expect(openBtn).not.toBeNull();
    act(() => {
      openBtn!.click();
    });
    const impact = m.host.querySelector("[data-testid='revoke-modal-impact']");
    expect(impact).not.toBeNull();
    const text = impact!.textContent ?? "";
    expect(text).toContain("12 items");
    expect(text).toContain("3 tables");
    expect(text).toContain("60 seconds");
    expect(text).toContain("Cannot be undone");
  });

  it("keeps the confirm button disabled until REVOKE is typed exactly", () => {
    const m = mount(<PrivacyClient {...baseProps()} />);
    cleanups.push(m.unmount);
    act(() => {
      m.host
        .querySelector<HTMLButtonElement>("[data-testid='revoke-button']")!
        .click();
    });
    const confirmBtn = m.host.querySelector<HTMLButtonElement>(
      "[data-testid='revoke-modal-confirm']",
    );
    const input = m.host.querySelector<HTMLInputElement>(
      "[data-testid='revoke-modal-input']",
    );
    expect(confirmBtn).not.toBeNull();
    expect(input).not.toBeNull();
    // Initially disabled.
    expect(confirmBtn!.disabled).toBe(true);

    // Wrong word — still disabled.
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input, "revoke");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(confirmBtn!.disabled).toBe(true);

    // Right word — enabled.
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input, REVOKE_CONFIRM_WORD);
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(confirmBtn!.disabled).toBe(false);
  });

  it("fires the revoke action on click when the word is correct", async () => {
    revokeMock.mockResolvedValue({ ok: true, itemsErased: 4 });
    const m = mount(<PrivacyClient {...baseProps()} />);
    cleanups.push(m.unmount);

    act(() => {
      m.host
        .querySelector<HTMLButtonElement>("[data-testid='revoke-button']")!
        .click();
    });
    const input = m.host.querySelector<HTMLInputElement>(
      "[data-testid='revoke-modal-input']",
    )!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input, REVOKE_CONFIRM_WORD);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='revoke-modal-confirm']",
        )!
        .click();
    });

    expect(revokeMock).toHaveBeenCalledTimes(1);
    // Modal closes on success.
    expect(m.host.querySelector("[data-testid='revoke-modal']")).toBeNull();
    // Success banner is shown.
    const banner = m.host.querySelector("[data-testid='banner-success']");
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain("4 items erased");
  });

  it("renders a sanitized in-modal error and a Try again affordance on failure", async () => {
    revokeMock.mockResolvedValue({
      ok: false,
      error: "revoke_cascade_failed",
    });
    const m = mount(<PrivacyClient {...baseProps()} />);
    cleanups.push(m.unmount);

    act(() => {
      m.host
        .querySelector<HTMLButtonElement>("[data-testid='revoke-button']")!
        .click();
    });
    const input = m.host.querySelector<HTMLInputElement>(
      "[data-testid='revoke-modal-input']",
    )!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input, REVOKE_CONFIRM_WORD);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='revoke-modal-confirm']",
        )!
        .click();
    });

    // Modal stays open with an error.
    expect(m.host.querySelector("[data-testid='revoke-modal']")).not.toBeNull();
    const err = m.host.querySelector("[data-testid='revoke-modal-error']");
    expect(err).not.toBeNull();
    expect(err!.textContent).toMatch(/operator/i);
    // Confirm button now says "Try again".
    const confirm = m.host.querySelector<HTMLButtonElement>(
      "[data-testid='revoke-modal-confirm']",
    );
    expect(confirm!.textContent).toContain("Try again");
  });

  it("polls the export-status endpoint after queueing and renders the download link", async () => {
    exportMock.mockResolvedValue({ ok: true, queued: true });
    const responses: Array<{
      status: string;
      requestedAtIso: string | null;
      deliveredAtIso: string | null;
      downloadUrl: string | null;
      downloadExpiresAtIso: string | null;
    }> = [
      // First fetch on mount → idle.
      {
        status: "idle",
        requestedAtIso: null,
        deliveredAtIso: null,
        downloadUrl: null,
        downloadExpiresAtIso: null,
      },
      // First poll after request → queued.
      {
        status: "queued",
        requestedAtIso: "2026-05-11T00:00:00Z",
        deliveredAtIso: null,
        downloadUrl: null,
        downloadExpiresAtIso: null,
      },
      // Second poll → delivered with signed URL.
      {
        status: "delivered",
        requestedAtIso: "2026-05-11T00:00:00Z",
        deliveredAtIso: "2026-05-11T00:01:00Z",
        downloadUrl: "https://stub.example/signed",
        downloadExpiresAtIso: "2026-05-11T01:01:00Z",
      },
    ];
    const fetchSpy = vi.fn(async () => {
      const next = responses.shift() ?? responses[responses.length - 1];
      return new Response(JSON.stringify(next), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    vi.useFakeTimers();
    try {
      const m = mount(<PrivacyClient {...baseProps()} />);
      cleanups.push(m.unmount);

      // Allow the mount-time fetch to settle.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const exportBtn = m.host.querySelector<HTMLButtonElement>(
        "[data-testid='export-button']",
      )!;
      await act(async () => {
        exportBtn.click();
        await Promise.resolve();
      });

      // First poll tick.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      // Status should show queued / building.
      expect(
        m.host.querySelector("[data-testid='export-status-inflight']"),
      ).not.toBeNull();

      // Second poll tick — delivered.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      const link = m.host.querySelector<HTMLAnchorElement>(
        "[data-testid='export-download-link']",
      );
      expect(link).not.toBeNull();
      expect(link!.getAttribute("href")).toBe("https://stub.example/signed");
    } finally {
      vi.useRealTimers();
      globalThis.fetch = originalFetch;
    }
  });

  it("scrolls the audit-feed anchor into view when the timeline grows", () => {
    const r1: AuditLogRow = {
      id: "ev-1",
      user_id: "u1",
      event_type: "networking_opted_in",
      resource_type: null,
      resource_id: null,
      metadata: {},
      ip_address: null,
      user_agent: null,
      created_at: "2026-05-09T00:00:00Z",
    } as AuditLogRow;
    const r2: AuditLogRow = {
      id: "ev-2",
      user_id: "u1",
      event_type: "networking_revoked",
      resource_type: null,
      resource_id: null,
      metadata: {},
      ip_address: null,
      user_agent: null,
      created_at: "2026-05-10T00:00:00Z",
    } as AuditLogRow;

    const m = mount(
      <PrivacyClient {...baseProps({ auditTimeline: [r1] })} />,
    );
    cleanups.push(m.unmount);

    const anchor = m.host.querySelector("[data-testid='audit-feed-anchor']");
    expect(anchor).not.toBeNull();
    const scrollIntoView = vi.fn();
    (anchor as Element & { scrollIntoView?: typeof scrollIntoView })
      .scrollIntoView = scrollIntoView;

    act(() => {
      m.root.render(
        <PrivacyClient {...baseProps({ auditTimeline: [r2, r1] })} />,
      );
    });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
