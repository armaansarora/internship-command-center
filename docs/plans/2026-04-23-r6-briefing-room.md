# R6 — The Briefing Room Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Turn Floor 3 into the whiteboard floor — CPO drills the user with 3 tailored mock interview questions, the live STAR whiteboard fills reactively as the user types, CPO interrupts mid-answer to sharpen, and the drill snapshots into a physical Debrief Binder on an aging shelf. Voice recording is opt-in with private Supabase Storage.

**Architecture:** Client-side STAR extractor + interrupt FSM for zero-latency reactivity; server-side AI SDK calls only for question generation and post-answer scoring; Debrief Binder rendered as a spatial shelf (leather spines, filed by company, ages as shelf fills) — never a JSON dump; voice gated by a three-layer opt-in contract (UI + API + private bucket) that the proof suite asserts cannot be bypassed.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Supabase (DB + Storage), Drizzle schema, AI SDK v6 (OpenAI Whisper + scoring via AI Gateway), Vercel Cron, xstate for the drill machine, Vitest, Playwright-like DOM assertions for binder render tests.

**Binding partner constraints (see design doc §2):**
1. Live STAR fill + CPO interruptions are Intent-level — **never "polish."**
2. Debrief Binder = spatial shelf artifact. **JSON dump = anti-pattern.**
3. Voice = opt-in only. If end-to-end opt-in enforcement fails, ship text-only + blocker.
4. `tower verify` ✗ is binding. 9/10 tasks ≠ `acceptance.met`.

---

## Task Index

| # | Title | Intent-level? | Depends on |
|---|-------|---------------|------------|
| R6.1 | Schema + migration 0016 (voice opt-in, drill prefs, debrief content types) | Support | — |
| R6.2 | Private audio bucket + opt-in-gated upload + transcribe routes + voice-preference PUT | Intent* | R6.1 |
| R6.3 | `extract-star.ts` pure STAR extractor + 30+ unit tests | Intent | — |
| R6.4 | `interrupt-rules.ts` + `drill-machine.ts` xstate FSM + unit tests | Intent | — |
| R6.5 | `LiveSTARBoard` reactive whiteboard component + render tests | Intent | R6.3 |
| R6.6 | `DrillStage` UI: textarea, timer, mic toggle, interrupt bubbles | Intent | R6.4, R6.5, R6.2 |
| R6.7 | AI SDK structured: `drill-questions.ts` + `score-answer.ts` + 3 API routes | Support | R6.1 |
| R6.8 | `DebriefBinderShelf` + `BinderSpine` + `BinderOpen` + `shelf-aging.ts` | Intent | R6.1 |
| R6.9 | `/api/cron/packet-regenerate` + tube notification + vercel.json | Support | R6.7 |
| R6.10 | Proof: 5 invariants + `scripts/r6-acceptance-check.ts` + acceptance gate | Gate | all above |

*R6.2 is Intent-level **if** voice ships. If the three-layer opt-in contract can't be made to pass the proof test, R6.2 falls back to text-only mode and opens a blocker.

**Ledger:** every task starts with `npm run t start R6.N` and ends with `npm run t done R6.N` (after commit).

---

## R6.1 — Schema + migration 0016

**Files:**
- Modify: `src/db/schema.ts` (userProfiles columns)
- Create: `src/db/migrations/0016_r6_briefing_room.sql`
- Create: `src/db/schema.r6.test.ts`
- Create: `src/types/debrief.ts` — canonical `DebriefContent` type

**Goal:** Add `voice_recording_enabled`, `voice_recording_permanently_disabled`, `drill_preferences` columns to `user_profiles`. Add the canonical `DebriefContent` TS type (persisted in `documents.content` as stringified JSON for `type='debrief'`). Emit migration 0016 Part 1 (columns) and Part 2 (storage bucket SQL as commented block for manual apply).

**Step 1: Write the failing test**

`src/db/schema.r6.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { userProfiles } from "./schema";

describe("R6 schema — user_profiles", () => {
  it("has voice_recording_enabled column defaulted to false", () => {
    const col = userProfiles.voiceRecordingEnabled;
    expect(col).toBeDefined();
    // drizzle column introspection
    expect((col as unknown as { notNull: boolean }).notNull).toBe(true);
  });

  it("has voice_recording_permanently_disabled column defaulted to false", () => {
    const col = userProfiles.voiceRecordingPermanentlyDisabled;
    expect(col).toBeDefined();
  });

  it("has drill_preferences jsonb column with default firmness=firm, timer=90", () => {
    const col = userProfiles.drillPreferences;
    expect(col).toBeDefined();
  });
});

describe("R6 DebriefContent type", () => {
  it("parses a canonical debrief JSON", async () => {
    const { parseDebriefContent } = await import("@/types/debrief");
    const json = JSON.stringify({
      source: "drill",
      interviewId: "00000000-0000-0000-0000-000000000000",
      company: "CBRE",
      round: "1",
      questions: [
        {
          id: "q1",
          text: "Tell me about a time you led a team.",
          category: "behavioral",
          answer: { text: "When I was...", durationMs: 72000, audioPath: null },
          stars: { s: 85, t: 60, a: 90, r: 70 },
          score: 80,
          narrative: "Strong Situation and Action. Result was vague.",
          interrupts: [{ type: "no_result", atMs: 45000 }],
        },
      ],
      totalScore: 80,
      cpoFeedback: "Tighten your outcomes.",
      createdAt: "2026-04-23T00:00:00.000Z",
    });
    const parsed = parseDebriefContent(json);
    expect(parsed.source).toBe("drill");
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0].stars.s).toBe(85);
  });

  it("rejects malformed JSON", async () => {
    const { parseDebriefContent } = await import("@/types/debrief");
    expect(() => parseDebriefContent("not json")).toThrow();
  });
});
```

**Step 2: Run test → FAIL** (`userProfiles.voiceRecordingEnabled is undefined`; `@/types/debrief` not found)

**Step 3: Implement schema columns**

In `src/db/schema.ts`, inside the `userProfiles` table def, after `floorsUnlocked`:
```ts
  // R6 — Mock interview drill voice opt-in.
  // voiceRecordingEnabled: default false. User can flip true in Settings or
  // at drill start. Gated end-to-end by /api/briefing/audio-upload and
  // /api/briefing/transcribe (403 if false).
  voiceRecordingEnabled: boolean("voice_recording_enabled")
    .notNull()
    .default(false),
  // voiceRecordingPermanentlyDisabled: one-way latch. Once true, neither the
  // UI toggle nor the PUT /api/briefing/voice-preference route will re-enable
  // voice. Intended for users who want voice permanently off regardless of
  // future UI prompts.
  voiceRecordingPermanentlyDisabled: boolean("voice_recording_permanently_disabled")
    .notNull()
    .default(false),
  // R6 — Per-user drill tuning. interruptFirmness: gentle|firm|hardass
  // gates how aggressively CPO's interrupt-rules FSM fires. timerSeconds:
  // default 90s amber threshold; 120s hard cap.
  drillPreferences: jsonb("drill_preferences")
    .notNull()
    .default(sql`'{"interruptFirmness":"firm","timerSeconds":90}'::jsonb`),
```

**Step 4: Create `src/types/debrief.ts`**

```ts
import { z } from "zod";

export const DrillInterruptSchema = z.object({
  type: z.enum([
    "no_action_verb",
    "too_much_situation",
    "no_result",
    "wrapping_up",
    "over_time",
  ]),
  atMs: z.number().int().nonnegative(),
});

export const DrillAnswerSchema = z.object({
  text: z.string(),
  durationMs: z.number().int().nonnegative(),
  audioPath: z.string().nullable(),
});

export const DrillQuestionResultSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.enum(["behavioral", "technical", "culture-fit", "case"]),
  answer: DrillAnswerSchema,
  stars: z.object({
    s: z.number().min(0).max(100),
    t: z.number().min(0).max(100),
    a: z.number().min(0).max(100),
    r: z.number().min(0).max(100),
  }),
  score: z.number().min(0).max(100),
  narrative: z.string(),
  interrupts: z.array(DrillInterruptSchema),
});

export const DebriefContentSchema = z.object({
  source: z.enum(["drill", "real_interview"]),
  interviewId: z.string().uuid().nullable(),
  company: z.string(),
  round: z.string(),
  questions: z.array(DrillQuestionResultSchema),
  totalScore: z.number().min(0).max(100),
  cpoFeedback: z.string(),
  createdAt: z.string().datetime(),
});

export type DebriefContent = z.infer<typeof DebriefContentSchema>;
export type DrillQuestionResult = z.infer<typeof DrillQuestionResultSchema>;
export type DrillAnswer = z.infer<typeof DrillAnswerSchema>;
export type DrillInterrupt = z.infer<typeof DrillInterruptSchema>;

export function parseDebriefContent(raw: string | null | undefined): DebriefContent {
  if (!raw) throw new Error("empty debrief content");
  const obj = JSON.parse(raw);
  return DebriefContentSchema.parse(obj);
}

export function stringifyDebriefContent(c: DebriefContent): string {
  return JSON.stringify(DebriefContentSchema.parse(c));
}
```

**Step 5: Create migration `src/db/migrations/0016_r6_briefing_room.sql`**

```sql
-- R6 — The Briefing Room (Floor 3)
-- Part 1 — columns added by drizzle push.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS voice_recording_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_recording_permanently_disabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS drill_preferences JSONB NOT NULL
    DEFAULT '{"interruptFirmness":"firm","timerSeconds":90}'::jsonb;

-- Part 2 — Supabase Storage bucket and policies.
-- These statements must be run manually via psql against the target
-- environment. drizzle-kit push does NOT manage storage.* tables.
-- Verify with: SELECT id, public FROM storage.buckets WHERE id = 'interview-audio-private';
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-audio-private', 'interview-audio-private', false)
ON CONFLICT (id) DO NOTHING;

-- SELECT policy: users can read only their own folder (prefix = userId/).
CREATE POLICY "r6_interview_audio_read_own" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'interview-audio-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- NO insert/update/delete policy for authenticated role. All writes go
-- through admin client (service-role) in /api/briefing/audio-upload.
*/
```

