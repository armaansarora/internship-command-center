# Creative Production Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a natural-language-triggered Creative Production Engine that guides Tower image, animation, scene, prop, environment, and texture production from brainstorm through approval, generation, cleanup, improvement, QA, promotion, and app integration.

**Architecture:** Add a universal `creative-production` domain layer above the existing character-art pipeline. The new layer owns asset types, studio state, guided phases, housekeeping gates, continuous-improvement gates, recommendations, and operator packets; existing character commands become one adapter inside the larger engine. A project-local skill makes Codex or Claude understand “use the Creative Production Engine” as a strict guided brainstorm-to-execution workflow.

**Parallel wave revision:** The engine now treats every normal creative packet as a coordinator-led fan-out. `npm run art:studio -- --request "<request>"` creates one parent packet and 15 isolated lane prompts by default: 5 agents x 3 waves. Subagents work only inside their own lane roots and should use GPT-5.5 fast mode with extra-high reasoning when available; the coordinator owns merge, review, cleanup, promotion, and app integration.

**Tech Stack:** TypeScript, Vitest, Node `tsx` scripts, existing Sharp-based image QA, existing `.artlab` structure, project-local Superpowers skill docs, Next.js visual asset manifest patterns.

---

## File Structure

- Create `.agents/skills/creative-production-engine/SKILL.md`: natural-language trigger and mandatory workflow for Codex/Claude.
- Create `docs/CREATIVE-PRODUCTION-ENGINE.md`: product/architecture spec for the engine.
- Create `docs/superpowers/plans/2026-05-14-creative-production-engine.md`: this plan.
- Create `src/lib/creative-production/types.ts`: asset kinds, phases, gate names, state contracts.
- Create `src/lib/creative-production/registry.ts`: built-in asset type definitions and phase templates.
- Create `src/lib/creative-production/state.ts`: load/save/initialize `.artlab/studio/state.json`.
- Create `src/lib/creative-production/operator.ts`: decide current state, recommendation, next action packet.
- Create `src/lib/creative-production/housekeeping.ts`: organization and cleanup gate contract.
- Create `src/lib/creative-production/improvement.ts`: continuous-improvement ledger and upgrade triggers.
- Create `src/lib/creative-production/prompts.ts`: guided brainstorm and production prompt builders.
- Create `src/lib/creative-production/index.ts`: exports for tests and scripts.
- Create `scripts/creative-production-engine.ts`: `art:studio` CLI entrypoint.
- Modify `package.json`: add `art:studio`.
- Modify `CLAUDE.md`, `AGENTS.md`, `STRUCTURE.md`, `.artlab/README.md`: point natural-language image/animation work at the engine.
- Add tests:
  - `src/lib/creative-production/registry.test.ts`
  - `src/lib/creative-production/state.test.ts`
  - `src/lib/creative-production/operator.test.ts`
  - `src/lib/creative-production/housekeeping-improvement.test.ts`
  - `src/lib/creative-production/studio-cli.test.ts`
  - extend `src/lib/visual-assets/character-image-operations.test.ts`

---

### Task 1: Define The Universal Creative Production Contract

**Files:**
- Create: `src/lib/creative-production/types.ts`
- Create: `src/lib/creative-production/registry.ts`
- Create: `src/lib/creative-production/index.ts`
- Test: `src/lib/creative-production/registry.test.ts`

- [ ] **Step 1: Write the failing registry test**

