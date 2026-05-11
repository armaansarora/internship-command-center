// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { RecentActivationsTable } from "../RecentActivationsTable";
import type { RecentActivationDispatch } from "@/lib/db/queries/operations-rest";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * RecentActivationsTable render contract.
 *
 * Asserts:
 *   - Empty array renders the empty-state copy.
 *   - Long summaries are truncated to 80 chars + "…", short summaries
 *     pass through untouched, null summaries render as the em dash.
 *   - User IDs are truncated to 8-char prefixes; the full UUID rides
 *     in the cell's `title` for the on-hover tooltip.
 *   - Status pill text matches the dispatch status.
 */

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

let cleanups: Array<() => void> = [];

beforeEach(() => {
  cleanups = [];
  // Pin Date.now so the relative-time formatter is deterministic.
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));
});

afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
  vi.useRealTimers();
});

const LONG_SUMMARY =
  "Apply to the Goldman Sachs analyst program this morning — the rolling deadline closes Thursday and three of your warm contacts are on the desk.";

describe("RecentActivationsTable", () => {
  it("renders the empty state when there are zero dispatches", () => {
    const m = mount(<RecentActivationsTable dispatches={[]} />);
    cleanups.push(m.unmount);

    const empty = m.host.querySelector(
      "[data-testid='recent-activations-empty']",
    );
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toMatch(/no activation dispatches/i);
  });

  it("truncates long summaries to 80 chars + ellipsis", () => {
    const dispatches: RecentActivationDispatch[] = [
      {
        dispatchId: "11111111-1111-4111-8111-111111111111",
        userId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        status: "completed",
        summary: LONG_SUMMARY,
        createdAt: "2026-05-10T11:55:00Z",
        companyName: "Goldman Sachs",
        role: "Analyst",
      },
    ];
    const m = mount(<RecentActivationsTable dispatches={dispatches} />);
    cleanups.push(m.unmount);

    const summary = m.host.querySelector(
      "[data-testid='summary-11111111-1111-4111-8111-111111111111']",
    );
    expect(summary).not.toBeNull();
    const text = summary?.textContent ?? "";
    expect(text.endsWith("…")).toBe(true);
    // Truncated visible text + the trailing ellipsis is 81 codepoints max.
    expect(text.length).toBeLessThanOrEqual(81);
    // Full original summary is exposed on the title attribute.
    expect(summary?.getAttribute("title")).toBe(LONG_SUMMARY);
  });

  it("passes short summaries through untouched and renders status pills", () => {
    const dispatches: RecentActivationDispatch[] = [
      {
        dispatchId: "22222222-2222-4222-8222-222222222222",
        userId: "12345678-aaaa-bbbb-cccc-dddddddddddd",
        status: "failed",
        summary: "Reach out today.",
        createdAt: "2026-05-10T11:00:00Z",
        companyName: null,
        role: null,
      },
    ];
    const m = mount(<RecentActivationsTable dispatches={dispatches} />);
    cleanups.push(m.unmount);

    const summary = m.host.querySelector(
      "[data-testid='summary-22222222-2222-4222-8222-222222222222']",
    );
    expect(summary?.textContent).toBe("Reach out today.");

    const status = m.host.querySelector(
      "[data-testid='status-pill-22222222-2222-4222-8222-222222222222']",
    );
    expect(status?.textContent).toMatch(/failed/i);
    expect(status?.getAttribute("aria-label")).toBe("Status: Failed");
  });

  it("truncates user ids to 8-char prefix and keeps full id in title", () => {
    const dispatches: RecentActivationDispatch[] = [
      {
        dispatchId: "33333333-3333-4333-8333-333333333333",
        userId: "0123456789abcdef0000000000000000",
        status: "queued",
        summary: null,
        createdAt: "2026-05-10T11:50:00Z",
        companyName: null,
        role: null,
      },
    ];
    const m = mount(<RecentActivationsTable dispatches={dispatches} />);
    cleanups.push(m.unmount);

    const text = m.host.textContent ?? "";
    expect(text).toContain("01234567");
    // The full id should never appear in the visible body text — it's on
    // the title attribute of the user cell instead.
    const userCells = Array.from(
      m.host.querySelectorAll<HTMLElement>("td[title]"),
    );
    const ids = userCells.map((c) => c.getAttribute("title"));
    expect(ids).toContain("0123456789abcdef0000000000000000");
  });

  it("renders null summary as the em dash", () => {
    const dispatches: RecentActivationDispatch[] = [
      {
        dispatchId: "44444444-4444-4444-8444-444444444444",
        userId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        status: "running",
        summary: null,
        createdAt: "2026-05-10T11:59:00Z",
        companyName: null,
        role: null,
      },
    ];
    const m = mount(<RecentActivationsTable dispatches={dispatches} />);
    cleanups.push(m.unmount);

    const summary = m.host.querySelector(
      "[data-testid='summary-44444444-4444-4444-8444-444444444444']",
    );
    expect(summary?.textContent).toBe("—");
  });
});