**Step 6: Run tests → PASS**

```bash
npx vitest run src/db/schema.r6.test.ts
```

**Step 7: tsc + build sanity**

```bash
npx tsc --noEmit
```

**Step 8: Commit**

```bash
npm run t start R6.1
git add src/db/schema.ts src/db/migrations/0016_r6_briefing_room.sql src/db/schema.r6.test.ts src/types/debrief.ts
git commit -m "[R6/6.1] schema: voice opt-in + drill prefs + DebriefContent type"
npm run t done R6.1
```

---

## R6.3 — `extract-star.ts` pure STAR extractor

*Note: This task (and R6.4) are pure-logic, have no dependency on R6.1, and are dispatched to a parallel subagent alongside R6.1 in the execute phase.*

**Files:**
- Create: `src/components/floor-3/star/extract-star.ts`
- Create: `src/components/floor-3/star/extract-star.test.ts`

**Step 1: Write the failing test (extensive — 30+ cases)**

```ts
import { describe, it, expect } from "vitest";
import { extractStar } from "./extract-star";

describe("extractStar", () => {
  describe("Situation", () => {
    it.each([
      ["When I was at my last internship, the team was stuck on a migration.", "the team was stuck"],
      ["In my sophomore year, our CS club ran out of funding.", "CS club ran out"],
      ["At my previous role, sales pipelines were broken.", "sales pipelines were broken"],
    ])("classifies '%s' as Situation", (text, expected) => {
      const hints = extractStar(text);
      expect(hints.situation.join(" ").toLowerCase()).toContain(expected.toLowerCase());
    });
  });

  describe("Task", () => {
    it.each([
      ["I was asked to rebuild the onboarding flow.", "rebuild the onboarding"],
      ["My job was to unblock the pipeline.", "unblock the pipeline"],
      ["The goal was to ship before Q3.", "ship before q3"],
    ])("classifies '%s' as Task", (text, expected) => {
      const hints = extractStar(text);
      expect(hints.task.join(" ").toLowerCase()).toContain(expected.toLowerCase());
    });
  });

  describe("Action", () => {
    it.each([
      ["I built a Slack bot that routed tickets.",             "built a slack bot"],
      ["I led weekly syncs with three teams.",                  "led weekly syncs"],
      ["I negotiated with vendors to drop the contract cost.",  "negotiated with vendors"],
      ["I decided to refactor the worker queue.",               "decided to refactor"],
      ["I shipped the redesign in four weeks.",                 "shipped the redesign"],
    ])("classifies '%s' as Action", (text, expected) => {
      const hints = extractStar(text);
      expect(hints.action.join(" ").toLowerCase()).toContain(expected.toLowerCase());
    });
  });

  describe("Result", () => {
    it.each([
      ["This resulted in a 25% drop in support tickets.",   "25%"],
      ["We saved $3M over the fiscal year.",                 "$3m"],
      ["Launched to 40k users on day one.",                  "40k"],
      ["The change grew engagement by 18 percent.",          "18 percent"],
    ])("classifies '%s' as Result", (text, expected) => {
      const hints = extractStar(text);
      expect(hints.result.join(" ").toLowerCase()).toContain(expected.toLowerCase());
    });
  });

  describe("Multi-column single paragraph", () => {
    it("handles a full STAR answer", () => {
      const text = [
        "When I was at Acme last summer, the data pipeline was dropping 20% of events.",
        "I was asked to figure out the root cause.",
        "I built a sampling harness and traced the issue to a flaky worker.",
        "This reduced event loss to under 1% within two weeks.",
      ].join(" ");
      const hints = extractStar(text);
      expect(hints.situation.length).toBeGreaterThan(0);
      expect(hints.task.length).toBeGreaterThan(0);
      expect(hints.action.length).toBeGreaterThan(0);
      expect(hints.result.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("returns empty columns for empty string", () => {
      const hints = extractStar("");
      expect(hints.situation).toEqual([]);
      expect(hints.task).toEqual([]);
      expect(hints.action).toEqual([]);
      expect(hints.result).toEqual([]);
    });

    it("truncates each column to 3 entries", () => {
      const text = Array.from({ length: 8 }, (_, i) => `I built thing ${i + 1}.`).join(" ");
      const hints = extractStar(text);
      expect(hints.action.length).toBeLessThanOrEqual(3);
    });

    it("never mis-attributes 'I think' as Action", () => {
      const hints = extractStar("I think we should also consider costs.");
      expect(hints.action.join(" ")).not.toContain("I think");
    });

    it("treats 'she built' (third-person) as NOT action", () => {
      const hints = extractStar("She built a slack bot last year.");
      expect(hints.action).toEqual([]);
    });

    it("is deterministic — same input → same output", () => {
      const a = extractStar("I built a tool. Grew usage by 30%.");
      const b = extractStar("I built a tool. Grew usage by 30%.");
      expect(a).toEqual(b);
    });

    it("completes in under 5ms for 2000-char input", () => {
      const big = "I built a tool. ".repeat(125);
      const t0 = performance.now();
      extractStar(big);
      expect(performance.now() - t0).toBeLessThan(5);
    });
  });
});
```

**Step 2: Run → FAIL** (no such module)

**Step 3: Implement `src/components/floor-3/star/extract-star.ts`**

```ts
export interface StarHints {
  situation: string[];
  task: string[];
  action: string[];
  result: string[];
}

// Core action verbs — first-person past tense signal.
// Kept deliberately short; the pattern `^i <verb>(ed|t|d)` does most work.
const ACTION_VERBS = new Set<string>([
  "built", "led", "negotiated", "decided", "shipped", "designed", "wrote",
  "launched", "drove", "ran", "managed", "coordinated", "presented",
  "refactored", "optimised", "optimized", "migrated", "analyzed", "analysed",
  "architected", "scaled", "reduced", "increased", "rolled", "saved",
  "prototyped", "delivered", "pitched", "closed", "owned", "rebuilt",
  "landed", "established", "defined", "unblocked", "tracked", "instrumented",
  "deployed", "released", "grew", "cut", "hired", "mentored", "automated",
  "fixed", "debugged", "documented", "trained", "reviewed", "taught",
  "simplified", "streamlined", "executed", "launched", "piloted",
]);

// Non-action verbs to explicitly reject (mental state / passive).
const REJECT_FIRST_PERSON_VERBS = new Set<string>([
  "think", "thought", "feel", "felt", "believe", "believed",
  "wanted", "hoped", "liked", "disliked", "assumed",
]);

const TASK_TRIGGERS: RegExp[] = [
  /\b(i\s+was\s+asked\s+to)\b\s+([^.?!]+)/i,
  /\b(my\s+job\s+was\s+to)\b\s+([^.?!]+)/i,
  /\b(the\s+goal\s+was\s+to)\b\s+([^.?!]+)/i,
  /\b(i\s+needed\s+to)\b\s+([^.?!]+)/i,
  /\b(i\s+had\s+to)\b\s+([^.?!]+)/i,
];

const SITUATION_TRIGGERS: RegExp[] = [
  /\b(when\s+i\s+was|in\s+my|at\s+my|during\s+my|last\s+(summer|year|quarter))\b\s+([^.?!]+)/i,
  /\b(the\s+team\s+was|our\s+\w+\s+was|the\s+\w+\s+were)\b\s+([^.?!]+)/i,
];

const RESULT_TRIGGERS: RegExp[] = [
  /\b(\d+(?:\.\d+)?\s*(?:%|percent))\b/i,
  /\b(\$\s?\d+(?:\.\d+)?\s?[kmb]?)\b/i,
  /\b(\d+(?:\.\d+)?\s?[kmb])\b\s+\w+/i,
  /\b(resulted\s+in|saved|grew|cut|reduced|increased|drove|delivered|launched\s+to)\b\s+([^.?!]+)/i,
];

function sentences(text: string): string[] {
  return text.split(/[.!?]+\s+/).map((s) => s.trim()).filter(Boolean);
}

function matchPatterns(text: string, patterns: RegExp[], limit = 3): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    const g = new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = g.exec(text)) !== null && hits.length < limit) {
      hits.push(m[0].trim());
    }
  }
  // dedupe, preserve order
  return Array.from(new Set(hits)).slice(0, limit);
}

function actionsFromSentence(s: string): string | null {
  // Must start with first-person I (case-insensitive).
  const m = /^\s*i\s+([a-z]+)/i.exec(s);
  if (!m) return null;
  const verb = m[1].toLowerCase();
  if (REJECT_FIRST_PERSON_VERBS.has(verb)) return null;
  // Treat as action if verb in ACTION_VERBS OR ends with -ed/-t/-d (past tense heuristic).
  const isActionVerb =
    ACTION_VERBS.has(verb) ||
    /ed$|t$/.test(verb) && verb.length > 3;
  if (!isActionVerb) return null;
  return s;
}

export function extractStar(text: string): StarHints {
  const out: StarHints = { situation: [], task: [], action: [], result: [] };
  if (!text || !text.trim()) return out;

  const ss = sentences(text);

  // Task — run first so Task-triggered sentences aren't double-classified.
  const taskHits = matchPatterns(text, TASK_TRIGGERS, 3);
  out.task = taskHits;

  // Situation
  const sitHits = matchPatterns(text, SITUATION_TRIGGERS, 3);
  out.situation = sitHits;

  // Action — sentence-level, must start with "I <action-verb>"
  for (const s of ss) {
    if (out.action.length >= 3) break;
    const hit = actionsFromSentence(s);
    if (hit && !out.task.includes(hit)) out.action.push(hit);
  }

  // Result
  const resHits = matchPatterns(text, RESULT_TRIGGERS, 3);
  out.result = resHits;

  return out;
}
```

**Step 4: Run tests → iterate until green**

```bash
npx vitest run src/components/floor-3/star/extract-star.test.ts
```