```ts
import { describe, expect, it } from "vitest";
import {
  CREATIVE_ASSET_TYPES,
  CREATIVE_PHASES,
  getCreativeAssetTypeDefinition,
} from "./index";

describe("creative production registry", () => {
  it("supports every Tower creative asset type with housekeeping and improvement gates", () => {
    expect(CREATIVE_ASSET_TYPES).toEqual([
      "character",
      "environment",
      "prop",
      "ui-texture",
      "animation",
      "scene",
      "icon-system",
      "marketing-hero",
    ]);

    for (const assetType of CREATIVE_ASSET_TYPES) {
      const definition = getCreativeAssetTypeDefinition(assetType);

      expect(definition.displayName).toBeTruthy();
      expect(definition.outputRoot).toMatch(/^\.artlab\/studio\//);
      expect(definition.productionRoot).toMatch(/^public\//);
      expect(definition.phases.map((phase) => phase.id)).toContain("orient");
      expect(definition.phases.map((phase) => phase.id)).toContain("brainstorm");
      expect(definition.phases.map((phase) => phase.id)).toContain("concept-options");
      expect(definition.phases.map((phase) => phase.id)).toContain("final-review");
      expect(definition.requiredEveryPhaseGates).toEqual(["housekeeping", "continuous-improvement"]);
    }
  });

  it("keeps the canonical phase order strict and shared", () => {
    expect(CREATIVE_PHASES).toEqual([
      "orient",
      "brainstorm",
      "plan",
      "concept-options",
      "approval",
      "production-packet",
      "generation",
      "ingest",
      "qa",
      "final-review",
      "promotion",
      "app-integration",
      "housekeeping",
      "continuous-improvement",
      "next-recommendation",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/creative-production/registry.test.ts`

Expected: FAIL because `src/lib/creative-production` does not exist.

- [ ] **Step 3: Implement the minimal contract**

Create `src/lib/creative-production/types.ts`:

```ts
export const CREATIVE_ASSET_TYPES = [
  "character",
  "environment",
  "prop",
  "ui-texture",
  "animation",
  "scene",
  "icon-system",
  "marketing-hero",
] as const;

export const CREATIVE_PHASES = [
  "orient",
  "brainstorm",
  "plan",
  "concept-options",
  "approval",
  "production-packet",
  "generation",
  "ingest",
  "qa",
  "final-review",
  "promotion",
  "app-integration",
  "housekeeping",
  "continuous-improvement",
  "next-recommendation",
] as const;

export const CREATIVE_EVERY_PHASE_GATES = [
  "housekeeping",
  "continuous-improvement",
] as const;

export type CreativeAssetType = (typeof CREATIVE_ASSET_TYPES)[number];
export type CreativePhaseId = (typeof CREATIVE_PHASES)[number];
export type CreativeEveryPhaseGate = (typeof CREATIVE_EVERY_PHASE_GATES)[number];

export interface CreativePhaseDefinition {
  id: CreativePhaseId;
  label: string;
  owner: "agent" | "script" | "human";
  blocksPromotion: boolean;
}

export interface CreativeAssetTypeDefinition {
  id: CreativeAssetType;
  displayName: string;
  description: string;
  outputRoot: `.artlab/studio/${string}`;
  productionRoot: `public/${string}`;
  manifestStrategy: "visual-assets" | "runtime-motion" | "documented-only";
  phases: CreativePhaseDefinition[];
  requiredEveryPhaseGates: readonly CreativeEveryPhaseGate[];
}
```

Create `src/lib/creative-production/registry.ts`:

