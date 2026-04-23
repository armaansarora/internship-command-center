import { describe, it, expect, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";
import {
  readAutopilot,
  writeAutopilot,
  advanceAutopilotScope,
  findNextPhaseBrief,
  lintAutopilotState,
} from "./autopilot.js";
import { createFixtureRepo, cleanupFixture } from "../test-helpers.js";

const ROADMAP_WITH_R5_R6 = `
### R5 — The Writing Room (Floor 5)
(brief body)

### R6 — The Briefing Room (Floor 3)
(brief body)

### R7 — The Situation Room (Floor 4)
(brief body)
`;

describe("autopilot state", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("returns null when autopilot.yml absent", async () => {
    repo = await createFixtureRepo();
    expect(await readAutopilot(repo)).toBeNull();
  });

  it("round-trips state", async () => {
    repo = await createFixtureRepo();
    await writeAutopilot(repo, {
      paused: true,
      scope: "R5-only",
      next_phase: "R5",
    });
    const state = await readAutopilot(repo);
    expect(state?.scope).toBe("R5-only");
  });
});

describe("findNextPhaseBrief", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("finds R6 after R5 in the roadmap", async () => {
    repo = await createFixtureRepo({
      "docs/NEXT-ROADMAP.md": ROADMAP_WITH_R5_R6,
    });
    const found = await findNextPhaseBrief(repo, "R5");
    expect(found?.nextPhase).toBe("R6");
    expect(found?.brief).toContain("R6 — The Briefing Room");
  });

  it("returns null when no next phase exists in roadmap", async () => {
    repo = await createFixtureRepo({
      "docs/NEXT-ROADMAP.md": "### R9 — Last\n\n",
    });
    const found = await findNextPhaseBrief(repo, "R9");
    expect(found).toBeNull();
  });
});

describe("lintAutopilotState", () => {
  it("flags ended before started (the R4 bug)", () => {
    const issues = lintAutopilotState({
      started: "2026-04-23T07:14:00.000Z",
      ended: "2026-04-23T06:00:00.000Z",
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("ended");
  });

  it("clean when timestamps are ordered", () => {
    expect(
      lintAutopilotState({
        started: "2026-04-23T07:00:00.000Z",
        ended: "2026-04-23T08:00:00.000Z",
      }),
    ).toEqual([]);
  });

  it("flags malformed scope", () => {
    const issues = lintAutopilotState({ scope: "not-a-scope" });
    expect(issues.find((i) => i.field === "scope")).toBeTruthy();
  });

  it("accepts canonical scope forms", () => {
    expect(lintAutopilotState({ scope: "R5-only" })).toEqual([]);
    expect(lintAutopilotState({ scope: "R3-R7" })).toEqual([]);
    expect(lintAutopilotState({ scope: "all" })).toEqual([]);
  });
});

describe("writeAutopilot refuses invalid state", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("throws on ended-before-started", async () => {
    repo = await createFixtureRepo();
    await expect(
      writeAutopilot(repo, {
        started: "2026-04-23T07:00:00.000Z",
        ended: "2026-04-23T06:00:00.000Z",
      }),
    ).rejects.toThrow(/ended.*before.*started/);
  });
});

describe("advanceAutopilotScope", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("bumps scope + next_phase + records previous outcome", async () => {
    repo = await createFixtureRepo({
      "docs/NEXT-ROADMAP.md": ROADMAP_WITH_R5_R6,
      ".tower/autopilot.yml": YAML.stringify({
        paused: true,
        scope: "R5-only",
        next_phase: "R5",
      }),
    });
    const result = await advanceAutopilotScope(repo, "R5", {
      previousOutcome: "R5 complete — 10/10 tasks",
      carryBlockers: ["R4 B1 — LinkedIn OAuth"],
    });
    expect(result?.nextPhase).toBe("R6");

    const raw = await fs.readFile(
      path.join(repo, ".tower/autopilot.yml"),
      "utf-8",
    );
    const state = YAML.parse(raw);
    expect(state.scope).toBe("R6-only");
    expect(state.next_phase).toBe("R6");
    expect(state.previous_phase).toBe("R5");
    expect(state.previous_outcome).toContain("R5 complete");
    expect(state.paused).toBe(true); // stays paused — user controls trigger
    expect(state.open_blockers_carrying_forward).toContain(
      "R4 B1 — LinkedIn OAuth",
    );
  });

  it("returns null if autopilot.yml absent", async () => {
    repo = await createFixtureRepo({
      "docs/NEXT-ROADMAP.md": ROADMAP_WITH_R5_R6,
    });
    const result = await advanceAutopilotScope(repo, "R5", {
      previousOutcome: "x",
      carryBlockers: [],
    });
    expect(result).toBeNull();
  });

  it("returns null if no next phase in roadmap", async () => {
    repo = await createFixtureRepo({
      "docs/NEXT-ROADMAP.md": "### R9 — Last\n",
      ".tower/autopilot.yml": YAML.stringify({
        paused: true,
        scope: "R9-only",
        next_phase: "R9",
      }),
    });
    const result = await advanceAutopilotScope(repo, "R9", {
      previousOutcome: "x",
      carryBlockers: [],
    });
    expect(result).toBeNull();
  });
});