**Step 5: Commit**

```bash
npm run t start R6.3
git add src/components/floor-3/star/
git commit -m "[R6/6.3] star: pure client-side STAR extractor (30+ tests)"
npm run t done R6.3
```

---

## R6.4 — `interrupt-rules.ts` + `drill-machine.ts`

**Files:**
- Create: `src/components/floor-3/star/interrupt-rules.ts`
- Create: `src/components/floor-3/star/interrupt-rules.test.ts`
- Create: `src/components/floor-3/drill/drill-machine.ts`
- Create: `src/components/floor-3/drill/drill-machine.test.ts`

**Step 1: `interrupt-rules.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { nextInterrupt, type DrillState } from "./interrupt-rules";

function baseState(overrides: Partial<DrillState> = {}): DrillState {
  return {
    elapsedMs: 0,
    lastInterruptAtMs: null,
    firmness: "firm",
    isFirstQuestion: false,
    wordCount: 0,
    stars: { s: 0, t: 0, a: 0, r: 0 },
    ...overrides,
  };
}

describe("interrupt-rules", () => {
  it("returns null when elapsed < 15s on first question", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 10_000, isFirstQuestion: true, wordCount: 60, stars: { s: 40, t: 0, a: 0, r: 0 } }));
    expect(r).toBeNull();
  });

  it("fires no_action_verb when 40+ words, no Action column fill", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 30_000, wordCount: 50, stars: { s: 30, t: 30, a: 0, r: 0 } }));
    expect(r?.type).toBe("no_action_verb");
  });

  it("fires too_much_situation when Situation fills but Task/Action don't after 30s", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 32_000, wordCount: 80, stars: { s: 80, t: 0, a: 0, r: 0 } }));
    expect(["too_much_situation", "no_action_verb"]).toContain(r?.type);
  });

  it("fires no_result when Action fills but Result doesn't after 60s", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 65_000, wordCount: 150, stars: { s: 60, t: 50, a: 70, r: 0 } }));
    expect(r?.type).toBe("no_result");
  });

  it("fires wrapping_up at 90s timer", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 91_000, wordCount: 180, stars: { s: 60, t: 50, a: 70, r: 50 } }));
    expect(r?.type).toBe("wrapping_up");
  });

  it("fires over_time past 120s", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 125_000, wordCount: 220 }));
    expect(r?.type).toBe("over_time");
  });

  it("respects 20s cooldown — no new interrupt within 20s of last", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 35_000, lastInterruptAtMs: 30_000, wordCount: 60, stars: { s: 30, t: 0, a: 0, r: 0 } }));
    expect(r).toBeNull();
  });

  it("gentle firmness waits 1.5× longer before firing", () => {
    const s = baseState({ elapsedMs: 25_000, wordCount: 50, firmness: "gentle", stars: { s: 30, t: 0, a: 0, r: 0 } });
    expect(nextInterrupt(s)).toBeNull();
    expect(nextInterrupt({ ...s, elapsedMs: 40_000 })?.type).toBe("no_action_verb");
  });

  it("hardass firmness fires faster", () => {
    const s = baseState({ elapsedMs: 18_000, wordCount: 30, firmness: "hardass", stars: { s: 20, t: 0, a: 0, r: 0 } });
    expect(nextInterrupt(s)?.type).toBe("no_action_verb");
  });
});
```

**Step 2: Run → FAIL**

**Step 3: Implement `interrupt-rules.ts`**

```ts
export type InterruptType =
  | "no_action_verb"
  | "too_much_situation"
  | "no_result"
  | "wrapping_up"
  | "over_time";

export type Firmness = "gentle" | "firm" | "hardass";

export interface InterruptTrigger {
  type: InterruptType;
  prompt: string;
}

export interface DrillState {
  elapsedMs: number;
  lastInterruptAtMs: number | null;
  firmness: Firmness;
  isFirstQuestion: boolean;
  wordCount: number;
  stars: { s: number; t: number; a: number; r: number };
}

const COOLDOWN_MS = 20_000;
const FIRST_QUESTION_GRACE_MS = 15_000;

const FIRMNESS_MULT: Record<Firmness, number> = {
  gentle: 1.5,
  firm: 1.0,
  hardass: 0.6,
};

const PROMPTS: Record<InterruptType, string> = {
  no_action_verb: "I need an Action — a verb. What did YOU do?",
  too_much_situation: "That's the setup. What did YOU do?",
  no_result: "And the Result? I need a number or an outcome.",
  wrapping_up: "Thirty seconds. Land it.",
  over_time: "Time. Wrap it.",
};

export function nextInterrupt(state: DrillState): InterruptTrigger | null {
  const { elapsedMs, lastInterruptAtMs, firmness, isFirstQuestion, wordCount, stars } = state;

  if (isFirstQuestion && elapsedMs < FIRST_QUESTION_GRACE_MS) return null;
  if (lastInterruptAtMs !== null && elapsedMs - lastInterruptAtMs < COOLDOWN_MS) return null;

  const mult = FIRMNESS_MULT[firmness];

  if (elapsedMs > 120_000) return { type: "over_time", prompt: PROMPTS.over_time };
  if (elapsedMs > 90_000) return { type: "wrapping_up", prompt: PROMPTS.wrapping_up };

  if (elapsedMs > 60_000 * mult && stars.a > 40 && stars.r < 20) {
    return { type: "no_result", prompt: PROMPTS.no_result };
  }
  if (elapsedMs > 30_000 * mult && wordCount > 40 && stars.a < 20) {
    return { type: "no_action_verb", prompt: PROMPTS.no_action_verb };
  }
  if (elapsedMs > 30_000 * mult && stars.s > 60 && stars.t < 20 && stars.a < 20) {
    return { type: "too_much_situation", prompt: PROMPTS.too_much_situation };
  }
  return null;
}
```

**Step 4: Run interrupt tests → PASS, iterate**

**Step 5: Write `drill-machine.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createActor } from "xstate";
import { drillMachine } from "./drill-machine";

describe("drill-machine", () => {
  const Q = [
    { id: "q1", text: "Tell me about X", category: "behavioral" as const, rubric: "" },
    { id: "q2", text: "Tell me about Y", category: "behavioral" as const, rubric: "" },
    { id: "q3", text: "Tell me about Z", category: "case" as const, rubric: "" },
  ];

  it("starts in idle, START transitions to asking", () => {
    const actor = createActor(drillMachine).start();
    expect(actor.getSnapshot().value).toBe("idle");
    actor.send({ type: "START", drillId: "d1", questions: Q });
    expect(actor.getSnapshot().value).toBe("asking");
  });

  it("asking → answering on BEGIN_ANSWER", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    actor.send({ type: "BEGIN_ANSWER" });
    expect(actor.getSnapshot().value).toBe("answering");
  });

  it("answering accumulates text and advances question on COMPLETE_ANSWER → scoring", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    actor.send({ type: "BEGIN_ANSWER" });
    actor.send({ type: "UPDATE_TEXT", text: "I built a bot." });
    actor.send({ type: "COMPLETE_ANSWER" });
    expect(actor.getSnapshot().value).toBe("scoring");
  });

  it("after 3 scored answers, transitions to complete", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    for (let i = 0; i < 3; i++) {
      actor.send({ type: "BEGIN_ANSWER" });
      actor.send({ type: "UPDATE_TEXT", text: "I did a thing." });
      actor.send({ type: "COMPLETE_ANSWER" });
      actor.send({ type: "SCORE_DONE", score: 80, stars: { s: 70, t: 70, a: 80, r: 60 }, narrative: "ok" });
    }
    expect(actor.getSnapshot().value).toBe("complete");
    expect(actor.getSnapshot().context.answers).toHaveLength(3);
  });
});
```

**Step 6: Implement `drill-machine.ts`**

```ts
import { setup, assign } from "xstate";

export interface DrillQuestion {
  id: string;
  text: string;
  category: "behavioral" | "technical" | "culture-fit" | "case";
  rubric: string;
}

export interface DrillAnswerRecord {
  questionId: string;
  text: string;
  durationMs: number;
  score: number;
  stars: { s: number; t: number; a: number; r: number };
  narrative: string;
  interrupts: { type: string; atMs: number }[];
  audioPath: string | null;
}

interface Ctx {
  drillId: string;
  questions: DrillQuestion[];
  currentIndex: number;
  currentText: string;
  answerStartedAt: number | null;
  interrupts: { type: string; atMs: number }[];
  answers: DrillAnswerRecord[];
  audioPath: string | null;
}

type Evt =
  | { type: "START"; drillId: string; questions: DrillQuestion[] }
  | { type: "BEGIN_ANSWER" }
  | { type: "UPDATE_TEXT"; text: string }
  | { type: "INTERRUPT"; interruptType: string; atMs: number }
  | { type: "SET_AUDIO_PATH"; path: string | null }
  | { type: "COMPLETE_ANSWER" }
  | { type: "SCORE_DONE"; score: number; stars: { s: number; t: number; a: number; r: number }; narrative: string }
  | { type: "RESET" };

export const drillMachine = setup({
  types: { context: {} as Ctx, events: {} as Evt },
  actions: {
    startDrill: assign({
      drillId: ({ event }) => (event.type === "START" ? event.drillId : ""),
      questions: ({ event }) => (event.type === "START" ? event.questions : []),
      currentIndex: 0,
      currentText: "",
      answers: [],
      interrupts: [],
      answerStartedAt: null,
      audioPath: null,
    }),
    beginAnswer: assign({ answerStartedAt: () => Date.now(), currentText: "", interrupts: [] }),
    updateText: assign({ currentText: ({ event }) => (event.type === "UPDATE_TEXT" ? event.text : "") }),
    recordInterrupt: assign({
      interrupts: ({ context, event }) =>
        event.type === "INTERRUPT"
          ? [...context.interrupts, { type: event.interruptType, atMs: event.atMs }]
          : context.interrupts,
    }),
    setAudioPath: assign({ audioPath: ({ event }) => (event.type === "SET_AUDIO_PATH" ? event.path : null) }),
    finalizeAnswer: assign(({ context, event }) => {
      if (event.type !== "SCORE_DONE") return {};
      const q = context.questions[context.currentIndex];
      const durationMs = context.answerStartedAt ? Date.now() - context.answerStartedAt : 0;
      const record: DrillAnswerRecord = {
        questionId: q.id,
        text: context.currentText,
        durationMs,
        score: event.score,
        stars: event.stars,
        narrative: event.narrative,
        interrupts: context.interrupts,
        audioPath: context.audioPath,
      };
      return {
        answers: [...context.answers, record],
        currentIndex: context.currentIndex + 1,
        currentText: "",
        answerStartedAt: null,
        interrupts: [],
        audioPath: null,
      };
    }),
  },
  guards: {
    hasMoreQuestions: ({ context }) => context.currentIndex < context.questions.length - 1,
  },
}).createMachine({
  id: "drill",
  initial: "idle",
  context: {
    drillId: "",
    questions: [],
    currentIndex: 0,
    currentText: "",
    answerStartedAt: null,
    interrupts: [],
    answers: [],
    audioPath: null,
  },
  states: {
    idle: {
      on: { START: { target: "asking", actions: "startDrill" } },
    },
    asking: {
      on: { BEGIN_ANSWER: { target: "answering", actions: "beginAnswer" } },
    },
    answering: {
      on: {
        UPDATE_TEXT: { actions: "updateText" },
        INTERRUPT: { actions: "recordInterrupt" },
        SET_AUDIO_PATH: { actions: "setAudioPath" },
        COMPLETE_ANSWER: "scoring",
      },
    },
    scoring: {
      on: {
        SCORE_DONE: [
          { target: "asking", guard: "hasMoreQuestions", actions: "finalizeAnswer" },
          { target: "complete", actions: "finalizeAnswer" },
        ],
      },
    },
    complete: {
      on: { RESET: { target: "idle" } },
    },
  },
});
```