```ts
import {
  CREATIVE_ASSET_TYPES,
  CREATIVE_EVERY_PHASE_GATES,
  CREATIVE_PHASES,
  type CreativeAssetType,
  type CreativeAssetTypeDefinition,
  type CreativePhaseDefinition,
} from "./types";

function phase(id: (typeof CREATIVE_PHASES)[number], owner: CreativePhaseDefinition["owner"]): CreativePhaseDefinition {
  return {
    id,
    label: id.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
    owner,
    blocksPromotion: !["next-recommendation"].includes(id),
  };
}

const SHARED_PHASES: CreativePhaseDefinition[] = [
  phase("orient", "agent"),
  phase("brainstorm", "agent"),
  phase("plan", "agent"),
  phase("concept-options", "agent"),
  phase("approval", "human"),
  phase("production-packet", "script"),
  phase("generation", "agent"),
  phase("ingest", "script"),
  phase("qa", "script"),
  phase("final-review", "human"),
  phase("promotion", "script"),
  phase("app-integration", "script"),
  phase("housekeeping", "script"),
  phase("continuous-improvement", "script"),
  phase("next-recommendation", "agent"),
];

const DEFINITIONS: Record<CreativeAssetType, CreativeAssetTypeDefinition> = {
  character: {
    id: "character",
    displayName: "Character",
    description: "Full cast members with identity, outfits, poses, motion profile, and app sprite integration.",
    outputRoot: ".artlab/studio/characters",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  environment: {
    id: "environment",
    displayName: "Environment",
    description: "Floor backgrounds, room views, lighting states, and responsive crops.",
    outputRoot: ".artlab/studio/environments",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  prop: {
    id: "prop",
    displayName: "Prop",
    description: "Transparent objects such as bells, folders, pens, cards, dossiers, devices, and desk items.",
    outputRoot: ".artlab/studio/props",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  "ui-texture": {
    id: "ui-texture",
    displayName: "UI Texture",
    description: "Approved raster surfaces, subtle material textures, dividers, and panel treatments.",
    outputRoot: ".artlab/studio/ui-textures",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  animation: {
    id: "animation",
    displayName: "Animation",
    description: "Motion loops, sprite-state motion, transition treatments, and ambient movement specs.",
    outputRoot: ".artlab/studio/animations",
    productionRoot: "public/art",
    manifestStrategy: "runtime-motion",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  scene: {
    id: "scene",
    displayName: "Scene",
    description: "Composed Tower moments such as onboarding, executive briefings, and floor cutscenes.",
    outputRoot: ".artlab/studio/scenes",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  "icon-system": {
    id: "icon-system",
    displayName: "Icon System",
    description: "Approved custom raster symbols only when lucide or existing UI symbols are insufficient.",
    outputRoot: ".artlab/studio/icon-system",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  "marketing-hero": {
    id: "marketing-hero",
    displayName: "Marketing Hero",
    description: "Public-facing Tower hero, venue, product, and promotional imagery.",
    outputRoot: ".artlab/studio/marketing-hero",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
};

export { CREATIVE_ASSET_TYPES, CREATIVE_PHASES } from "./types";

export function getCreativeAssetTypeDefinition(assetType: CreativeAssetType): CreativeAssetTypeDefinition {
  return DEFINITIONS[assetType];
}

export function listCreativeAssetTypeDefinitions(): CreativeAssetTypeDefinition[] {
  return CREATIVE_ASSET_TYPES.map((assetType) => DEFINITIONS[assetType]);
}
```

Create `src/lib/creative-production/index.ts`:

```ts
export * from "./registry";
export * from "./types";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/creative-production/registry.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/creative-production
git commit -m "feat: define creative production contracts"
```

---

### Task 2: Add Studio State, Inventory, And Recommendation Logic

**Files:**
- Create: `src/lib/creative-production/state.ts`
- Create: `src/lib/creative-production/operator.ts`
- Modify: `src/lib/creative-production/index.ts`
- Test: `src/lib/creative-production/state.test.ts`
- Test: `src/lib/creative-production/operator.test.ts`

- [ ] **Step 1: Write failing state and operator tests**

Create `src/lib/creative-production/state.test.ts`:

```ts
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultCreativeStudioState, saveCreativeStudioState } from "./index";

describe("creative studio state", () => {
  it("initializes durable studio state with Otis and Mara continuity", async () => {
    const state = createDefaultCreativeStudioState();

    expect(state.schemaVersion).toBe("tower-creative-studio-state-v1");
    expect(state.engineVersion).toBe("creative-production-engine-v1");
    expect(state.done).toContain("Otis Vale character pilot promoted");
    expect(state.recommendedNext.assetType).toBe("character");
    expect(state.recommendedNext.name).toBe("Mara Voss");
    expect(state.remaining.some((item) => item.includes("environments"))).toBe(true);
    expect(state.remaining.some((item) => item.includes("animations"))).toBe(true);
  });

  it("saves state as readable JSON", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-studio-state-"));
    const statePath = join(root, "state.json");
    const state = createDefaultCreativeStudioState();

    await saveCreativeStudioState(statePath, state);

    const saved = JSON.parse(readFileSync(statePath, "utf8")) as typeof state;
    expect(saved.schemaVersion).toBe(state.schemaVersion);
    expect(saved.recommendedNext.name).toBe("Mara Voss");
  });
});
```

