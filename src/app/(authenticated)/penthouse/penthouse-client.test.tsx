import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PenthouseClient } from "./penthouse-client";
import type { PenthouseScene } from "./penthouse-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const scene: PenthouseScene = {
  stats: {
    totalApplications: 14,
    inPipeline: 10,
    interviews: 3,
    responseRate: 21,
  },
  pipeline: [
    { name: "Saved", count: 2, color: "var(--text-muted)" },
    { name: "Applied", count: 5, color: "var(--info)" },
    { name: "Screen", count: 1, color: "var(--warning)" },
    { name: "Interview", count: 2, color: "var(--gold)" },
    { name: "Offer", count: 0, color: "var(--success)" },
  ],
  activity: [
    {
      id: "activity-1",
      type: "application",
      title: "Investment Analyst Intern",
      description: "Status: applied",
      timestamp: "2h ago",
    },
  ],
  briefing: {
    version: "v2",
    generated_at: "2026-05-08T13:00:00.000Z",
    script:
      "Pipeline moved overnight. One interview needs prep. Two applications are aging.",
    beats: [
      { tone: "steady", text: "Pipeline moved overnight." },
      { tone: "urgent", text: "One interview needs prep." },
      { tone: "warning", text: "Two applications are aging." },
    ],
    mood: "sharp",
    weather_hint: "gold",
  },
  overnightDelta: {
    newApps: 1,
    responses: 1,
    rejections: 0,
    importantEmailCount: 1,
  },
  weather: { delta: 1, label: "gold" },
  timeOfDay: "morning",
  user: {
    userId: "user-1",
    displayName: "Armaan",
    email: "armaan@example.com",
    timezone: "America/New_York",
  },
  dateIso: "2026-05-08",
  recentRejection: false,
  briefingGenerated: true,
};

describe("PenthouseClient", () => {
  it("renders the command-center dashboard immediately, not behind a drawer", () => {
    const html = renderToStaticMarkup(<PenthouseClient scene={scene} />);

    expect(html).toContain("Command center dashboard");
    expect(html).toContain("Since you were gone");
    expect(html).toContain("Pipeline status");
    expect(html).toContain("Open tasks");
    expect(html).toContain("Applications");
    expect(html).not.toContain("Full dashboard");
    expect(html).not.toContain("[briefing_v2]");
  });
});