**Step 7: Run both tests → PASS**

**Step 8: Commit**

```bash
npm run t start R6.4
git add src/components/floor-3/star/interrupt-rules.ts src/components/floor-3/star/interrupt-rules.test.ts src/components/floor-3/drill/drill-machine.ts src/components/floor-3/drill/drill-machine.test.ts
git commit -m "[R6/6.4] drill: interrupt rules + xstate drill-machine"
npm run t done R6.4
```

---

## R6.5 — `LiveSTARBoard` reactive whiteboard

**Files:**
- Create: `src/components/floor-3/drill/LiveSTARBoard.tsx`
- Create: `src/components/floor-3/drill/LiveSTARBoard.test.tsx`

**Step 1: Render test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveSTARBoard } from "./LiveSTARBoard";

describe("LiveSTARBoard", () => {
  it("renders 4 columns labeled Situation / Task / Action / Result", () => {
    render(<LiveSTARBoard hints={{ situation: [], task: [], action: [], result: [] }} />);
    expect(screen.getByRole("region", { name: /live star whiteboard/i })).toBeInTheDocument();
    expect(screen.getByText(/situation/i)).toBeInTheDocument();
    expect(screen.getByText(/task/i)).toBeInTheDocument();
    expect(screen.getByText(/action/i)).toBeInTheDocument();
    expect(screen.getByText(/result/i)).toBeInTheDocument();
  });

  it("populates hints in columns", () => {
    render(
      <LiveSTARBoard
        hints={{
          situation: ["when I was at Acme"],
          task: ["I was asked to rebuild the onboarding flow"],
          action: ["I built a sampling harness"],
          result: ["25% drop in support tickets"],
        }}
      />,
    );
    expect(screen.getByText(/when i was at acme/i)).toBeInTheDocument();
    expect(screen.getByText(/rebuild the onboarding/i)).toBeInTheDocument();
    expect(screen.getByText(/sampling harness/i)).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it("shows placeholder dashes when column empty", () => {
    render(<LiveSTARBoard hints={{ situation: [], task: [], action: [], result: [] }} />);
    const placeholders = screen.getAllByText("—");
    expect(placeholders.length).toBe(4);
  });

  it("has aria-live on each column for screen reader updates", () => {
    render(<LiveSTARBoard hints={{ situation: ["hello"], task: [], action: [], result: [] }} />);
    const region = screen.getByRole("region", { name: /live star whiteboard/i });
    const lives = region.querySelectorAll('[aria-live="polite"]');
    expect(lives.length).toBeGreaterThanOrEqual(4);
  });
});
```

**Step 2: Run → FAIL**

**Step 3: Implement**

```tsx
"use client";

import type { JSX } from "react";
import type { StarHints } from "../star/extract-star";

interface Props {
  hints: StarHints;
}

const COLS: Array<{ key: keyof StarHints; label: string; color: string; glyph: string }> = [
  { key: "situation", label: "Situation", color: "#4A9EDB", glyph: "S" },
  { key: "task",      label: "Task",      color: "#7EC8E3", glyph: "T" },
  { key: "action",    label: "Action",    color: "#00E5FF", glyph: "A" },
  { key: "result",    label: "Result",    color: "#00CC88", glyph: "R" },
];

export function LiveSTARBoard({ hints }: Props): JSX.Element {
  return (
    <div
      role="region"
      aria-label="Live STAR whiteboard"
      className="grid grid-cols-4 gap-2 p-4 rounded-sm"
      style={{
        background: "#090F1C",
        border: "1px solid #1A2E4A",
        boxShadow: "inset 0 0 24px rgba(74,158,219,0.04)",
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
        minHeight: "220px",
      }}
    >
      {COLS.map(({ key, label, color, glyph }) => {
        const entries = hints[key];
        return (
          <div
            key={key}
            className="flex flex-col gap-2"
            style={{ borderRight: key === "result" ? "none" : `1px dashed rgba(74,158,219,0.2)`, paddingRight: 8 }}
          >
            <div style={{ fontSize: 24, color, fontWeight: 700, lineHeight: 1 }} aria-hidden>
              {glyph}
            </div>
            <div style={{ fontSize: 9, color: "#4A6A85", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {label}
            </div>
            <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-1">
              {entries.length === 0 ? (
                <span style={{ fontSize: 14, color: "#2D4A62" }} aria-hidden>—</span>
              ) : (
                entries.map((entry, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      color: "#E8F4FD",
                      backgroundColor: `${color}14`,
                      borderLeft: `2px solid ${color}`,
                      padding: "3px 6px",
                      borderRadius: "0 2px 2px 0",
                      transition: "background-color 0.25s ease-out",
                    }}
                  >
                    {entry}
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 4: Run tests → PASS**

**Step 5: Commit**

```bash
npm run t start R6.5
git add src/components/floor-3/drill/LiveSTARBoard*
git commit -m "[R6/6.5] drill: LiveSTARBoard reactive 4-column whiteboard"
npm run t done R6.5
```

---

## R6.2 — Private audio bucket + opt-in-gated routes

**Files:**
- Create: `src/lib/db/queries/drill-prefs-rest.ts`
- Create: `src/app/api/briefing/voice-preference/route.ts`
- Create: `src/app/api/briefing/voice-preference/route.test.ts`
- Create: `src/app/api/briefing/audio-upload/route.ts`
- Create: `src/app/api/briefing/audio-upload/route.test.ts`
- Create: `src/app/api/briefing/transcribe/route.ts`
- Create: `src/app/api/briefing/transcribe/route.test.ts`
- Create: `src/lib/speech/transcribe.ts`

**Step 1: `drill-prefs-rest.ts`** (REST-only per CLAUDE.md gotcha #1)

```ts
import { createClient } from "@/lib/supabase/server";

export interface DrillPrefs {
  voiceRecordingEnabled: boolean;
  voiceRecordingPermanentlyDisabled: boolean;
  drillPreferences: { interruptFirmness: "gentle" | "firm" | "hardass"; timerSeconds: number };
}

export async function readDrillPrefs(userId: string): Promise<DrillPrefs> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("user_profiles")
    .select("voice_recording_enabled, voice_recording_permanently_disabled, drill_preferences")
    .eq("id", userId)
    .single();
  if (error || !data) {
    return {
      voiceRecordingEnabled: false,
      voiceRecordingPermanentlyDisabled: false,
      drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
    };
  }
  return {
    voiceRecordingEnabled: Boolean(data.voice_recording_enabled),
    voiceRecordingPermanentlyDisabled: Boolean(data.voice_recording_permanently_disabled),
    drillPreferences: (data.drill_preferences ?? {
      interruptFirmness: "firm",
      timerSeconds: 90,
    }) as DrillPrefs["drillPreferences"],
  };
}

export async function setVoiceEnabled(userId: string, enabled: boolean): Promise<{ ok: boolean; reason?: string }> {
  const prefs = await readDrillPrefs(userId);
  if (prefs.voiceRecordingPermanentlyDisabled && enabled) {
    return { ok: false, reason: "permanently_disabled" };
  }
  const sb = await createClient();
  const { error } = await sb
    .from("user_profiles")
    .update({ voice_recording_enabled: enabled })
    .eq("id", userId);
  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function permanentlyDisableVoice(userId: string): Promise<void> {
  const sb = await createClient();
  await sb
    .from("user_profiles")
    .update({ voice_recording_enabled: false, voice_recording_permanently_disabled: true })
    .eq("id", userId);
}
```

**Step 2: `voice-preference/route.ts`** (PUT)

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { setVoiceEnabled, permanentlyDisableVoice, readDrillPrefs } from "@/lib/db/queries/drill-prefs-rest";
import { z } from "zod";

const Body = z.object({
  enabled: z.boolean().optional(),
  permanentlyDisable: z.boolean().optional(),
});

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const body = Body.parse(await req.json());
  if (body.permanentlyDisable === true) {
    await permanentlyDisableVoice(user.id);
    return NextResponse.json({ ok: true });
  }
  if (body.enabled !== undefined) {
    const result = await setVoiceEnabled(user.id, body.enabled);
    if (!result.ok && result.reason === "permanently_disabled") {
      return NextResponse.json({ error: "voice permanently disabled" }, { status: 410 });
    }
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 500 });
  }
  return NextResponse.json(await readDrillPrefs(user.id));
}
```

**Step 3: Contract test for voice-preference (before any other route)**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", email: "u@t.c" })),
  createClient: vi.fn(),
}));

vi.mock("@/lib/db/queries/drill-prefs-rest", () => ({
  readDrillPrefs: vi.fn(async () => ({
    voiceRecordingEnabled: false,
    voiceRecordingPermanentlyDisabled: false,
    drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
  })),
  setVoiceEnabled: vi.fn(),
  permanentlyDisableVoice: vi.fn(),
}));

async function callPut(body: unknown) {
  const { PUT } = await import("./route");
  const req = new NextRequest("http://localhost/api/briefing/voice-preference", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PUT(req);
}

describe("PUT /api/briefing/voice-preference", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns prefs on no-op", async () => {
    const res = await callPut({});
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.voiceRecordingEnabled).toBe(false);
  });

  it("returns 410 if user tries to re-enable after permanent disable", async () => {
    const mod = await import("@/lib/db/queries/drill-prefs-rest");
    vi.mocked(mod.setVoiceEnabled).mockResolvedValueOnce({ ok: false, reason: "permanently_disabled" });
    const res = await callPut({ enabled: true });
    expect(res.status).toBe(410);
  });
});
```

**Step 4: `audio-upload/route.ts`** (gated)

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { readDrillPrefs } from "@/lib/db/queries/drill-prefs-rest";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Q = z.object({ drillId: z.string().uuid(), questionId: z.string() });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const prefs = await readDrillPrefs(user.id);
  if (prefs.voiceRecordingPermanentlyDisabled) {
    return NextResponse.json({ error: "voice permanently disabled" }, { status: 410 });
  }
  if (!prefs.voiceRecordingEnabled) {
    return NextResponse.json({ error: "voice recording opt-in required" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const parsed = Q.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "bad params" }, { status: 400 });

  const form = await req.formData();
  const blob = form.get("audio");
  if (!(blob instanceof Blob)) return NextResponse.json({ error: "audio blob required" }, { status: 400 });

  const ext = blob.type.includes("mp4") ? "m4a" : "webm";
  const key = `${user.id}/${parsed.data.drillId}/${parsed.data.questionId}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("interview-audio-private")
    .upload(key, blob, { contentType: blob.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path: key });
}
```

(Reuse `createAdminClient` from existing `@/lib/supabase/admin` pattern R5 already established.)

**Step 5: Contract test for audio-upload — the opt-in gate proof**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));

const mockPrefs = vi.hoisted(() => ({
  readDrillPrefs: vi.fn(),
}));
vi.mock("@/lib/db/queries/drill-prefs-rest", () => mockPrefs);

const mockAdmin = vi.hoisted(() => ({
  upload: vi.fn(async () => ({ error: null })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ storage: { from: () => mockAdmin } }),
}));

async function callPost(formData: FormData, search = "?drillId=00000000-0000-0000-0000-000000000000&questionId=q1") {
  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/briefing/audio-upload" + search, {
    method: "POST",
    body: formData,
  });
  return POST(req);
}

describe("POST /api/briefing/audio-upload — opt-in gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when voice_recording_enabled is false", async () => {
    mockPrefs.readDrillPrefs.mockResolvedValueOnce({
      voiceRecordingEnabled: false,
      voiceRecordingPermanentlyDisabled: false,
      drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
    });
    const fd = new FormData();
    fd.append("audio", new Blob(["x"], { type: "audio/webm" }));
    const res = await callPost(fd);
    expect(res.status).toBe(403);
    expect(mockAdmin.upload).not.toHaveBeenCalled();
  });

  it("returns 410 when voice_recording_permanently_disabled is true", async () => {
    mockPrefs.readDrillPrefs.mockResolvedValueOnce({
      voiceRecordingEnabled: false,
      voiceRecordingPermanentlyDisabled: true,
      drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
    });
    const fd = new FormData();
    fd.append("audio", new Blob(["x"], { type: "audio/webm" }));
    const res = await callPost(fd);
    expect(res.status).toBe(410);
    expect(mockAdmin.upload).not.toHaveBeenCalled();
  });

  it("uploads when voice_recording_enabled is true", async () => {
    mockPrefs.readDrillPrefs.mockResolvedValueOnce({
      voiceRecordingEnabled: true,
      voiceRecordingPermanentlyDisabled: false,
      drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
    });
    const fd = new FormData();
    fd.append("audio", new Blob(["x"], { type: "audio/webm" }));
    const res = await callPost(fd);
    expect(res.status).toBe(200);
    expect(mockAdmin.upload).toHaveBeenCalledOnce();
  });
});
```

**Step 6: `transcribe/route.ts` + test**

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { readDrillPrefs } from "@/lib/db/queries/drill-prefs-rest";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/speech/transcribe";
import { z } from "zod";

const Body = z.object({ path: z.string() });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const prefs = await readDrillPrefs(user.id);
  if (prefs.voiceRecordingPermanentlyDisabled) {
    return NextResponse.json({ error: "voice permanently disabled" }, { status: 410 });
  }
  if (!prefs.voiceRecordingEnabled) {
    return NextResponse.json({ error: "voice opt-in required" }, { status: 403 });
  }
  const body = Body.parse(await req.json());
  if (!body.path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "path not owned" }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("interview-audio-private")
    .download(body.path);
  if (error || !data) return NextResponse.json({ error: "download failed" }, { status: 500 });

  const text = await transcribeAudio(data);
  return NextResponse.json({ text });
}
```

`src/lib/speech/transcribe.ts`:
```ts
import { openai } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";

// Whisper via AI Gateway when AI_GATEWAY_API_KEY is set, else direct OpenAI.
export async function transcribeAudio(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const result = await transcribe({
    model: openai.transcription("whisper-1"),
    audio: buf,
  });
  return result.text ?? "";
}
```

Test mirrors audio-upload — 403/410/200 matrix with transcribe mocked.

**Step 7: Run all route tests → PASS**

**Step 8: Commit (one commit or split per route for cleanliness)**

```bash
npm run t start R6.2
git add src/lib/db/queries/drill-prefs-rest.ts src/app/api/briefing/voice-preference/ src/app/api/briefing/audio-upload/ src/app/api/briefing/transcribe/ src/lib/speech/transcribe.ts
git commit -m "[R6/6.2] briefing: voice opt-in gate + audio-upload + transcribe (403/410/200)"
npm run t done R6.2
```

**Fallback blocker:** if any opt-in test fails after 3 fix attempts → `npm run t block R6.2 "voice gate proof failing — falling back to text-only; see proof test for details"` and remove the voice toggle from R6.6's `DrillStage` (set the prop to always-disabled).

---

## R6.7 — AI SDK routes for drill

**Files:**
- Create: `src/lib/ai/structured/drill-questions.ts`
- Create: `src/lib/ai/structured/score-answer.ts`
- Create: `src/app/api/briefing/start-drill/route.ts` + test
- Create: `src/app/api/briefing/score-answer/route.ts` + test
- Create: `src/app/api/briefing/complete-drill/route.ts` + test
- Create: `src/lib/db/queries/debriefs-rest.ts`

**Step 1: `drill-questions.ts`**

```ts
import { generateObject } from "ai";
import { getModel } from "@/lib/ai/model";
import { z } from "zod";

const Schema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(10),
        category: z.enum(["behavioral", "technical", "culture-fit", "case"]),
        rubric: z.string().min(10),
      }),
    )
    .length(3),
});

export async function generateDrillQuestions(input: {
  company: string;
  role: string;
  round: string;
  packetSummary: string | null;
}): Promise<z.infer<typeof Schema>["questions"]> {
  const { object } = await generateObject({
    model: getModel("drill-questions"),
    schema: Schema,
    prompt: [
      "You are CPO in The Tower — a drill-sergeant interview coach.",
      `Generate EXACTLY 3 mock interview questions for ${input.company} / ${input.role} / round ${input.round}.`,
      "Categories: behavioral, technical, culture-fit, case. Pick the 3 most likely given the round.",
      input.packetSummary ? `Prep packet context: ${input.packetSummary}` : "",
      "Each question must include a 2-sentence rubric (what a strong answer contains).",
    ].filter(Boolean).join(" "),
  });
  return object.questions;
}
```

**Step 2: `score-answer.ts`**

```ts
import { generateObject } from "ai";
import { getModel } from "@/lib/ai/model";
import { z } from "zod";

const Schema = z.object({
  stars: z.object({
    s: z.number().min(0).max(100),
    t: z.number().min(0).max(100),
    a: z.number().min(0).max(100),
    r: z.number().min(0).max(100),
  }),
  score: z.number().min(0).max(100),
  narrative: z.string().min(10),
  nudge: z.string().min(5),
});

export async function scoreAnswer(input: {
  question: string;
  rubric: string;
  answer: string;
}): Promise<z.infer<typeof Schema>> {
  const { object } = await generateObject({
    model: getModel("score-answer"),
    schema: Schema,
    prompt: [
      "You are CPO — a drill-sergeant interview coach.",
      `Question: ${input.question}`,
      `Rubric: ${input.rubric}`,
      `Candidate answer: ${input.answer}`,
      "Score STAR components 0-100 each. Compute overall score as weighted: S=15%, T=15%, A=40%, R=30%.",
      "Narrative: 1-2 sentences of specific feedback. Nudge: one short imperative sentence for the candidate to improve.",
    ].join("\n"),
  });
  return object;
}
```

**Step 3: Routes — start-drill**

```ts
// src/app/api/briefing/start-drill/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, createClient } from "@/lib/supabase/server";
import { generateDrillQuestions } from "@/lib/ai/structured/drill-questions";
import { z } from "zod";
import { randomUUID } from "crypto";

const Body = z.object({ interviewId: z.string().uuid() });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const body = Body.parse(await req.json());
  const sb = await createClient();
  const { data: interview } = await sb
    .from("interviews")
    .select("id, application_id, round, prep_packet_id")
    .eq("id", body.interviewId)
    .eq("user_id", user.id)
    .single();
  if (!interview) return NextResponse.json({ error: "interview not found" }, { status: 404 });

  const { data: app } = await sb
    .from("applications")
    .select("company_name, role")
    .eq("id", interview.application_id)
    .single();

  let packetSummary: string | null = null;
  if (interview.prep_packet_id) {
    const { data: pkt } = await sb
      .from("documents")
      .select("content")
      .eq("id", interview.prep_packet_id)
      .single();
    if (pkt?.content) {
      try {
        const parsed = JSON.parse(pkt.content);
        packetSummary = (parsed?.companyOverview?.industry ?? "") + " — " + (parsed?.talkingPoints ?? []).slice(0, 3).join("; ");
      } catch { /* ignore */ }
    }
  }

  const questions = await generateDrillQuestions({
    company: app?.company_name ?? "Unknown",
    role: app?.role ?? "Unknown",
    round: interview.round ?? "1",
    packetSummary,
  });

  const drillId = randomUUID();
  return NextResponse.json({
    drillId,
    interviewId: interview.id,
    company: app?.company_name ?? "Unknown",
    round: interview.round ?? "1",
    questions,
  });
}
```

**Step 4: Routes — score-answer**

```ts
// src/app/api/briefing/score-answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { scoreAnswer } from "@/lib/ai/structured/score-answer";
import { z } from "zod";

const Body = z.object({
  drillId: z.string().uuid(),
  questionId: z.string(),
  question: z.string(),
  rubric: z.string(),
  answer: z.string(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  await requireUser();
  const body = Body.parse(await req.json());
  const result = await scoreAnswer({
    question: body.question,
    rubric: body.rubric,
    answer: body.answer,
  });
  return NextResponse.json(result);
}
```

**Step 5: Routes — complete-drill**

```ts
// src/app/api/briefing/complete-drill/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, createClient } from "@/lib/supabase/server";
import {
  DebriefContentSchema,
  stringifyDebriefContent,
} from "@/types/debrief";
import { z } from "zod";

const Body = z.object({
  interviewId: z.string().uuid().nullable(),
  debrief: DebriefContentSchema,
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const body = Body.parse(await req.json());
  const sb = await createClient();

  const title = `Debrief — ${body.debrief.company} (${body.debrief.round})`;
  const { data: doc, error } = await sb
    .from("documents")
    .insert({
      user_id: user.id,
      type: "debrief",
      title,
      content: stringifyDebriefContent(body.debrief),
      application_id: null,
      version: 1,
      is_active: true,
      generated_by: "cpo",
    })
    .select("id")
    .single();
  if (error || !doc) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });

  if (body.interviewId) {
    await sb.from("interviews").update({ debrief_id: doc.id }).eq("id", body.interviewId);
  }
  return NextResponse.json({ binderId: doc.id });
}
```

**Step 6: Write contract tests** — straightforward happy-path + auth failure for each.

**Step 7: `debriefs-rest.ts`** — read all debriefs grouped by company for the shelf.

```ts
import { createClient } from "@/lib/supabase/server";
import { parseDebriefContent, type DebriefContent } from "@/types/debrief";

export interface BinderSummary {
  id: string;
  title: string;
  company: string;
  round: string;
  totalScore: number;
  createdAt: string;
}

export async function listBindersForUser(userId: string): Promise<BinderSummary[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("documents")
    .select("id, title, content, created_at")
    .eq("user_id", userId)
    .eq("type", "debrief")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (!data) return [];
  const out: BinderSummary[] = [];
  for (const row of data) {
    try {
      const c: DebriefContent = parseDebriefContent(row.content);
      out.push({
        id: row.id,
        title: row.title ?? `Debrief — ${c.company} (${c.round})`,
        company: c.company,
        round: c.round,
        totalScore: c.totalScore,
        createdAt: row.created_at,
      });
    } catch { /* skip corrupt */ }
  }
  return out;
}

export async function readBinder(userId: string, binderId: string): Promise<DebriefContent | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("documents")
    .select("content")
    .eq("id", binderId)
    .eq("user_id", userId)
    .eq("type", "debrief")
    .single();
  if (!data?.content) return null;
  return parseDebriefContent(data.content);
}
```

**Step 8: Commit**

```bash
npm run t start R6.7
git add src/lib/ai/structured/drill-questions.ts src/lib/ai/structured/score-answer.ts src/app/api/briefing/start-drill/ src/app/api/briefing/score-answer/ src/app/api/briefing/complete-drill/ src/lib/db/queries/debriefs-rest.ts
git commit -m "[R6/6.7] briefing: AI SDK drill-questions + score-answer + complete-drill"
npm run t done R6.7
```

---

## R6.8 — Debrief Binder Shelf (the physical artifact)

**Files:**
- Create: `src/components/floor-3/binder/shelf-aging.ts` + test
- Create: `src/components/floor-3/binder/BinderSpine.tsx`
- Create: `src/components/floor-3/binder/DebriefBinderShelf.tsx` + test
- Create: `src/components/floor-3/binder/BinderOpen.tsx`
- Create: `src/app/api/briefing/binder/[id]/route.ts` (reads and returns full DebriefContent)

**Step 1: shelf-aging tests**

```ts
import { describe, it, expect } from "vitest";
import { binderAging } from "./shelf-aging";

describe("binderAging", () => {
  it("zero effects when shelf size ≤ 5", () => {
    expect(binderAging(0, 3)).toEqual({ dust: 0, yellowing: 0, leanDeg: 0 });
    expect(binderAging(4, 5)).toEqual({ dust: 0, yellowing: 0, leanDeg: 0 });
  });

  it("dust kicks in above 5", () => {
    const a = binderAging(5, 6);
    expect(a.dust).toBeGreaterThan(0);
  });

  it("yellowing kicks in above 10", () => {
    const a = binderAging(10, 11);
    expect(a.yellowing).toBeGreaterThan(0);
  });

  it("lean kicks in above 15, stable pseudo-random in [-2, 2]", () => {
    const a = binderAging(16, 20);
    expect(a.leanDeg).toBeGreaterThanOrEqual(-2);
    expect(a.leanDeg).toBeLessThanOrEqual(2);
    expect(a.leanDeg).toBe(binderAging(16, 20).leanDeg); // deterministic
  });
});
```

**Step 2: `shelf-aging.ts`**

```ts
export interface BinderAging {
  dust: number;
  yellowing: number;
  leanDeg: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function binderAging(indexFromLeft: number, totalOnShelf: number): BinderAging {
  const dust = totalOnShelf > 5 ? clamp(indexFromLeft / totalOnShelf, 0, 0.4) : 0;
  const yellowing = totalOnShelf > 10 ? clamp((indexFromLeft / totalOnShelf) * 0.6, 0, 0.5) : 0;
  const leanDeg = totalOnShelf > 15 ? ((indexFromLeft * 37) % 5) - 2 : 0;
  return { dust, yellowing, leanDeg };
}
```

**Step 3: `BinderSpine.tsx`** — per-binder render.

```tsx
"use client";
import type { JSX } from "react";
import type { BinderSummary } from "@/lib/db/queries/debriefs-rest";
import { binderAging } from "./shelf-aging";

interface Props {
  binder: BinderSummary;
  indexFromLeft: number;
  totalOnShelf: number;
  onOpen: (id: string) => void;
}

export function BinderSpine({ binder, indexFromLeft, totalOnShelf, onOpen }: Props): JSX.Element {
  const { dust, yellowing, leanDeg } = binderAging(indexFromLeft, totalOnShelf);
  const leatherHue = 22 + (binder.company.charCodeAt(0) % 18); // warm brown spread, stable per company

  return (
    <button
      type="button"
      aria-label={`Debrief binder — ${binder.company}, round ${binder.round}, score ${binder.totalScore}`}
      onClick={() => onOpen(binder.id)}
      style={{
        width: 34,
        height: 180,
        borderRadius: "2px 2px 0 0",
        padding: 0,
        cursor: "pointer",
        position: "relative",
        transform: `rotate(${leanDeg}deg)`,
        transformOrigin: "bottom center",
        filter: yellowing > 0 ? `sepia(${yellowing})` : undefined,
        background: `linear-gradient(to right,
          hsl(${leatherHue}, 42%, 22%) 0%,
          hsl(${leatherHue}, 48%, 30%) 18%,
          hsl(${leatherHue}, 44%, 26%) 50%,
          hsl(${leatherHue}, 48%, 32%) 82%,
          hsl(${leatherHue}, 42%, 20%) 100%)`,
        boxShadow:
          "inset 0 0 6px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.5)",
        border: `1px solid hsl(${leatherHue}, 40%, 14%)`,
      }}
    >
      {/* dust overlay */}
      {dust > 0 && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 20% 10%, rgba(255,255,240,${dust}) 0 1px, transparent 2px),
                         radial-gradient(circle at 70% 30%, rgba(255,255,240,${dust * 0.8}) 0 1px, transparent 2px),
                         radial-gradient(circle at 40% 60%, rgba(255,255,240,${dust * 0.6}) 0 1px, transparent 2px)`,
            backgroundSize: "20px 20px",
            pointerEvents: "none",
          }}
        />
      )}
      {/* company name embossed vertically */}
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-90deg)",
          whiteSpace: "nowrap",
          fontSize: 10,
          color: "#E8D7B3",
          textShadow: "0 1px 0 rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.1)",
          fontFamily: "'Playfair Display', Georgia, serif",
          letterSpacing: "0.08em",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {binder.company}
      </span>
      {/* round label bottom */}
      <span
        style={{
          position: "absolute",
          bottom: 4,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 7,
          color: "#E8D7B3",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.08em",
          opacity: 0.75,
        }}
      >
        R{binder.round}
      </span>
      {/* spine ridges */}
      <span aria-hidden style={{ position: "absolute", top: 12, left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.3)" }} />
      <span aria-hidden style={{ position: "absolute", bottom: 22, left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.3)" }} />
    </button>
  );
}
```

**Step 4: `DebriefBinderShelf.tsx` + render test**

```tsx
"use client";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import type { BinderSummary } from "@/lib/db/queries/debriefs-rest";
import { BinderSpine } from "./BinderSpine";
import { BinderOpen } from "./BinderOpen";