Create `src/lib/creative-production/operator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCreativeStudioOrientation } from "./index";

describe("creative studio operator", () => {
  it("summarizes what exists, what is recommended, and what remains", () => {
    const orientation = buildCreativeStudioOrientation();

    expect(orientation.openingQuestion).toBe("What are we adding to The Tower today?");
    expect(orientation.soFar).toContain("Otis Vale character pilot promoted");
    expect(orientation.recommendation).toContain("Mara Voss");
    expect(orientation.remaining).toContain("11 Season 1 character identities");
    expect(orientation.availableAssetTypes).toContain("environment");
    expect(orientation.availableAssetTypes).toContain("animation");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/creative-production/state.test.ts src/lib/creative-production/operator.test.ts`

Expected: FAIL because functions are missing.

- [ ] **Step 3: Implement state and orientation**

Create `src/lib/creative-production/state.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CreativeAssetType } from "./types";

export interface CreativeStudioRecommendation {
  assetType: CreativeAssetType;
  name: string;
  reason: string;
}

export interface CreativeStudioState {
  schemaVersion: "tower-creative-studio-state-v1";
  engineVersion: "creative-production-engine-v1";
  updatedAt: string;
  done: string[];
  active: string[];
  remaining: string[];
  recommendedNext: CreativeStudioRecommendation;
}

export function createDefaultCreativeStudioState(now = new Date().toISOString()): CreativeStudioState {
  return {
    schemaVersion: "tower-creative-studio-state-v1",
    engineVersion: "creative-production-engine-v1",
    updatedAt: now,
    done: [
      "Four Lobby backgrounds preserved",
      "Otis Vale character pilot promoted",
      "Character rendering foundation added",
      "Batch character asset pipeline added",
    ],
    active: [
      "Mara Voss concept-board operator packet staged",
    ],
    remaining: [
      "11 Season 1 character identities",
      "Season 1 outfit, pose, and expression packs",
      "Floor environments beyond Lobby",
      "Props for character and floor storytelling",
      "UI textures and approved raster materials",
      "Animations and ambient motion loops",
      "Scene art for onboarding and floor moments",
      "Marketing hero imagery when product pages need it",
    ],
    recommendedNext: {
      assetType: "character",
      name: "Mara Voss",
      reason: "Mara defines the executive visual language and should set the cast authority benchmark after Otis.",
    },
  };
}

export async function loadCreativeStudioState(path = ".artlab/studio/state.json"): Promise<CreativeStudioState> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as CreativeStudioState;
  } catch {
    return createDefaultCreativeStudioState();
  }
}

export async function saveCreativeStudioState(path: string, state: CreativeStudioState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`);
}
```

Create `src/lib/creative-production/operator.ts`:

```ts
import { CREATIVE_ASSET_TYPES, type CreativeAssetType } from "./types";
import { createDefaultCreativeStudioState } from "./state";

export interface CreativeStudioOrientation {
  openingQuestion: "What are we adding to The Tower today?";
  soFar: string;
  recommendation: string;
  remaining: string;
  availableAssetTypes: readonly CreativeAssetType[];
}

export function buildCreativeStudioOrientation(): CreativeStudioOrientation {
  const state = createDefaultCreativeStudioState();

  return {
    openingQuestion: "What are we adding to The Tower today?",
    soFar: `So far we have done: ${state.done.join("; ")}.`,
    recommendation: `I suggest we do ${state.recommendedNext.name} now because ${state.recommendedNext.reason}`,
    remaining: `Still remaining: ${state.remaining.join("; ")}.`,
    availableAssetTypes: CREATIVE_ASSET_TYPES,
  };
}
```

Modify `src/lib/creative-production/index.ts`:

```ts
export * from "./operator";
export * from "./registry";
export * from "./state";
export * from "./types";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/creative-production/state.test.ts src/lib/creative-production/operator.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/creative-production
git commit -m "feat: add creative studio state"
```

---

### Task 3: Add Mandatory Housekeeping And Continuous-Improvement Gates

**Files:**
- Create: `src/lib/creative-production/housekeeping.ts`
- Create: `src/lib/creative-production/improvement.ts`
- Modify: `src/lib/creative-production/index.ts`
- Test: `src/lib/creative-production/housekeeping-improvement.test.ts`

- [ ] **Step 1: Write failing gate tests**

```ts
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createHousekeepingEntry,
  createImprovementEntry,
  shouldTriggerEngineUpgrade,
  writeJsonlEntry,
} from "./index";

