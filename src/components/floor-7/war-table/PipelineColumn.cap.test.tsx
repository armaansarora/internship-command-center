/**
 * R12 Red Team scale fix — PipelineColumn render cap test.
 *
 * Caps each column at MAX_VISIBLE_PER_COLUMN cards (currently 100). Above
 * the cap, a status banner counts hidden cards and prompts filter use.
 * Without this cap, a 500+ application column blows up the DOM at scale.
 */
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { DndContext } from "@dnd-kit/core";
import type { Application } from "@/db/schema";
import { PipelineColumn } from "./PipelineColumn";

function makeApp(i: number): Application {
  return {
    id: `app-${i.toString().padStart(4, "0")}`,
    userId: "u1",
    companyName: `Company ${i}`,
    role: `Role ${i}`,
    status: "applied",
    position: `pos_${i.toString().padStart(6, "0")}`,
    appliedAt: new Date("2026-04-24T00:00:00Z"),
    deadlineAt: null,
    salary: null,
    location: null,
    notes: null,
    tags: [],
    source: null,
    jobUrl: null,
    contactsCount: 0,
    interviewsCount: 0,
    rejectionAt: null,
    offerAt: null,
    deadlineAlertsSent: {},
    createdAt: new Date("2026-04-24T00:00:00Z"),
    updatedAt: new Date("2026-04-24T00:00:00Z"),
  } as unknown as Application;
}

function renderColumn(count: number): string {
  const apps = Array.from({ length: count }, (_, i) => makeApp(i));
  return renderToString(
    <DndContext>
      <PipelineColumn
        columnId="applied"
        tacticalName="Applied"
        color="#1E90FF"
        applications={apps}
      />
    </DndContext>,
  );
}

/** Count occurrences of a substring (rough proxy for card count). */
function count(html: string, needle: string): number {
  let n = 0;
  let i = 0;
  while ((i = html.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}

describe("PipelineColumn render cap (defense at scale)", () => {
  it("renders all cards when count is at or below the cap (50)", () => {
    const html = renderColumn(50);
    expect(html).not.toContain("war-column-overflow-banner");
    // 50 cards rendered: 50 listitem wrappers.
    expect(count(html, 'role="listitem"')).toBe(50);
    expect(html).toContain("Company 0");
    expect(html).toContain("Company 49");
    expect(html).not.toContain("Company 50");
  });

  it("renders all cards when count equals the cap exactly (100)", () => {
    const html = renderColumn(100);
    expect(html).not.toContain("war-column-overflow-banner");
    expect(count(html, 'role="listitem"')).toBe(100);
    expect(html).toContain("Company 99");
    expect(html).not.toContain("Company 100");
  });

  it("caps rendering at 100 + shows overflow banner with hidden count when count is 150", () => {
    const html = renderColumn(150);
    expect(html).toContain("war-column-overflow-banner");
    expect(html).toContain("+ 50 more");
    expect(html).toContain("column capped at 100");
    expect(count(html, 'role="listitem"')).toBe(100);
    expect(html).toContain("Company 99");
    expect(html).not.toContain("Company 100");
    expect(html).not.toContain("Company 149");
  });

  it("caps rendering at 100 + shows correct overflow count at 500 (the R12 scale-scenario fixture)", () => {
    const html = renderColumn(500);
    expect(html).toContain("war-column-overflow-banner");
    expect(html).toContain("+ 400 more");
    expect(count(html, 'role="listitem"')).toBe(100);
    expect(html).toContain("Company 99");
    expect(html).not.toContain("Company 100");
    expect(html).not.toContain("Company 499");
  });

  it("renders the empty-column placeholder when count is 0", () => {
    const html = renderColumn(0);
    expect(html).toContain("NO INTEL");
    expect(html).not.toContain("war-column-overflow-banner");
    expect(count(html, 'role="listitem"')).toBe(0);
  });
});
