// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import type { Application } from "@/db/schema";
import { ApplicationCard } from "./ApplicationCard";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R9.6 — ApplicationCard prop wiring tests for the rejection-reflection
 * strip. Tests the new opt-in surface only — existing card behavior is
 * exercised in the war-table integration suite.
 *
 * Contract:
 *   - showReflectionStrip=false (default) → no strip rendered.
 *   - showReflectionStrip=true AND status=rejected → strip rendered.
 *   - showReflectionStrip=true AND status=applied → strip NOT rendered.
 *   - Smoke render with default props doesn't throw.
 *
 * dnd-kit useSortable requires a DndContext + SortableContext ancestor;
 * the wrapper handles that.
 */

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function makeApp(over: Partial<Application> = {}): Application {
  const now = new Date().toISOString();
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    companyId: null,
    role: "Analyst",
    url: null,
    status: "applied",
    tier: 2,
    appliedAt: new Date("2026-04-01") as unknown as Application["appliedAt"],
    source: null,
    notes: null,
    sector: null,
    contactId: null,
    salary: null,
    location: null,
    position: null,
    companyName: "Acme",
    lastActivityAt: null,
    matchScore: null,
    deadlineAt: null,
    deadlineAlertsSent: {},
    createdAt: now as unknown as Application["createdAt"],
    updatedAt: now as unknown as Application["updatedAt"],
    ...over,
  } as Application;
}

function mount(node: React.ReactElement): Mounted {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <DndContext>
        <SortableContext items={["11111111-1111-4111-8111-111111111111"]}>
          {node}
        </SortableContext>
      </DndContext>,
    );
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
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

describe("ApplicationCard — base smoke", () => {
  it("renders the card without throwing using only default props", () => {
    const m = mount(<ApplicationCard application={makeApp()} />);
    cleanups.push(m.unmount);
    expect(m.host.querySelector('[role="article"]')).not.toBeNull();
  });
});

describe("ApplicationCard — reflection strip wiring", () => {
  it("does NOT render the strip by default (showReflectionStrip omitted)", () => {
    const m = mount(
      <ApplicationCard
        application={makeApp({ status: "rejected" })}
      />,
    );
    cleanups.push(m.unmount);
    expect(m.host.querySelector('[data-reflection-strip="true"]')).toBeNull();
  });

  it("does NOT render the strip when showReflectionStrip=false", () => {
    const m = mount(
      <ApplicationCard
        application={makeApp({ status: "rejected" })}
        showReflectionStrip={false}
      />,
    );
    cleanups.push(m.unmount);
    expect(m.host.querySelector('[data-reflection-strip="true"]')).toBeNull();
  });

  it("renders the strip when showReflectionStrip=true AND status=rejected", () => {
    const m = mount(
      <ApplicationCard
        application={makeApp({ status: "rejected" })}
        showReflectionStrip={true}
      />,
    );
    cleanups.push(m.unmount);
    expect(m.host.querySelector('[data-reflection-strip="true"]')).not.toBeNull();
  });

  it("does NOT render the strip when status is anything other than rejected", () => {
    const statuses: Application["status"][] = [
      "discovered",
      "applied",
      "screening",
      "interview_scheduled",
      "interviewing",
      "under_review",
      "offer",
      "accepted",
      "withdrawn",
    ];
    for (const status of statuses) {
      const m = mount(
        <ApplicationCard
          application={makeApp({ status })}
          showReflectionStrip={true}
        />,
      );
      cleanups.push(m.unmount);
      expect(m.host.querySelector('[data-reflection-strip="true"]')).toBeNull();
    }
  });

  it("propagates onReflectionSubmit + onReflectionSkip via callback signature", () => {
    const onReflectionSubmit = vi.fn();
    const onReflectionSkip = vi.fn();
    const m = mount(
      <ApplicationCard
        application={makeApp({ status: "rejected" })}
        showReflectionStrip={true}
        onReflectionSubmit={onReflectionSubmit}
        onReflectionSkip={onReflectionSkip}
      />,
    );
    cleanups.push(m.unmount);

    // The strip is rendered → click "Skip" (default action button text).
    const submitBtn = m.host.querySelector<HTMLButtonElement>(
      'button[data-action="submit"]',
    );
    expect(submitBtn).not.toBeNull();
    act(() => {
      submitBtn!.click();
    });
    expect(onReflectionSkip).toHaveBeenCalledTimes(1);
    expect(onReflectionSkip).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(onReflectionSubmit).not.toHaveBeenCalled();
  });
});