describe("creative production gates", () => {
  it("requires every phase to record organization and cleanup", async () => {
    const entry = createHousekeepingEntry({
      runId: "run-1",
      phase: "brainstorm",
      created: ["concept-board-prompt.md"],
      kept: ["concept-board-prompt.md"],
      archived: [],
      deleted: [],
      notes: "No loose files created.",
    });

    expect(entry.gate).toBe("housekeeping");
    expect(entry.status).toBe("passed");
    expect(entry.created).toEqual(["concept-board-prompt.md"]);
    expect(entry.kept).toEqual(["concept-board-prompt.md"]);
  });

  it("records improvement signals and triggers v2 review when repeated friction appears", async () => {
    const entries = [
      createImprovementEntry({ runId: "a", phase: "generation", category: "manual-step", severity: "medium", finding: "Manual file labeling repeated.", action: "Add ingest label command." }),
      createImprovementEntry({ runId: "b", phase: "generation", category: "manual-step", severity: "medium", finding: "Manual file labeling repeated again.", action: "Upgrade required." }),
      createImprovementEntry({ runId: "c", phase: "qa", category: "quality-failure", severity: "high", finding: "Alpha haloing not caught early.", action: "Add preflight alpha check." }),
    ];

    expect(shouldTriggerEngineUpgrade(entries)).toBe(true);
  });

  it("writes JSONL ledgers for auditability", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-gates-"));
    const ledgerPath = join(root, "improvements.jsonl");
    const entry = createImprovementEntry({
      runId: "run-1",
      phase: "qa",
      category: "slow",
      severity: "low",
      finding: "Review board took too long to inspect.",
      action: "Add thumbnail index.",
    });

    await writeJsonlEntry(ledgerPath, entry);

    expect(readFileSync(ledgerPath, "utf8")).toContain("\"gate\":\"continuous-improvement\"");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/creative-production/housekeeping-improvement.test.ts`

Expected: FAIL because gate helpers are missing.

- [ ] **Step 3: Implement gate helpers**

Create `src/lib/creative-production/housekeeping.ts`:

```ts
import type { CreativePhaseId } from "./types";

export interface HousekeepingEntry {
  gate: "housekeeping";
  status: "passed";
  recordedAt: string;
  runId: string;
  phase: CreativePhaseId;
  created: string[];
  kept: string[];
  archived: string[];
  deleted: string[];
  notes: string;
}

export function createHousekeepingEntry(input: Omit<HousekeepingEntry, "gate" | "status" | "recordedAt">): HousekeepingEntry {
  return {
    gate: "housekeeping",
    status: "passed",
    recordedAt: new Date().toISOString(),
    ...input,
  };
}
```

Create `src/lib/creative-production/improvement.ts`:

```ts
import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CreativePhaseId } from "./types";

export type ImprovementCategory = "slow" | "manual-step" | "error" | "quality-failure" | "confusion" | "rewrite-needed";

export interface ImprovementEntry {
  gate: "continuous-improvement";
  recordedAt: string;
  runId: string;
  phase: CreativePhaseId;
  category: ImprovementCategory;
  severity: "low" | "medium" | "high";
  finding: string;
  action: string;
}

export function createImprovementEntry(input: Omit<ImprovementEntry, "gate" | "recordedAt">): ImprovementEntry {
  return {
    gate: "continuous-improvement",
    recordedAt: new Date().toISOString(),
    ...input,
  };
}

export function shouldTriggerEngineUpgrade(entries: ImprovementEntry[]): boolean {
  const repeatedManualSteps = entries.filter((entry) => entry.category === "manual-step").length >= 2;
  const highSeverity = entries.some((entry) => entry.severity === "high" || entry.category === "rewrite-needed");

  return repeatedManualSteps || highSeverity;
}

export async function writeJsonlEntry(path: string, entry: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(entry)}\n`);
}
```

Modify `src/lib/creative-production/index.ts`:

```ts
export * from "./housekeeping";
export * from "./improvement";
export * from "./operator";
export * from "./registry";
export * from "./state";
export * from "./types";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/creative-production/housekeeping-improvement.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/creative-production
git commit -m "feat: add creative production gates"
```

---

### Task 4: Build `art:studio` Guided Command

**Files:**
- Create: `scripts/creative-production-engine.ts`
- Modify: `package.json`
- Test: `src/lib/creative-production/studio-cli.test.ts`

- [ ] **Step 1: Write failing CLI test**

```ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("art:studio CLI", () => {
  it("prints the guided creative production opening and writes state", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-"));
    const tsx = join(process.cwd(), "node_modules/.bin/tsx");

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("What are we adding to The Tower today?");
    expect(output).toContain("So far we have done");
    expect(output).toContain("I suggest we do Mara Voss");
    expect(output).toContain("Still remaining");
    expect(output).toContain("character, environment, prop, ui-texture, animation, scene, icon-system, marketing-hero");

    const state = JSON.parse(readFileSync(join(root, "state.json"), "utf8")) as { schemaVersion: string };
    expect(state.schemaVersion).toBe("tower-creative-studio-state-v1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/creative-production/studio-cli.test.ts`

Expected: FAIL because script and package command are missing.

- [ ] **Step 3: Implement the CLI**

Create `scripts/creative-production-engine.ts`:

```ts
import { join } from "node:path";
import {
  buildCreativeStudioOrientation,
  createDefaultCreativeStudioState,
  saveCreativeStudioState,
} from "../src/lib/creative-production";

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

async function main(): Promise<void> {
  const stateRoot = flagValue(process.argv.slice(2), "--state-root") ?? ".artlab/studio";
  const state = createDefaultCreativeStudioState();
  const orientation = buildCreativeStudioOrientation();

  await saveCreativeStudioState(join(stateRoot, "state.json"), state);

  console.log(orientation.openingQuestion);
  console.log("");
  console.log(orientation.soFar);
  console.log(orientation.recommendation);
  console.log(orientation.remaining);
  console.log(`Available asset types: ${orientation.availableAssetTypes.join(", ")}`);
  console.log("");
  console.log("Answer in natural language. The engine will convert your answer into a strict production packet after the guided brainstorm.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
```

Modify `package.json` scripts:

```json
"art:studio": "tsx scripts/creative-production-engine.ts"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/creative-production/studio-cli.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/creative-production-engine.ts src/lib/creative-production/studio-cli.test.ts
git commit -m "feat: add creative production studio command"
```

---

### Task 5: Create The Natural-Language Skill Trigger

**Files:**
- Create: `.agents/skills/creative-production-engine/SKILL.md`
- Create: `docs/CREATIVE-PRODUCTION-ENGINE.md`
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `STRUCTURE.md`
- Test: `src/lib/creative-production/skill-docs.test.ts`

- [ ] **Step 1: Write failing skill/doc test**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("creative production natural-language trigger", () => {
  it("teaches agents what Creative Production Engine means", () => {
    const skill = read(".agents/skills/creative-production-engine/SKILL.md");
    const claude = read("CLAUDE.md");
    const agents = read("AGENTS.md");
    const spec = read("docs/CREATIVE-PRODUCTION-ENGINE.md");

    for (const text of [skill, claude, agents, spec]) {
      expect(text).toContain("Creative Production Engine");
      expect(text).toContain("npm run art:studio");
      expect(text).toContain("Housekeeping Gate");
      expect(text).toContain("Continuous Improvement Gate");
    }

    expect(skill).toContain("Trigger phrases");
    expect(skill).toContain("use the creative production engine");
    expect(skill).toContain("brainstorm first");
    expect(skill).toContain("approved for app");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/creative-production/skill-docs.test.ts`

Expected: FAIL because docs do not exist yet.

- [ ] **Step 3: Write the project-local skill**

Create `.agents/skills/creative-production-engine/SKILL.md`:

```md
---
name: creative-production-engine
description: Use when Armaan asks to use the Creative Production Engine, continue image generation, add Tower art, add animation, create assets, generate visuals, improve art pipeline, or make a floor/scene/character/prop feel more immersive.
---

# Creative Production Engine

## Trigger phrases

Use this skill when the user says any close variant of:

- use the creative production engine
- continue generating images
- add Tower art
- make this more immersive
- create an animation
- generate a character, environment, prop, scene, texture, or visual
- build the image pipeline further

## Required workflow

1. Run `npm run art:studio`.
2. Explain the current state in plain language:
   - what has been done
   - what is recommended now
   - what remains
3. Brainstorm first. Ask what Armaan wants to add today and gather the creative brief.
4. Present 2-3 approaches with a recommendation.
5. Create concept options or a concept prompt packet.
6. Wait for the initial direction approval.
7. Build the strict production packet.
8. Execute generation, ingest, QA, review board, promotion, and app integration through scripts.
9. Promote only after the exact phrase `approved for app`.
10. Run the Housekeeping Gate.
11. Run the Continuous Improvement Gate.
12. Recommend the next best action.

## Housekeeping Gate

Every phase must inventory created files, mark what is kept, archive or delete loose junk, update ledgers, and confirm no unapproved asset entered `public/art`.

## Continuous Improvement Gate

Every phase must record slow steps, manual steps, errors, quality failures, confusion, and rewrite-level concerns. Repeated manual friction or high-severity failures require improving the engine before continuing.

## Non-negotiables

- Preserve approved Lobby backgrounds.
- Keep drafts in `.artlab`.
- Keep production manifest gated.
- Do not hide quality warnings.
- Use Superpowers brainstorming before new creative directions and Superpowers implementation skills when executing the approved plan.
```

Create `docs/CREATIVE-PRODUCTION-ENGINE.md` with sections:

```md
# Creative Production Engine

## Purpose

The Creative Production Engine is the Tower-wide system for producing characters, environments, props, UI textures, animations, scenes, icon systems, and marketing hero art.

## Command Surface

- `npm run art:studio`: guided conversational opening and state creation.
- `npm run art:operate`: strict character-art operator packet.
- `npm run art:status`: read-only status.

## Mandatory Gates

### Housekeeping Gate

Every phase inventories files, labels status, cleans loose artifacts, updates ledgers, and blocks unapproved `public/art` writes.

### Continuous Improvement Gate

Every phase records friction, slowness, errors, manual work, QA failures, and rewrite triggers. The engine improves itself when a weakness repeats or becomes severe.

## Human Approval Gates

1. Initial direction approval.
2. Final upload-ready approval using `approved for app`.
```

Modify `CLAUDE.md`, `AGENTS.md`, and `STRUCTURE.md` to include:

```md
When Armaan says "Creative Production Engine" or asks to add/generate Tower visuals, run `npm run art:studio` and follow `.agents/skills/creative-production-engine/SKILL.md`.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/creative-production/skill-docs.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/creative-production-engine docs/CREATIVE-PRODUCTION-ENGINE.md CLAUDE.md AGENTS.md STRUCTURE.md src/lib/creative-production/skill-docs.test.ts
git commit -m "docs: add creative production engine skill"
```

---

### Task 6: Bridge The Existing Character Pipeline Into The Creative Engine

**Files:**
- Create: `src/lib/creative-production/adapters/character-art.ts`
- Modify: `src/lib/creative-production/index.ts`
- Test: `src/lib/creative-production/character-adapter.test.ts`

- [ ] **Step 1: Write failing adapter test**

```ts
import { describe, expect, it } from "vitest";
import { buildCharacterCreativeAdapterSummary } from "./index";

describe("character creative adapter", () => {
  it("exposes existing Otis and Mara character pipeline state to the studio engine", () => {
    const summary = buildCharacterCreativeAdapterSummary();

    expect(summary.assetType).toBe("character");
    expect(summary.completed).toContain("Otis Vale");
    expect(summary.recommendedNext).toContain("Mara Voss");
    expect(summary.commandHints).toContain("npm run art:operate");
    expect(summary.warningCodes).toContain("source-upscaled-to-master");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/creative-production/character-adapter.test.ts`

Expected: FAIL because adapter is missing.

- [ ] **Step 3: Implement adapter**

Create `src/lib/creative-production/adapters/character-art.ts`:

```ts
export interface CharacterCreativeAdapterSummary {
  assetType: "character";
  completed: string[];
  recommendedNext: string;
  commandHints: string[];
  warningCodes: string[];
}

export function buildCharacterCreativeAdapterSummary(): CharacterCreativeAdapterSummary {
  return {
    assetType: "character",
    completed: ["Otis Vale"],
    recommendedNext: "Mara Voss",
    commandHints: ["npm run art:operate", "npm run art:status"],
    warningCodes: ["source-long-edge-below-4096", "source-upscaled-to-master"],
  };
}
```

Modify `src/lib/creative-production/index.ts`:

```ts
export * from "./adapters/character-art";
export * from "./housekeeping";
export * from "./improvement";
export * from "./operator";
export * from "./registry";
export * from "./state";
export * from "./types";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/creative-production/character-adapter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/creative-production
git commit -m "feat: bridge character art into creative studio"
```

---

### Task 7: Full Verification And Handoff

**Files:**
- Modify: `.artlab/README.md`
- Modify: `docs/CHARACTER-IMAGE-OPERATIONS.md`
- Modify: `docs/CHARACTER-IMAGE-SESSION-PROMPT.md`

- [ ] **Step 1: Update handoff docs**

Add this exact guidance to `.artlab/README.md`, `docs/CHARACTER-IMAGE-OPERATIONS.md`, and `docs/CHARACTER-IMAGE-SESSION-PROMPT.md`:

```md
For all future Tower visual work, start with the Creative Production Engine:

```bash
npm run art:studio
```

Use `npm run art:operate` only when the active asset is a Season 1 character and the engine has reached the character-art operator stage.
```

- [ ] **Step 2: Run the focused creative-production tests**

Run:

```bash
npm run test -- \
  src/lib/creative-production/registry.test.ts \
  src/lib/creative-production/state.test.ts \
  src/lib/creative-production/operator.test.ts \
  src/lib/creative-production/housekeeping-improvement.test.ts \
  src/lib/creative-production/studio-cli.test.ts \
  src/lib/creative-production/skill-docs.test.ts \
  src/lib/creative-production/character-adapter.test.ts \
  src/lib/visual-assets/character-image-operations.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run existing art/lobby tests**

Run:

```bash
npm run test -- \
  src/lib/visual-assets/season-one-character-system.test.ts \
  src/lib/visual-assets/character-art-run.test.ts \
  src/lib/visual-assets/manifest.test.ts \
  src/lib/supabase/middleware.public-paths.test.ts \
  src/components/lobby/concierge/OtisCharacter.test.tsx \
  src/components/world/LobbyBackground.assets.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run lint and build**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass. Existing Sentry deprecation warnings are acceptable only if they match the current known warnings from prior builds.

- [ ] **Step 5: Run the studio command manually**

Run:

```bash
npm run art:studio
```

Expected output includes:

```text
What are we adding to The Tower today?
So far we have done
I suggest we do Mara Voss
Still remaining
Available asset types: character, environment, prop, ui-texture, animation, scene, icon-system, marketing-hero
```

- [ ] **Step 6: Commit**

```bash
git add .artlab/README.md docs/CHARACTER-IMAGE-OPERATIONS.md docs/CHARACTER-IMAGE-SESSION-PROMPT.md
git commit -m "docs: route visual work through creative engine"
```

---

## Self-Review

Spec coverage:
- Natural-language trigger: Task 5.
- Guided brainstorm feel: Tasks 2, 4, and 5.
- Command-backed tool, not markdown-only: Task 4.
- Any visual asset type, not only characters: Task 1.
- Organization and cleanup every phase: Task 3.
- Continuous improvement every phase: Task 3.
- Existing character pipeline preserved and reused: Task 6.
- Subagent-driven implementation path: plan header and execution handoff.

Placeholder scan:
- This plan contains no `TBD`, no `TODO`, and no undefined future file paths.

Type consistency:
- `CreativeAssetType`, `CreativePhaseId`, `CreativeStudioState`, `HousekeepingEntry`, and `ImprovementEntry` are introduced before later tasks use them.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-14-creative-production-engine.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using `superpowers:executing-plans`, with checkpoints.

Recommended choice: **Subagent-Driven**.