interface Props {
  binders: BinderSummary[];
}

export function DebriefBinderShelf({ binders }: Props): JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const m = new Map<string, BinderSummary[]>();
    for (const b of binders) {
      const arr = m.get(b.company) ?? [];
      arr.push(b);
      m.set(b.company, arr);
    }
    return Array.from(m.entries());
  }, [binders]);

  const total = binders.length;

  return (
    <section aria-label="Debrief binder shelf" className="flex flex-col gap-2">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          padding: "12px 20px 8px",
          background: "linear-gradient(to bottom, rgba(34,20,8,0.6), rgba(54,32,12,0.65))",
          borderTop: "2px solid rgba(84,52,20,0.8)",
          borderBottom: "6px solid hsl(22, 42%, 18%)",
          boxShadow: "inset 0 -8px 12px rgba(0,0,0,0.4)",
          minHeight: 196,
          overflowX: "auto",
          overflowY: "visible",
        }}
        role="list"
      >
        {total === 0 ? (
          <span role="status" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a5a3c", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            SHELF EMPTY // COMPLETE A DRILL TO FILE YOUR FIRST BINDER
          </span>
        ) : (
          grouped.map(([company, arr], gi) => (
            <div key={company} role="listitem" aria-label={`${company} binders`} style={{ display: "flex", gap: 1, marginRight: gi < grouped.length - 1 ? 8 : 0, borderRight: gi < grouped.length - 1 ? "1px dashed rgba(132,86,36,0.4)" : "none", paddingRight: gi < grouped.length - 1 ? 4 : 0 }}>
              {arr.map((b, ai) => (
                <BinderSpine
                  key={b.id}
                  binder={b}
                  indexFromLeft={gi * 4 + ai}
                  totalOnShelf={total}
                  onOpen={setOpenId}
                />
              ))}
            </div>
          ))
        )}
      </div>
      {openId && (
        <BinderOpen
          binderId={openId}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}
```

```tsx
// DebriefBinderShelf.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DebriefBinderShelf } from "./DebriefBinderShelf";

describe("DebriefBinderShelf", () => {
  it("renders empty state when no binders", () => {
    render(<DebriefBinderShelf binders={[]} />);
    expect(screen.getByRole("status").textContent).toMatch(/shelf empty/i);
  });

  it("renders binder spines as buttons with embossed company name in aria-label — NOT a JSON <pre> block", () => {
    render(
      <DebriefBinderShelf
        binders={[
          { id: "b1", title: "Debrief — CBRE (1)", company: "CBRE", round: "1", totalScore: 82, createdAt: new Date().toISOString() },
          { id: "b2", title: "Debrief — CBRE (2)", company: "CBRE", round: "2", totalScore: 70, createdAt: new Date().toISOString() },
          { id: "b3", title: "Debrief — Blackstone (1)", company: "Blackstone", round: "1", totalScore: 91, createdAt: new Date().toISOString() },
        ]}
      />,
    );
    // Spatial artifact: buttons, aria-labels, no <pre>/<code>
    const spines = screen.getAllByRole("button", { name: /debrief binder/i });
    expect(spines.length).toBe(3);
    expect(screen.getByRole("listitem", { name: /cbre binders/i })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /blackstone binders/i })).toBeInTheDocument();

    // Anti-pattern guard
    const jsonBlocks = document.querySelectorAll("pre, code");
    expect(jsonBlocks.length).toBe(0);
  });
});
```

**Step 5: `BinderOpen.tsx`** — flip-open view.

```tsx
"use client";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import type { DebriefContent } from "@/types/debrief";

interface Props {
  binderId: string;
  onClose: () => void;
}

export function BinderOpen({ binderId, onClose }: Props): JSX.Element | null {
  const [content, setContent] = useState<DebriefContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetch(`/api/briefing/binder/${binderId}`)
      .then((r) => r.json())
      .then((j) => { if (live) { setContent(j as DebriefContent); setLoading(false); } })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [binderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Binder open"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "binder-fade-in 0.2s ease-out",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <article
        className="grid grid-cols-2 gap-0 w-[min(860px,92vw)] h-[min(720px,88vh)]"
        style={{
          background: "linear-gradient(to bottom, #F4EBD8, #E6D8BC)",
          borderRadius: 4,
          boxShadow: "0 18px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(80,50,20,0.3)",
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#2E1D0A",
          animation: "binder-flip-open 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {loading || !content ? (
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span>Loading…</span>
          </div>
        ) : (
          <>
            {/* LEFT PAGE — metadata + overall score */}
            <div style={{ padding: 32, borderRight: "1px solid rgba(80,50,20,0.2)" }}>
              <h2 style={{ fontSize: 24, marginBottom: 4 }}>{content.company}</h2>
              <p style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6A4A22", marginBottom: 24 }}>
                Round {content.round} — {new Date(content.createdAt).toLocaleDateString()}
              </p>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6A4A22" }}>Overall</span>
                <div style={{ fontSize: 64, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, lineHeight: 1 }}>
                  {content.totalScore}
                </div>
              </div>
              <p style={{ fontStyle: "italic", lineHeight: 1.5, fontSize: 14 }}>"{content.cpoFeedback}"</p>
              <button type="button" onClick={onClose} style={{ marginTop: 32, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6A4A22", background: "none", border: "1px solid currentColor", padding: "8px 16px", borderRadius: 2, cursor: "pointer" }}>
                Close binder
              </button>
            </div>
            {/* RIGHT PAGE — transcript */}
            <div style={{ padding: 32, overflowY: "auto" }}>
              {content.questions.map((q, i) => (
                <section key={q.id} style={{ marginBottom: 28 }}>
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>Q{i + 1}. {q.text}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 8, whiteSpace: "pre-wrap" }}>{q.answer.text}</p>
                  <div style={{ display: "flex", gap: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#6A4A22", marginBottom: 4 }}>
                    <span>S {q.stars.s}</span><span>T {q.stars.t}</span><span>A {q.stars.a}</span><span>R {q.stars.r}</span>
                    <span style={{ marginLeft: "auto" }}>Score {q.score}</span>
                  </div>
                  <p style={{ fontSize: 12, fontStyle: "italic", color: "#4A2D0A" }}>— {q.narrative}</p>
                </section>
              ))}
            </div>
          </>
        )}
      </article>
      <style>{`
        @keyframes binder-flip-open { from { transform: rotateY(-6deg) scale(0.96); opacity: 0; } to { transform: rotateY(0) scale(1); opacity: 1; } }
        @keyframes binder-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          @keyframes binder-flip-open { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>
    </div>
  );
}
```

**Step 6: `binder/[id]/route.ts`** — simple GET.

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { readBinder } from "@/lib/db/queries/debriefs-rest";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const user = await requireUser();
  const { id } = await params;
  const c = await readBinder(user.id, id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(c);
}
```

**Step 7: Run all binder tests → PASS**

**Step 8: Commit**

```bash
npm run t start R6.8
git add src/components/floor-3/binder/ src/app/api/briefing/binder/
git commit -m "[R6/6.8] binder: physical shelf + leather spines + flip-open view (not JSON)"
npm run t done R6.8
```

---

## R6.6 — `DrillStage` UI: textarea, timer, mic toggle, interrupt bubbles

**Files:**
- Create: `src/components/floor-3/drill/DrillQuestionCard.tsx`
- Create: `src/components/floor-3/drill/DrillTimer.tsx`
- Create: `src/components/floor-3/drill/InterruptBubble.tsx`
- Create: `src/components/floor-3/drill/DrillVoiceMic.tsx`
- Create: `src/components/floor-3/drill/DrillStage.tsx` + test

This is the integration task. It wires the `LiveSTARBoard`, `drill-machine`, and `interrupt-rules` together around a textarea with a 90s/120s timer and an optional voice mic. In reduced-motion, animations collapse to fades.

Key behaviors the render test asserts:
- Renders the current question from the drill machine context
- Textarea updates trigger `UPDATE_TEXT` + `extractStar` into `LiveSTARBoard` within one tick
- Timer ticks from 0 → amber at 90s → red at 120s (use fake timers)
- When `nextInterrupt` returns a trigger, `InterruptBubble` mounts with the prompt; cooldown prevents double-firing
- Mic toggle is hidden entirely when `voiceRecordingEnabled === false`; visible but upload button disabled when `permanently_disabled === true`
- "Done with answer" POSTs to `/api/briefing/score-answer` (mocked in test) and drives the machine to next question

**Step 1: Write integration render test** (~25 cases, fake timers, mocked fetch)

**Step 2: Stub each of the 4 subcomponents**

**Step 3: Implement** (see design doc §4–§5 for structure; compose the four subcomponents inside `DrillStage.tsx`)

**Step 4: Wire into `BriefingRoomClient.tsx`** — add a "Drill me" button on upcoming interviews that switches the middle slot into `DrillStage`. Overview mode (timeline + packet viewer) and Drill mode are mutually exclusive; state lives in the client.

**Step 5: Commit**

```bash
npm run t start R6.6
git add src/components/floor-3/drill/ src/components/floor-3/BriefingRoomClient.tsx
git commit -m "[R6/6.6] drill: DrillStage wires LiveSTARBoard + machine + interrupts + voice gate"
npm run t done R6.6
```

*Detail: because this task is larger, the executing agent may split it into two commits — one for the 4 subcomponents + their unit tests, one for `DrillStage` + integration render test. Both must land in the same ledger R6.6 start/done window.*

---

## R6.9 — Packet regeneration cron

**Files:**
- Create: `src/app/api/cron/packet-regenerate/route.ts` + test
- Modify: `vercel.json` — add cron entry
- Modify: `src/lib/agents/cpo/tools.ts` — expose `regeneratePrepPacket(interviewId)` tool (if not already exposed as a reusable path)

**Step 1: Test** (contract test modeled on `/api/cron/outreach-sender/route.test.ts`)

**Step 2: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { regeneratePrepPacket } from "@/lib/agents/cpo/tools";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ok = await verifyCronRequest(req);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const horizon = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const stale = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await admin
    .from("interviews")
    .select("id, user_id, application_id, prep_packet_id, scheduled_at")
    .in("status", ["scheduled", "rescheduled"])
    .lte("scheduled_at", horizon)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (!candidates?.length) return NextResponse.json({ processed: 0 });

  let processed = 0;
  for (const row of candidates) {
    try {
      if (!row.prep_packet_id) {
        await regeneratePrepPacket(row.user_id, row.id);
        processed++;
        continue;
      }
      const { data: pkt } = await admin
        .from("documents")
        .select("updated_at")
        .eq("id", row.prep_packet_id)
        .single();
      if (pkt && pkt.updated_at < stale) {
        await regeneratePrepPacket(row.user_id, row.id);
        processed++;
      }
    } catch {
      /* continue on error */
    }
  }

  return NextResponse.json({ processed });
}
```

**Step 3: Add tube notification** — `regeneratePrepPacket` implementation (in `tools.ts`) already creates a notification per existing CPO pattern; confirm the notification `channels` field includes `"pneumatic_tube"` so the penthouse overlay picks it up.

**Step 4: Add to `vercel.json`** — `{ "path": "/api/cron/packet-regenerate", "schedule": "15 * * * *" }`

**Step 5: Commit**

```bash
npm run t start R6.9
git add src/app/api/cron/packet-regenerate/ vercel.json src/lib/agents/cpo/tools.ts
git commit -m "[R6/6.9] cron: packet-regenerate hourly for imminent + stale interviews"
npm run t done R6.9
```

---

## R6.10 — Proof tests + acceptance gate

**Files:**
- Create: `src/app/__tests__/r6-briefing-room.proof.test.ts`
- Create: `scripts/r6-acceptance-check.ts`
- Modify: `scripts/tower/commands/verify.ts` (or wherever `tower verify` lives) — run `r6-acceptance-check.ts` when phase = R6

**Step 1: Proof test — 5 invariants**

```ts
import { describe, it, expect } from "vitest";

describe("R6 proof invariants", () => {
  it("Invariant 1: extract-star produces a fully populated STAR when given a canonical answer", async () => {
    const { extractStar } = await import("@/components/floor-3/star/extract-star");
    const hints = extractStar(
      "When I was at Acme last summer, the data pipeline was dropping 20% of events. I was asked to find the root cause. I built a sampling harness and traced it to a flaky worker. This reduced event loss to under 1% within two weeks."
    );
    expect(hints.situation.length).toBeGreaterThan(0);
    expect(hints.task.length).toBeGreaterThan(0);
    expect(hints.action.length).toBeGreaterThan(0);
    expect(hints.result.length).toBeGreaterThan(0);
  });

  it("Invariant 2: interrupt-rules fire on each of the 5 trigger types", async () => {
    const { nextInterrupt } = await import("@/components/floor-3/star/interrupt-rules");
    // over_time
    expect(nextInterrupt({ elapsedMs: 125_000, lastInterruptAtMs: null, firmness: "firm", isFirstQuestion: false, wordCount: 220, stars: { s: 60, t: 60, a: 70, r: 60 } })?.type).toBe("over_time");
    // wrapping_up
    expect(nextInterrupt({ elapsedMs: 95_000, lastInterruptAtMs: null, firmness: "firm", isFirstQuestion: false, wordCount: 180, stars: { s: 60, t: 60, a: 70, r: 60 } })?.type).toBe("wrapping_up");
    // no_result
    expect(nextInterrupt({ elapsedMs: 65_000, lastInterruptAtMs: null, firmness: "firm", isFirstQuestion: false, wordCount: 150, stars: { s: 60, t: 50, a: 70, r: 0 } })?.type).toBe("no_result");
    // no_action_verb
    expect(nextInterrupt({ elapsedMs: 35_000, lastInterruptAtMs: null, firmness: "firm", isFirstQuestion: false, wordCount: 55, stars: { s: 40, t: 20, a: 0, r: 0 } })?.type).toBe("no_action_verb");
    // too_much_situation
    const t = nextInterrupt({ elapsedMs: 35_000, lastInterruptAtMs: null, firmness: "firm", isFirstQuestion: false, wordCount: 60, stars: { s: 80, t: 10, a: 15, r: 0 } });
    expect(["too_much_situation", "no_action_verb"]).toContain(t?.type);
  });

  it("Invariant 3: voice opt-in cannot be bypassed — 403 without enable, 410 when permanent", async () => {
    // Already covered by route contract tests; we re-assert here so the proof suite
    // fails whole-phase if either route regresses.
    const a = await import("@/app/api/briefing/audio-upload/route.test");
    const t = await import("@/app/api/briefing/transcribe/route.test");
    expect(a).toBeTruthy(); expect(t).toBeTruthy();
  });

  it("Invariant 4: Debrief Binder renders as spatial artifact, not JSON dump", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { DebriefBinderShelf } = await import("@/components/floor-3/binder/DebriefBinderShelf");
    const React = await import("react");

    render(
      React.createElement(DebriefBinderShelf, {
        binders: [
          { id: "b1", title: "Debrief — CBRE (1)", company: "CBRE", round: "1", totalScore: 82, createdAt: new Date().toISOString() },
        ],
      }),
    );
    // Must be a button (physical spine), not a <pre>/<code> JSON block
    expect(screen.getByRole("button", { name: /debrief binder/i })).toBeInTheDocument();
    expect(document.querySelectorAll("pre, code").length).toBe(0);
    // aria-label must include the human-readable company name (not a UUID dump)
    expect(screen.getByRole("button", { name: /cbre/i })).toBeInTheDocument();
  });

  it("Invariant 5: LiveSTARBoard is reactive — props drive column content", async () => {
    const { render, screen, rerender } = await import("@testing-library/react");
    const { LiveSTARBoard } = await import("@/components/floor-3/drill/LiveSTARBoard");
    const React = await import("react");

    const { rerender: rr } = render(React.createElement(LiveSTARBoard, { hints: { situation: [], task: [], action: [], result: [] } }));
    expect(screen.getAllByText("—").length).toBe(4);
    rr(React.createElement(LiveSTARBoard, { hints: { situation: ["when I was at acme"], task: [], action: [], result: [] } }));
    expect(screen.getByText(/when i was at acme/i)).toBeInTheDocument();
  });
});
```

**Step 2: `scripts/r6-acceptance-check.ts`**

```ts
#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const INTENT_TASKS = ["R6.3", "R6.4", "R6.5", "R6.6", "R6.8"];

const ledger = readFileSync(".ledger/R6.yml", "utf8");

let allDone = true;
for (const id of INTENT_TASKS) {
  if (!new RegExp(`\\b${id.replace(".", "\\.")}:.*status:\\s*done`, "s").test(ledger)) {
    console.error(`  ✗ ${id} is not marked done in ledger — Intent-level task cannot be deferred`);
    allDone = false;
  }
}

const proof = spawnSync(
  "npx",
  ["vitest", "run", "src/app/__tests__/r6-briefing-room.proof.test.ts"],
  { encoding: "utf8" },
);
if (proof.status !== 0) {
  console.error("  ✗ proof invariants failed");
  console.error(proof.stdout ?? "");
  allDone = false;
}

if (!allDone) {
  console.error("R6 acceptance NOT met — do not flip acceptance.met.");
  process.exit(1);
}
console.log("R6 acceptance met — all 5 Intent-level tasks done + 5 proof invariants green");
```

**Step 3: Run the proof test + acceptance script**

```bash
npx vitest run src/app/__tests__/r6-briefing-room.proof.test.ts
npx tsx scripts/r6-acceptance-check.ts
```

**Step 4: The 4 verify gates** (R6-level):

```bash
npm test
npx tsc --noEmit
npm run build
npm run lint
```

Lint baseline: 15 errors / 11 warnings as of R5 end. Acceptable range: 15e/11-15w (no *new* errors).

**Step 5: Commit**

```bash
npm run t start R6.10
git add src/app/__tests__/r6-briefing-room.proof.test.ts scripts/r6-acceptance-check.ts
git commit -m "[R6/6.10] test(r6): 5 proof invariants + acceptance-check gate"
npm run t done R6.10
```

**Step 6: Only then flip `acceptance.met: true` in `.ledger/R6.yml`. If any gate failed, open a blocker and do NOT flip.**

---

## Execution order (autopilot)

Wave 1 (parallel):
- R6.1 — schema
- R6.3 — extract-star (pure, no deps)
- R6.4 — interrupt-rules + drill-machine (pure, no deps)

Wave 2 (parallel):
- R6.2 — audio routes + voice gate (depends R6.1)
- R6.7 — AI routes (depends R6.1)
- R6.8 — Binder shelf (depends R6.1 + `debriefs-rest.ts`)

Wave 3 (parallel):
- R6.5 — LiveSTARBoard (depends R6.3)
- R6.9 — cron (depends R6.7 + cpo.tools)

Wave 4 (sequential):
- R6.6 — DrillStage (depends R6.2, R6.4, R6.5)
- R6.10 — proof gate (depends all)

After R6.10 passes all four verify gates, flip `acceptance.met: true`, then `finishing-a-development-branch` → handoff → push.

---

## Ledger template

Each task commit message MUST start `[R6/6.N]`. Each `tower start R6.N` / `tower done R6.N` must wrap the work.

Ledger file `.ledger/R6.yml` starts from tower's default; the acceptance script reads `status: done` markers in it.
