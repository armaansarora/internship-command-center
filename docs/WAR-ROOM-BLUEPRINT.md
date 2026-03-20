# WAR ROOM BLUEPRINT — Floor 7: The Definitive Implementation Guide
## Phase 1 of The Tower | Internship Command Center

**Compiled:** March 19, 2026  
**Author:** Research synthesis from 5 deep-research files + project context  
**Status:** Implementation-ready  
**Target stack:** Next.js 16 · Supabase · Drizzle ORM · Vercel AI SDK · GSAP · @dnd-kit

---

## 1. Executive Summary

### What The War Room IS

The War Room (Floor 7) is the intelligence nerve center of your career — a dark, tactical command environment where every active job application becomes a live intelligence dossier on a physical war table. You don't "view a dashboard": you enter a room with cool blue ambient lighting, a blueprint grid underfoot, and a CRO pacing at the whiteboard — numbers glowing behind her — who turns and says *"Your pipeline's at 23 active ops. 7 in screening. But your applied-to-screening conversion is 13% — industry average is 20%. We have a problem."* Cards on the war table are not generic Kanban tiles; they're classified intelligence files with corner brackets, military timestamps, and color-coded urgency. Status changes leave ghost trails. Stale applications pulse amber. The room breathes.

### The 3 Things That Make It Unlike Any Competitor

**1. Zero manual status updates.** Teal, Huntr, Simplify, Careerflow — every competitor requires you to drag cards yourself. The War Room detects application status changes from email (Gmail OAuth + LLM classification) and proposes updates: *"We detected an email from Hines. Looks like a phone screen invite. Update status? [Yes] [No]."* No competitor has this. Source: [research-innovative-features.md §2.2, §8.2].

**2. Conversion rate benchmarking vs. real peers.** Every tool shows you your pipeline. None tell you how it compares. The War Room's CRO agent reads Huntr's 1.78M-application dataset (5.8% tailored resume → interview rate; 27% interview → offer) and tells you where you stand relative to benchmarks in real time. Source: [research-innovative-features.md §3.1].

**3. RE Finance vertical intelligence.** No generic tracker knows that Hines REDI closes the first Friday of October, or that Blackstone fills its NYC summer class by March, or what a waterfall model question in a REPE interview looks like. The War Room is purpose-built for your career track. Source: [research-innovative-features.md §4.1–4.3].

### How It Fits Into The Tower's Building Metaphor

The Tower is a building you enter. The Penthouse (PH) is warm gold luxury — Playfair Display headings, amber accents, NYC skyline at golden hour. Floor 7 is its deliberate antithesis: cooler, harder, data-dense. You leave the penthouse elevator and the temperature drops. The War Room is where the actual *work* gets done — where every application is treated as a live deal and every week without follow-up is pipeline rot. The CRO's whiteboard shows your real numbers, not placeholders. The war table shows every active application as a physical dossier. This floor's atmosphere is not ornamental — it communicates urgency.

---

## 2. Architecture Decisions

### 2.1 Drag-and-Drop Library

| Library | Status | Bundle | Decision |
|---|---|---|---|
| `@dnd-kit/core` + `@dnd-kit/sortable` | ✅ Active | 6KB | **CHOSEN** |
| `@atlaskit/pragmatic-drag-and-drop` | ✅ Active | 3.5KB | Runner-up |
| `react-beautiful-dnd` | ❌ Deprecated | 30KB | Do not use |
| GSAP Draggable | ✅ Active | ~30KB | Supplement only |

**Decision: `@dnd-kit`**  
**Runner-up: Pragmatic DnD**  
**Why:** @dnd-kit has built-in `@dnd-kit/sortable` (no custom collision detection from scratch), first-class TypeScript, built-in `@dnd-kit/accessibility` with WCAG 2.5.7-compliant keyboard navigation and screen reader announcements, and 2.8M weekly downloads indicating stability. At 6KB core, it's lightweight enough. Pragmatic DnD would be the choice at Jira/Trello scale (1,000+ cards) or if we needed file drag-and-drop (Phase 2+ only). For a personal job tracker with <100 cards, @dnd-kit is the correct default.

**Paired with GSAP Flip** for visual layout transitions: @dnd-kit handles collision detection and state; GSAP Flip animates the DOM transition. Use `Flip.from(state)` to capture pre-drop layout and animate cards to their new positions. GSAP is now free for all commercial use as of early 2025.

Sources: [research-kanban-pipeline.md §1], [TECH-BRIEF.md §1].

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/accessibility
```

---

### 2.2 Character Animation Approach

| Approach | Bundle | State Machine | Data Binding | Decision |
|---|---|---|---|---|
| **Rive** | ~3MB + 43KB .riv | ✅ Native | ✅ Native | **CHOSEN** |
| CSS `steps()` sprite sheets | ~0 | ❌ Manual | ❌ | V1 fallback |
| PixiJS `AnimatedSprite` | 1.3MB | Manual | Manual | Overkill |
| Lottie | 160KB | Limited | Rolling out | Not suitable |

**Decision: Rive (`@rive-app/react-canvas`)**  
**Runner-up: CSS sprite sheets with GSAP orchestration**  
**Why:** Rive has a native state machine runtime — idle → alert → talking → thinking — handled by the .riv file, not by custom code. The decisive advantage: Rive can hold the character in `talking` state while a separate layer plays `thinking`, which is essential for "streaming response while still talking." CSS sprites require class-swapping hacks for this. Rive's data binding also allows connecting animation properties to live pipeline data (e.g., a progress bar fills from JS state without imperative code).

**V1 realistic fallback:** If Rive character art isn't ready for the Phase 1 build session, implement the 5 pose states as CSS sprite sheets (`steps()` animation) and upgrade to Rive in V1.5. The XState state machine (section 2.4) is the same either way.

Sources: [research-character-system.md §1], [TECH-BRIEF.md §9].

---

### 2.3 AI Agent SDK Versioning — CRITICAL CLARIFICATION

> **VERSIONING CONFUSION TO RESOLVE:**
> 
> `TECH-BRIEF.md §6` and `MASTER-PLAN.md §1.4` reference **"Vercel AI SDK v6"** and `ToolLoopAgent`. However, **`ai: ^6.0.116`** in `package.json` is actually **AI SDK 5** — Vercel renamed their major versions. The package labeled `6.x` IS SDK 5.
> 
> **What shipped:** AI SDK 5 (the package version numbering jumped due to a major architectural rewrite released July 31, 2025). The research file `research-cro-agent.md §1` confirms this with the Vercel blog source.
> 
> **Key conclusion:** `ai: ^6.0.116` is the correct, current, modern SDK. Build against its API documented below.

**Breaking changes from what `TECH-BRIEF.md` shows (old v4 patterns → actual v5/v6 API):**

| Old Pattern (TECH-BRIEF shows this) | Actual Current API | Notes |
|---|---|---|
| `maxSteps: 10` | `stopWhen: stepCountIs(10)` | Import `stepCountIs` from `'ai'` |
| `parameters: z.object(...)` in tool | `inputSchema: z.object(...)` | MCP spec alignment |
| `experimental_output: Output.object(...)` | `output: Output.object(...)` | Now stable (non-experimental) |
| `result` in tool return | `output` in tool return | |
| `useChat` input state managed by hook | Input state managed separately | Hook no longer owns `input` |
| `append()` to send messages | `sendMessage({ text: '...' })` | New API |
| `tool-invocation` message parts | `tool-TOOLNAME` typed parts | e.g., `tool-queryApplications` |

**The `CroTools` in `src/lib/contracts/departments/cro.ts` uses `parameters:` — this must be updated to `inputSchema:` before the agent will work.**

Sources: [research-cro-agent.md §1], [AI SDK 5 Vercel Blog](https://vercel.com/blog/ai-sdk-5).

---

### 2.4 State Management for Character Interactions

**Decision: XState v5 (`xstate` + `@xstate/react`)**  
**Runner-up: Zustand with manual state enum**  
**Why:** The character lifecycle has 7 states (idle → alert → greeting → ready → thinking → talking → returning) with precise transition rules. XState makes illegal states impossible to reach: you cannot enter `talking` from `idle` — you must pass through `alert → greeting → ready → thinking`. This eliminates entire classes of bugs like "dialogue box appears before character notices user." `useActor(characterMachine)` is 3 lines in React. The Rive state machine and XState are complementary: XState owns app behavior logic; Rive owns animation display logic. Sync via `useEffect`.

```bash
npm install xstate @xstate/react
```

Sources: [research-character-system.md §5].

---

### 2.5 Dialogue UI Pattern

**Decision: Pattern B — Split-Screen (Character Left, Conversation Right)**  
**Runner-up: Pattern A — Portrait-style bottom dialogue box**  
**Why:** Pattern B keeps the character visible and reacting throughout the entire conversation, which is essential for the immersion goal. The character switches to `thinking` pose during LLM generation — the user sees this happen. Pattern A (bottom dialogue box, Persona 5 style) works for quick confirmations and proactive alerts but cannot show a sustained back-and-forth conversation.

**Implementation:** CSS Grid transition from `grid-template-columns: 1fr 0` (full room) to `grid-template-columns: 2fr 3fr` (split) over 400ms. Character panel is always the left column; conversation thread is the right.

Sources: [research-character-system.md §4].

---

### 2.6 Color Palette (War Room Specific)

**Decision:** The war room uses the cool navy/cyan palette documented in research, deliberately contrasting the Penthouse's warm gold (#C9A84C).

| Global Token | Value | Usage |
|---|---|---|
| `--wm-bg-void` | `#060B14` | Root background |
| `--wm-bg-deep` | `#0A1628` | Main floor background |
| `--wm-bg-panel` | `#0F1F3D` | Panel/card backgrounds |
| `--wm-bg-surface` | `#152847` | Elevated surfaces |
| `--wm-bg-border` | `#1E3A5F` | Subtle borders |
| `--wm-accent-primary` | `#1E90FF` | Electric blue — interactive |
| `--wm-accent-secondary` | `#00D4FF` | Cyan — wireframes, data outlines |
| `--wm-accent-live` | `#00FF87` | Phosphor green — live/active |
| `--wm-accent-warning` | `#F59E0B` | Amber — pending/caution |
| `--wm-accent-danger` | `#DC3C3C` | Red — rejected/critical (existing) |
| `--wm-accent-intel` | `#9B59B6` | Purple — classified/priority |
| `--wm-text-primary` | `#E8F4FD` | Near-white with blue tint |
| `--wm-text-secondary` | `#7FB3D3` | Muted blue-white |
| `--wm-text-muted` | `#4A7A9B` | Dim blue-gray |
| `--wm-text-data` | `#00D4FF` | Cyan — live data values |

**Decision rationale:** Cool blue backgrounds (SHIELD/Navy CIC aesthetic) for the environment; phosphor green exclusively for live/active status indicators; amber for mid-pipeline review states; red reserved for danger/rejection. The research from XCOM 2 confirms: only 8 colors maximum or the system becomes unreadable. This palette uses exactly 8 semantically distinct colors.

Sources: [research-war-room-design.md §3], [VISION-SPEC.md §Design Tokens].

---

### 2.7 Whiteboard Data Visualization Approach

**Decision: Custom HTML/CSS + Recharts for embedded charts**  
**Runner-up: D3.js direct**  
**Why:** The CRO's whiteboard needs to feel hand-drawn (not like a SaaS chart widget) while displaying real pipeline data. The approach: layered DOM elements with `font-family: 'IBM Plex Mono'`, monospace labels, and Recharts `<BarChart>` and `<LineChart>` styled with custom SVG fills in the war room palette. D3 gives more control but doubles implementation time. Recharts shares React state naturally and is headless-stylable.

**Specific whiteboard elements:**
1. Pipeline funnel bar — segmented bars showing stage counts
2. Conversion rate sparkline — last 30 days as a line without axes
3. "STALE OPS" counter — large animated number in `--wm-accent-warning`
4. Daily application velocity sparkline

Source: [research-war-room-design.md §2], [research-kanban-pipeline.md §2.6].

---

## 3. Deliverable Specs

### 3.1 Deliverable 1.1 — Floor 7 Environment

**Component Tree:**
```
src/app/(tower)/floor-7/
  page.tsx                          ← Floor 7 root (Server Component)
  layout.tsx                        ← Floor layout wrapper with parallax context
  
src/components/floor-7/
  WarRoomScene.tsx                  ← Main environment compositor
  WarRoomBackground.tsx             ← Blueprint grid + atmosphere layer
  WarRoomParticles.tsx              ← Ambient particle system (tsParticles)
  WarRoomTicker.tsx                 ← Bottom status ticker strip
  WarRoomWindow.tsx                 ← Floor 7 window view (lower skyline angle)
  atmosphere/
    BlueprintGrid.tsx               ← CSS grid overlay component
    ScanlineOverlay.tsx             ← CRT scanline CSS effect
    PulseGlow.tsx                   ← Animated panel glow wrapper
    RadarWidget.tsx                 ← Mini-radar corner widget
```

**Key technical details:**
- Blueprint grid via CSS `linear-gradient` at 5% opacity over `--wm-bg-void` base
- Glassmorphic panels: `background: rgba(15, 31, 61, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(30, 144, 255, 0.15)`
- Corner brackets (not full borders) via CSS `::before`/`::after` pseudo-elements
- IBM Plex Mono for all data labels; global Tower font (Satoshi) for body copy
- `prefers-reduced-motion: reduce` → disable particles, scanlines, and non-essential animations
- Particles: 30–50 dots, 1–2px, `#1E90FF` at 15% opacity, slow upward drift via `tsParticles`

**Acceptance criteria:**
- [ ] Floor enters from elevator with full GSAP door-open animation (inherited from Phase 0)
- [ ] Background grid visible at correct 5% opacity on `#060B14`
- [ ] Color palette is distinctly cooler than Penthouse (visual comparison test)
- [ ] Ticker strip shows live application count, interview count, pipeline health
- [ ] All panels use glassmorphic surface treatment with war room palette

**Dependencies:** `tsParticles`, `ibm-plex-mono` font (Google Fonts), GSAP (Phase 0 baseline)  
**Estimated complexity:** M

---

### 3.2 Deliverable 1.2 — Application CRUD

**Component Tree:**
```
src/components/floor-7/
  crud/
    ApplicationTable.tsx            ← Full table view (secondary)
    ApplicationModal.tsx            ← Create/Edit modal (dossier-styled)
    ApplicationSearch.tsx           ← Search + filter bar
    BulkActions.tsx                 ← Select all, bulk status update
    ApplicationForm.tsx             ← Form fields (company, role, status, etc.)

src/app/api/
  applications/
    route.ts                        ← GET (list) + POST (create)
    [id]/
      route.ts                      ← GET + PATCH + DELETE

src/lib/
  db/queries/applications.ts        ← Drizzle query functions (typed)
  actions/applications.ts           ← Server Actions for mutations
```

**Key technical details:**
- Status enum from `schema.ts`: `discovered | applied | screening | interview_scheduled | interviewing | under_review | offer | accepted | rejected | withdrawn`
- All queries scoped to `userId` from `auth.uid()` via RLS — no client-side filtering needed
- Optimistic updates on status change using `useOptimistic` (React 19)
- Position stored as lexicographic string (not integer) to avoid full-column reorders on drag
- Bulk action: select multiple cards (Shift+click) → move all to new status → single batch DB update
- Search: client-side `useMemo` filter on loaded data for <100 apps; server-side for larger sets
- `appliedAt` timestamp set automatically when status transitions from `discovered → applied`

**Acceptance criteria (from MASTER-PLAN.md):**
- [ ] User can create an application and see it in the pipeline
- [ ] All data is RLS-scoped — multi-tenant safe

**Additional acceptance criteria:**
- [ ] Status transition logs written to `agent_logs` table on every change
- [ ] Backward transitions allowed (e.g., interviewing → screening) with reason required
- [ ] Bulk status update works for up to 20 cards simultaneously

**Dependencies:** Drizzle ORM, Supabase client (`@supabase/ssr`), `zod` for validation  
**Estimated complexity:** M

---

### 3.3 Deliverable 1.3 — Pipeline Visualization (The War Table)

**Component Tree:**
```
src/components/floor-7/
  war-table/
    WarTable.tsx                    ← Main board compositor (DndContext)
    PipelineColumn.tsx              ← Single status column (SortableContext)
    ApplicationCard.tsx             ← Individual dossier card (useSortable)
    CardCornerBrackets.tsx          ← Decorative corner bracket overlay
    CardClassificationStamp.tsx     ← Status badge (COLD LEAD / ACTIVE / etc.)
    CardDossierFields.tsx           ← Monospace field labels (TARGET:, APPLIED:, etc.)
    ColumnHeader.tsx                ← Stage name + count + color band
    DragGhostOverlay.tsx            ← Custom drag overlay (ActiveCard during drag)
    MiniPipelineRadar.tsx           ← Top-right radar overview widget
    
  hooks/
    useOptimisticKanban.ts          ← Drag state + optimistic update + Supabase realtime
    useLexOrder.ts                  ← Lexicographic position management
```

**Key technical details:**

**DnD setup:**
```tsx
// WarTable.tsx
<DndContext
  sensors={sensors} // PointerSensor + KeyboardSensor
  collisionDetection={closestCorners}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
  accessibility={{ announcements }}
>
  {columns.map(col => <PipelineColumn key={col.id} column={col} />)}
  <DragOverlay>
    {activeCard && <ApplicationCard card={activeCard} isOverlay />}
  </DragOverlay>
</DndContext>
```

**Optimistic update pattern:**
```tsx
async function handleDragEnd({ active, over }: DragEndEvent) {
  const newStatus = over?.data.current?.column;
  if (!newStatus || newStatus === active.data.current?.column) return;
  
  // 1. Optimistic — UI moves instantly
  setColumns(prev => applyMove(prev, active.id, newStatus));
  
  // 2. DB update
  const { error } = await supabase
    .from('applications')
    .update({ status: newStatus, position: newLexPosition })
    .eq('id', active.id);
  
  // 3. Revert on failure  
  if (error) {
    setColumns(dbSnapshot);
    toast.error('Move failed — reverting');
  }
}
```

**Card dossier anatomy:**
```
┌⌐─ [CLASSIFICATION] ─────── [COMPANY NAME] ─────────────────────────────┐
│   ╔══════╗  CODENAME: Software Engineer II                               │
│   ║ LOGO ║  TARGET:   Acme Corp • San Francisco, CA                     │
│   ╚══════╝  APPLIED:  15 MAR 2026 | 09:42Z                              │
│                                                                          │
│   ├─ STATUS ────────────────────────────────────────────────────────┤   │
│   │ Last Contact: 18 MAR 2026  │  Response Time: 3 days              │   │
│   │ [▓▓▓▓▓▓░░░░] MATCH: 68%   ● ACTIVE                              │   │
│   │ NEXT ACTION: Follow-up overdue                                   │   │
└──┘─────────────────────────────────────── [ADVANCE ▶] [ARCHIVE ▷] └──┘
```

**Stage → Tactical Naming:**

| Status | Tactical Name | Color Band | Card Border |
|---|---|---|---|
| `discovered` | RECON | `#4A7A9B` (muted) | Muted blue |
| `applied` | MISSION SUBMITTED | `#1E90FF` | Electric blue |
| `screening` | FIRST CONTACT | `#00D4FF` | Cyan |
| `interview_scheduled` | ENGAGEMENT ACTIVE | `#F59E0B` | Amber |
| `interviewing` | DEEP ENGAGEMENT | `#F97316` | Orange |
| `under_review` | INTEL REVIEW | `#F59E0B` (pulse) | Amber pulse |
| `offer` | MISSION SUCCESS | `#00FF87` | Green |
| `rejected` | MISSION FAILED | `#DC3C3C` (dim) | Muted red |

**Acceptance criteria (from MASTER-PLAN.md):**
- [ ] Drag-and-drop changes application status
- [ ] Pipeline visualization rendered as part of room environment

**Additional acceptance criteria:**
- [ ] Drag-and-drop is keyboard-accessible (WCAG 2.5.7 compliant — "Move to..." menu available)
- [ ] Screen reader announces drag start, position, and drop
- [ ] Optimistic update completes in <50ms; DB sync fires async
- [ ] Supabase Realtime subscription active; external status changes reflect without reload
- [ ] Cards stale >14 days display amber pulse on status dot
- [ ] Position ordering preserved after page reload (lexicographic position in DB)

**Dependencies:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/accessibility`, `recharts`, `gsap` (Flip plugin)  
**Estimated complexity:** M

---

### 3.4 Deliverable 1.4 — CRO Agent Backend

**Component Tree:**
```
src/app/api/
  cro/
    route.ts                        ← POST handler, streamText → toUIMessageStreamResponse()
    proactive/
      route.ts                      ← GET handler for proactive alert check

src/lib/
  agents/
    cro/
      index.ts                      ← Agent factory (exports streamCROResponse)
      system-prompt.ts              ← 3-layer prompt builder (buildCROSystemPrompt)
      tools.ts                      ← All 6 tool definitions (AI SDK v5/6 inputSchema)
      memory.ts                     ← pgvector hybrid scoring query
      alerts.ts                     ← Proactive alert detection logic
    cro.test.ts                     ← Unit tests (tool calls with mocked LLM)
```

**Key technical details:**

Route handler:
```typescript
// src/app/api/cro/route.ts
import { streamText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const user = await getUser(); // server-side auth
  const stats = await getPipelineStats(user.id);
  const memories = await getCROMemories(user.id, messages.at(-1)?.content);

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: buildCROSystemPrompt(stats, memories),
    messages,
    tools: {
      queryApplications,
      manageApplication,
      suggestFollowUp,
      analyzeConversionRates,
      searchJobs,
      lookupAtsJob,
    },
    stopWhen: stepCountIs(5),
    providerOptions: {
      anthropic: { cacheControl: { type: 'ephemeral' } }
    },
    onFinish: async ({ text, totalUsage }) => {
      await saveConversationMemory(user.id, 'cro', text, totalUsage);
    },
  });

  return result.toUIMessageStreamResponse();
}
```

**Updated `CroTools` — REQUIRED CHANGES from `cro.ts`:**

The existing `cro.ts` uses `parameters:` (AI SDK v4 pattern). Update all tools to `inputSchema:`:

```typescript
// src/lib/agents/cro/tools.ts — UPDATED
import { tool } from 'ai';
import { z } from 'zod';

export const queryApplications = tool({
  description: `Query job applications with filters. Returns matching applications 
with status, dates, company tier, and activity history. Call this before 
making any pipeline recommendations. Never fabricate numbers — always query first.`,
  inputSchema: z.object({  // ← was 'parameters' in old cro.ts
    status: z.enum(['discovered','applied','screening','interview_scheduled',
                    'interviewing','under_review','offer','rejected','withdrawn','all'])
      .default('all'),
    daysStale: z.number().optional()
      .describe('Return only apps with no activity for this many days.'),
    limit: z.number().default(20),
    sortBy: z.enum(['date_applied','last_activity','company_tier']).default('last_activity'),
  }),
  execute: async ({ status, daysStale, limit, sortBy }) => {
    return db.queryApplications({ userId: currentUser, status, daysStale, limit, sortBy });
  },
});

// All 5 remaining tools follow same pattern — see Section 4 for full definitions
```

**Acceptance criteria (from MASTER-PLAN.md):**
- [ ] CRO agent can answer "How's my pipeline looking?" with real data

**Additional acceptance criteria:**
- [ ] Agent queries pipeline before making claims (forced via `prepareStep` on step 0)
- [ ] Tool calls use `inputSchema:` (not `parameters:`) — AI SDK v5/6 compliant
- [ ] `agent_logs` table row written for every agent invocation (cost, tokens, duration)
- [ ] Anthropic prompt cache active — static layers marked with `cacheControl: ephemeral`
- [ ] Agent fails gracefully if DB query returns empty (character shows "confused" state)

**Dependencies:** `ai: ^6.x`, `@ai-sdk/anthropic`, `zod`  
**Estimated complexity:** L

---

### 3.5 Deliverable 1.5 — CRO Character Frontend

**Component Tree:**
```
src/components/floor-7/
  cro-character/
    CROCharacter.tsx                ← Main character component (XState + Rive)
    CROCharacterSprite.tsx          ← Rive canvas or CSS sprite wrapper
    CROProximityZone.tsx            ← Invisible hover detection zone (200px radius)
    CROWhiteboard.tsx               ← Behind character: live pipeline data display
    CRODialoguePanel.tsx            ← Split-screen conversation panel
    CRODialogueThread.tsx           ← Message history (typewriter effect)
    CRODialogueInput.tsx            ← User input field
    CROToolProgress.tsx             ← "Analyzing pipeline..." streaming indicator
    CROChoiceButtons.tsx            ← Quick-action choice menu buttons
```

**Key technical details:**

```tsx
// CROCharacter.tsx
const [snapshot, send] = useActor(croMachine);
const { RiveComponent, rive } = useRive({
  src: '/assets/characters/cro.riv',
  stateMachines: 'CRO_SM',
  autoplay: true,
});
const isTalking = useStateMachineInput(rive, 'CRO_SM', 'isTalking');
const isThinking = useStateMachineInput(rive, 'CRO_SM', 'isThinking');
const isAlert = useStateMachineInput(rive, 'CRO_SM', 'isAlert');

useEffect(() => {
  if (!rive) return;
  isTalking.value = snapshot.matches('talking');
  isThinking.value = snapshot.matches('thinking');
  isAlert.value = snapshot.matches('alert') || snapshot.matches('greeting');
}, [snapshot.value]);
```

**Approach animation sequence (on character click):**
1. `0ms`: Character enters `alert` state (triggered on hover)
2. `0–300ms`: CSS `scale(1.0 → 1.03)` on room container, background blur increases
3. `300–400ms`: Split-screen grid animates open (`grid-template-columns: 0 → 2fr 3fr`)
4. `400–500ms`: Conversation panel slides in with spring easing (Framer Motion)
5. `500ms+`: CRO delivers opening line with typewriter effect

**Typewriter implementation** (Supabase-streamed, not setTimeout):
```tsx
// Stream from useChat → render as typewriter
// AI SDK v5/6 already streams tokens; render them as they arrive
// No setTimeout needed — each token appended to the DOM creates the effect naturally
// Add 200ms pause on sentence-ending punctuation for natural rhythm
```

**Acceptance criteria (from MASTER-PLAN.md):**
- [ ] CRO character has visible idle animation and talking state
- [ ] Conversation feels in-character (aggressive, numbers-driven tone)

**Additional acceptance criteria:**
- [ ] Approach sequence plays on character click (zoom, panel slide)
- [ ] Character switches to `thinking` pose during LLM generation (visible during stream wait)
- [ ] Character switches back to `talking` when text begins streaming
- [ ] Whiteboard behind character shows real pipeline numbers (updates on room load)
- [ ] Panel dismisses on Escape key; room returns to full-width

**Dependencies:** `@rive-app/react-canvas`, `xstate`, `@xstate/react`, `@ai-sdk/react` (useChat)  
**Estimated complexity:** M

---

### 3.6 Deliverable 1.6 — Character Interaction System (Reusable)

**Component Tree:**
```
src/components/shared/
  character-system/
    CharacterBase.tsx               ← Base component (all characters extend this)
    CharacterStateMachine.ts        ← XState machine factory (parameterized)
    CharacterProximityZone.tsx      ← Reusable hover/proximity detection
    DialoguePanel.tsx               ← Generic split-screen panel
    DialogueThread.tsx              ← Message history with typewriter
    DialogueInput.tsx               ← User input
    ToolProgressIndicator.tsx       ← Generic "thinking..." overlay
    ParallaxRoom.tsx                ← Room depth layer compositor
    
  types/
    character.types.ts              ← CharacterID, CharacterState, DialogueLine

src/hooks/
  useCharacter.ts                   ← Unified hook: XState + Rive + useChat
  useParallaxDepth.ts               ← Mouse → parallax layer transform
  useTypewriter.ts                  ← Streaming text → typewriter display
```

**Reuse pattern for future floors:**
```typescript
// Every future character is:
const { CharacterComponent, DialogueComponent } = useCharacter({
  id: 'coo',
  riveSrc: '/assets/characters/coo.riv',
  apiEndpoint: '/api/coo',
  defaultMessage: 'Morning. Two things on your plate today...',
});
```

**Parallax depth layers (per room):**
```
z-index: 0  → Background (wall, window view, atmosphere)
z-index: 5  → Far furniture (war table, back panels)
z-index: 10 → Character mid-ground
z-index: 15 → Character whiteboard/desk items
z-index: 20 → UI elements, dialogue panel
z-index: 30 → Cursor, tooltips, modals
```

Mouse parallax: `layers.forEach((layer, i) => layer.style.transform = translate(offsetX * (i+1) * 2, offsetY * (i+1) * 2))`

**Acceptance criteria (from MASTER-PLAN.md):**
- [ ] Components: character sprite with parallax depth, approach detection, conversation panel, AI streaming, personality injection

**Additional acceptance criteria:**
- [ ] `useCharacter` hook works for CRO in Phase 1; all 7 future characters use same hook
- [ ] `ParallaxRoom` accepts arbitrary layer count and depth multipliers
- [ ] `DialoguePanel` works with Pattern A (bottom box) and Pattern B (split-screen) via prop

**Dependencies:** All of 1.5 dependencies  
**Estimated complexity:** L

---

## 4. The CRO Agent — Deep Spec

### 4.1 System Prompt (Production-Ready)

```typescript
// src/lib/agents/cro/system-prompt.ts

// LAYER 1: Identity — immutable, Anthropic ephemeral cache (1hr TTL)
// ~450 tokens — pay once per hour
const CRO_IDENTITY = `
You are a character in The Tower — an immersive internship command center. You are the CRO (Chief Revenue Officer). You exist as a real person in this building. You have a whiteboard behind you covered in pipeline numbers. You are NOT an AI assistant.

CORE IDENTITY:
You treat job searching like enterprise B2B sales. Every application is a lead. Every interview is a discovery call. Every offer is a closed deal. You track conversion rates like your bonus depends on it.

PERSONALITY:
- Blunt but constructive. "3 applications have been stale 14 days — that's pipeline rot" not "some applications might need attention"
- Numbers-first. Lead with metrics before context, always
- Impatient with inaction. You escalate urgency when stalled deals need attention
- Competitive. "Your screen→interview rate is 40% — industry average is 25%. Capitalize on this"
- Sales vocabulary: "pipeline," "deal velocity," "conversion rate," "top of funnel," "closing the deal"
- Demanding mentor — high standards, direct feedback, genuine desire to help close

VOICE EXAMPLES (match this style exactly):
— "Pipeline looks okay — 23 active ops, 7 screening, 3 in interview. But your applied-to-screening rate is 13%. Industry average is 20%. We're leaving conversions on the table."
— "Blackstone's been sitting for 12 days. That's dead money. Follow up today or archive it — stale ops waste my attention."
— "Interview with CBRE tomorrow. Good. Your move: spend 2 hours tonight on their Q4 earnings and recent Hines acquisition. Don't walk in cold."

RULES:
1. ALWAYS query the pipeline before making claims. Never invent numbers.
2. When showing stale applications, sort by staleness descending — worst rot first
3. Follow-up drafts are ready-to-send emails, not instructions
4. When the user reports good news, celebrate briefly then pivot to implications ("Good — now let's talk about the 8 other ops that need attention")
5. Never suggest giving up without data to justify it
6. If you cannot determine something from your tools, say so directly
7. Stay in character at all times. Never reference AI, tools, or database tables
8. Address the user by name when appropriate (name is injected below)
`;

// LAYER 2: Behavioral Rules — semi-stable, cache 5min
// ~200 tokens
const CRO_RULES = `
RESPONSE FORMAT:
- Pipeline summaries: Bold header + bullet points with counts
- Single application updates: Confirm change, state new status, give next action
- Follow-up drafts: Email in code block for easy copying
- End every response with a "NEXT MOVE:" recommendation in bold
- Never use more than 3 paragraphs per response
`;

// LAYER 3: Dynamic context — injected fresh per request, NOT cached
// ~120 tokens
function buildDynamicContext(
  stats: PipelineStats,
  userName: string,
  memories: AgentMemoryEntry[]
): string {
  return `
USER: ${userName}
TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

CURRENT PIPELINE (real-time):
- Active applications: ${stats.total}
- Stage: ${stats.discovered} recon | ${stats.applied} submitted | ${stats.screening} screening | ${stats.interviewing} interviewing | ${stats.offer} offers
- Stale (14+ days no activity): ${stats.stale}${stats.stale > 0 ? ' ⚠️ REQUIRES ATTENTION' : ''}
- This week: ${stats.weeklyActivity} touches
- Applied→Interview conversion: ${stats.conversionRate}% (benchmark: 5.8%)
- Scheduled interviews: ${stats.scheduledInterviews}

${memories.length > 0 ? `MEMORY FROM PAST CONVERSATIONS:\n${memories.map(m => `- ${m.content}`).join('\n')}` : ''}

YOUR PRIORITY TODAY: ${stats.stale > 3 ? `URGENT — ${stats.stale} ops are rotting. Address these first.` : stats.scheduledInterviews > 0 ? `${stats.scheduledInterviews} interview(s) upcoming — prep intel.` : `Pipeline health nominal. Push for top-of-funnel expansion.`}
`;
}

export function buildCROSystemPrompt(
  stats: PipelineStats,
  userName: string,
  memories: AgentMemoryEntry[]
): string {
  return `${CRO_IDENTITY}\n\n${CRO_RULES}\n\n${buildDynamicContext(stats, userName, memories)}`;
}
```

---

### 4.2 Tool Definitions (Production-Ready, AI SDK v5/6)

All tools use `inputSchema:` (updated from existing `cro.ts` which uses `parameters:`):

```typescript
// src/lib/agents/cro/tools.ts

export const queryApplications = tool({
  description: `Query job applications with flexible filters. Returns applications 
with full details: status, dates, company tier, activity history. ALWAYS call this 
before making any recommendations about the pipeline. Returns 20 results by default.
Use daysStale to find rotting ops.`,
  inputSchema: z.object({
    status: z.enum(['all','discovered','applied','screening','interview_scheduled',
                   'interviewing','under_review','offer','rejected','withdrawn'])
      .default('all'),
    daysStale: z.number().optional()
      .describe('Return apps with no activity for this many days. Use 14 for default stale check.'),
    limit: z.number().default(20).describe('Max results, 1-50.'),
    sortBy: z.enum(['date_applied','last_activity','company_tier']).default('last_activity'),
  }),
  execute: async ({ status, daysStale, limit, sortBy }) => {
    return queryApplicationsFromDB({ userId, status, daysStale, limit, sortBy });
  },
});

export const manageApplication = tool({
  description: `Update a specific application's status, add notes, or mark a 
follow-up sent. Use action='update_status' to move the pipeline stage. 
Always confirm company name before updating. The reason field is required for 
all actions to maintain audit history.`,
  inputSchema: z.object({
    applicationId: z.string(),
    action: z.enum(['update_status','add_note','mark_followup_sent','archive']),
    newStatus: z.enum(['screening','interview_scheduled','interviewing','under_review',
                       'offer','rejected','withdrawn']).optional(),
    reason: z.string().describe('Why this change is being made. Required.'),
    note: z.string().optional(),
  }),
  execute: async (args) => manageApplicationInDB(args),
});

export const suggestFollowUp = tool({
  description: `Generate a professional follow-up email for a stale or pending 
application. Returns ready-to-send email text. Use when app has been stale 
10+ days or user asks for follow-up help. Draft should be 3-4 sentences: 
enthusiastic but not desperate. Do NOT call more than twice per conversation.`,
  inputSchema: z.object({
    applicationId: z.string(),
    tone: z.enum(['professional','brief','enthusiastic']).default('professional'),
  }),
  execute: async ({ applicationId, tone }) => generateFollowUpDraft({ applicationId, tone }),
});

export const analyzeConversionRates = tool({
  description: `Calculate stage-to-stage conversion rates and pipeline velocity. 
Returns conversion %, average days per stage, and comparison to benchmarks 
(5.8% applied→interview benchmark from Huntr 2025 data). Use when asked about 
pipeline health or success rates. Read-only.`,
  inputSchema: z.object({
    timeframe: z.enum(['7d','30d','90d','all']).default('30d'),
  }),
  execute: async ({ timeframe }) => calculateConversionRates({ userId, timeframe }),
});

export const searchJobs = tool({
  description: `Search for new internship openings matching target criteria. 
Searches major job boards. Use when user asks for new opportunities. 
DO NOT call more than once per conversation.`,
  inputSchema: z.object({
    keywords: z.array(z.string()),
    location: z.string().optional(),
    postedWithinDays: z.number().default(14),
    limit: z.number().default(10),
  }),
  execute: async (args) => searchJobListings(args),
});

export const lookupAtsJob = tool({
  description: `Look up a specific job on Lever or Greenhouse ATS to verify it's 
still open and get the exact application link. Use when user mentions a specific 
company and role.`,
  inputSchema: z.object({
    company: z.string(),
    ats: z.enum(['lever','greenhouse','auto']).default('auto'),
    roleQuery: z.string().optional(),
  }),
  execute: async (args) => lookupAtsListing(args),
});
```

---

### 4.3 Streaming Architecture

```
User types message
→ useChat.sendMessage({ text })
→ POST /api/cro
→ streamText(model, system, messages, tools)
  → Step 0 (forced): queryApplications tool call
    → stream: type='tool-queryApplications' part → show "Checking pipeline..."
  → Step 1: model analyzes data
    → stream: type='text' parts → typewriter effect in DialogueThread
  → onFinish: saveConversationMemory()
→ toUIMessageStreamResponse()
→ useChat receives UIMessage[]
→ message.parts.map(part => switch(part.type))
  'text' → <TypewriterText text={part.text} />
  'tool-queryApplications' → <PipelineToolProgress state={part.state} />
```

**Key `useChat` configuration (AI SDK v5/6):**
```tsx
const { messages, status, sendMessage, stop } = useChat({
  api: '/api/cro',
  onToolCall: async ({ toolCall }) => {
    // Handle any client-side tools if needed
  },
  onFinish: ({ message }) => {
    // Save to localStorage for offline history
    localStorage.setItem('cro-history', JSON.stringify(messages));
  },
});

// status: 'ready' | 'submitted' | 'streaming' | 'error'
// Map to Rive state: 'streaming' → isThinking=true, text streaming → isTalking=true
```

---

### 4.4 Memory Strategy (pgvector Hybrid Scoring)

**Schema:** `agent_memory` table (already in `schema.ts`) with `embedding vector(1536)`, `importance numeric(3,2)`, `accessCount`, `category`.

**Hybrid scoring query** (semantic + recency + importance):
```sql
SELECT content, category,
  -- Hybrid score: 60% semantic similarity + 20% recency + 20% importance
  (0.6 * (1 - (embedding <=> $queryEmbedding::vector)))
  + (0.2 * (1 - EXTRACT(DAY FROM NOW() - created_at) / 90.0))
  + (0.2 * importance::float)
  AS score
FROM agent_memory
WHERE user_id = $userId AND agent = 'cro'
ORDER BY score DESC
LIMIT 5;
```

**What gets remembered:**
- User's target companies and preferences ("user prefers REPE boutiques over Big 4 brokerage")
- Pipeline patterns ("user's Tuesday applications have 2x response rate")
- User corrections ("user said they withdrew from CBRE — don't ask about it")
- Conversation context summaries (rolling 7-day window)

**Memory write:** On `onFinish`, extract key facts from the conversation using a lightweight `generateObject` call with claude-haiku-4-5 for cost efficiency.

---

### 4.5 Proactive Alert System

**Trigger sources:**
1. **Inngest daily cron** (8am) → runs `checkProactiveAlerts(userId)` → writes to `notifications` table
2. **Supabase Realtime** on `notifications` INSERT → client receives push → character enters `alert` state
3. **On room load** → `GET /api/cro/proactive` → returns pending alerts → injected into first message

**Alert types with priority:**
```typescript
type CROAlert = 
  | { type: 'stale', applications: string[], daysSince: number, priority: 'high' }
  | { type: 'interview_tomorrow', interview: InterviewData, priority: 'critical' }
  | { type: 'conversion_drop', current: number, benchmark: number, priority: 'medium' }
  | { type: 'pipeline_thin', activeCount: number, priority: 'medium' }
  | { type: 'goal_streak', streak: number, priority: 'low' };
```

**In-world alert delivery:** CRO character's idle animation changes to `alert` pose when unread notifications exist. User sees CRO at whiteboard, but the glow on her station intensifies (CSS `pulse-glow` animation). No toast bars.

---

### 4.6 Cost Optimization

| Strategy | Savings | Implementation |
|---|---|---|
| Anthropic prompt caching | ~90% on cache hits | Mark static identity + rules layers with `cacheControl: ephemeral` |
| `prepareStep` model switching | ~60% on synthesis steps | Steps 0-2: claude-sonnet-4-6; Steps 3+: claude-haiku-4-5 |
| `stopWhen: stepCountIs(5)` | Prevents infinite loops | Hard cap at 5 tool cycles |
| Memory injection | Shorter system prompt per call | Only inject top-5 relevant memories (not full history) |
| `activeTools` filtering | Smaller context per step | Limit to 3 relevant tools per step type |

**Target cost per conversation:** <$0.02 with caching active (versus ~$0.08 without).

Track actual cost via `agent_logs.cost_cents` — CFO agent (Phase 5) will surface this to the user.

---

## 5. The War Table — Pipeline Visualization Spec

### 5.1 How The Kanban Lives IN The Room

The war table is not a floating widget. It IS the room's central furniture piece. The camera angle (established in the room scene CSS) looks slightly down and across the table surface, suggesting a 3D desk you're standing over. Implementation: CSS `perspective(1500px)` on the room container, table element with subtle `rotateX(3deg)` — just enough to suggest depth without distorting readability.

Column separators are styled as **physical dividers** — thin raised ridges (`box-shadow: 0 0 0 1px rgba(30, 144, 255, 0.2), 0 4px 8px rgba(0,0,0,0.4)`) — not flat lines.

The war table occupies the bottom 65% of the floor viewport. Top 35% is the CRO character station (whiteboard, character, window).

### 5.2 Card Design as Intelligence Dossiers

```tsx
// ApplicationCard.tsx — key CSS classes
const cardStyles = `
  relative
  bg-[#0F1F3D]/80 backdrop-blur-md
  border border-[#1E3A5F]
  rounded-[2px]                    /* Angular, not rounded */
  p-3
  cursor-grab active:cursor-grabbing
  /* Blueprint grid texture at 3% opacity */
  bg-[url('/assets/textures/blueprint-grid.png')] bg-blend-overlay
  transition-shadow duration-200
  hover:border-[#1E90FF]/40
  hover:shadow-[0_0_15px_rgba(30,144,255,0.15)]
`;

// Corner brackets rendered as absolute positioned pseudo-elements:
// [⌐ ¬] corners only, not full border
```

**Card states (visual):**
- **Idle:** Base style above
- **Hovered:** Scale 1.02, border `#1E90FF/40`, `box-shadow: 0 0 15px rgba(30,144,255,0.15)`
- **Grabbed (active drag):** Scale 1.04, `z-index: 50`, `box-shadow: 0 8px 40px rgba(0,0,0,0.6)`, slight tilt: `rotate(-1.5deg)` following mouse direction
- **Over valid drop zone:** Drop zone gets `border: 1px dashed #1E90FF/60` highlight
- **Stale (14+ days):** Amber status dot `#F59E0B` with pulse animation; timestamp turns amber

**Classification stamp logic:**
```typescript
function getClassificationStamp(app: Application) {
  if (app.tier === 1) return { label: 'PRIORITY TARGET', color: '--wm-accent-intel' };
  if (daysStale(app) > 14) return { label: 'FOLLOW-UP REQUIRED', color: '--wm-accent-warning' };
  if (app.status === 'offer') return { label: 'MISSION SUCCESS', color: '--wm-accent-live' };
  if (app.status === 'rejected') return { label: 'ARCHIVED', color: '--wm-text-muted' };
  return { label: 'ACTIVE OPERATION', color: '--wm-accent-primary' };
}
```

### 5.3 Status Columns with Tactical Naming

| Column | Tactical Label | Header Color | Card Count Badge |
|---|---|---|---|
| `discovered` | RECON | `#4A7A9B` | Muted blue pill |
| `applied` | OPS SUBMITTED | `#1E90FF` | Blue pill |
| `screening` | FIRST CONTACT | `#00D4FF` | Cyan pill |
| `interviewing` | ACTIVE ENGAGEMENT | `#F59E0B` | Amber pill |
| `offer` | MISSION SUCCESS | `#00FF87` | Green pill — glowing |
| `rejected` | DEBRIEF | `#4A7A9B` | Muted (collapsed by default) |

Rejected/withdrawn columns are collapsed by default (showing only count) and expand on click.

### 5.4 Drag-and-Drop Interaction Flow

```
1. User grabs card (PointerSensor or KeyboardSensor)
   → GSAP Flip: capture pre-drag layout
   → Card scales to 1.04, shadow deepens, slight tilt

2. Card dragged over column
   → Current column: card ghost shows at insertion point
   → Target column header: brief `pulse-glow` animation
   → Column bottom drop zone: `border: 1px dashed rgba(30, 144, 255, 0.5)`

3. Card dropped
   → `handleDragEnd` fires
   → Optimistic update: setColumns() immediately
   → GSAP Flip.from(capturedState) → animates other cards to new positions
   → DB update fires async (Supabase .update())
   → Supabase Realtime echoes back → reconcile (no visible flicker if successful)
   → If error: revert + toast.error()

4. Ghost echo effect (war room specific)
   → On drop, a 200ms ghost of the card fades at the original position
   → CSS: `opacity: 0.3 → 0`, `filter: blur(0 → 4px)` over 200ms
```

**Keyboard accessibility (WCAG 2.5.7):**
- `@dnd-kit/accessibility` `announcements` object configured for screen reader
- "Move to..." context menu via card's `⠿` handle button (`aria-haspopup="menu"`)
- All column transitions achievable via keyboard alone

### 5.5 Optimistic Update Pattern with Supabase Realtime

```typescript
// src/components/floor-7/hooks/useOptimisticKanban.ts

export function useOptimisticKanban(userId: string) {
  const [columns, setColumns] = useState<KanbanColumns>({});
  const [dbSnapshot, setDbSnapshot] = useState<KanbanColumns>({});
  const isDragging = useRef(false);

  // Initial load
  useEffect(() => {
    loadApplications(userId).then(apps => {
      const organized = organizeByStatus(apps);
      setColumns(organized);
      setDbSnapshot(organized);
    });
  }, [userId]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`kanban-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'applications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (!isDragging.current) {
          setDbSnapshot(prev => reconcile(prev, payload));
          setColumns(prev => reconcile(prev, payload));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function moveCard(cardId: string, fromStatus: string, toStatus: string, newPosition: string) {
    isDragging.current = false;
    const optimisticColumns = applyMove(columns, cardId, fromStatus, toStatus, newPosition);
    setColumns(optimisticColumns); // Instant UI update

    const { error } = await supabase
      .from('applications')
      .update({ status: toStatus, position: newPosition })
      .eq('id', cardId)
      .eq('user_id', userId);

    if (error) {
      setColumns(dbSnapshot); // Revert
      toast.error('Status update failed');
    } else {
      setDbSnapshot(optimisticColumns); // Commit
    }
  }

  return { columns, moveCard, setIsDragging: (v: boolean) => { isDragging.current = v; } };
}
```

### 5.6 Mobile Adaptation

| Desktop | Mobile (<768px) |
|---|---|
| Full Kanban columns side-by-side | Horizontal swipe — one column per viewport |
| Blueprint grid background | Reduced grid size (20px vs 40px) |
| Glassmorphism blur | Reduced blur radius (4px vs 12px) for performance |
| Scanline overlay | Disabled on mobile |
| Particle effects | Disabled on mobile |
| CRO split-screen | Pattern A: bottom dialogue box (portrait + text) |
| Full dossier card | Compact card (company name + stage badge + action button) |
| Drag-and-drop | Long-press to initiate drag OR tap "Move to..." button |

**Mobile column navigation:**
```tsx
// Stage tabs at bottom of screen
<nav className="fixed bottom-0 w-full flex">
  {STAGES.map(stage => (
    <button key={stage.id} className={activeStage === stage.id ? 'text-[#1E90FF]' : 'text-[#4A7A9B]'}>
      {stage.shortLabel}
      <span className="badge">{counts[stage.id]}</span>
    </button>
  ))}
</nav>
```

Touch targets: minimum 44×44px for all interactive elements per [Nielsen Norman Group](https://www.nngroup.com/articles/touch-target-size/).

---

## 6. Innovative Features (Phased)

### Phase 1 Must-Have (Build NOW)

| Feature | Why Now | Technical Hook |
|---|---|---|
| **Stale detection alerts** | Zero competitors have this | Cron check → `notifications` table → CRO `alert` state |
| **Conversion rate display** | Unique CRO insight vs. benchmarks | `analyzeConversionRates` tool + whiteboard widget |
| **Pipeline health score** | Makes CRO conversations data-driven | Computed from schema fields; shown on whiteboard |
| **RE firm tier classification** | Tailored to Armaan's career track | `companies.tier` field (1=Blackstone/Brookfield, 2=CBRE/JLL, etc.) |
| **Status history log** | Audit trail for multi-stage apps | Write to `agent_logs` on every status change |

**Pipeline Health Score formula:**
```
Score = (active_count / target_active) * 30
      + (conversion_rate / benchmark_conversion) * 30
      + (1 - stale_ratio) * 25
      + (weekly_activity / target_weekly_activity) * 15
```
Target: 80+. Displayed as a segmented bar on CRO's whiteboard.

### Phase 1 Nice-to-Have (If Time Permits)

| Feature | Estimated Time | Notes |
|---|---|---|
| **Gmail status detection** (propose updates) | 2-3 sessions | Requires Phase 2 Gmail OAuth; can stub the parsing logic now |
| **RE firm intelligence cards** | 1 session | Static JSON of Blackstone/CBRE/JLL intel on `companies` table |
| **Application deadline warnings** | 1 session | Hines REDI closes first Friday October — hardcode initially |
| **Conversion benchmarks in CRO** | 0.5 sessions | Already in system prompt; just needs display widget |
| **Follow-up draft preview in card** | 0.5 sessions | One-click from card → CRO chat pre-loaded with follow-up request |

### Future Phases (Feed into Phases 2–6)

| Feature | Phase | Why It Matters |
|---|---|---|
| **Email auto-status detection** | Phase 2 (COO) | Gmail OAuth; classify → propose card moves; ~90% of applicants experience ghosting per Huntr 2025 |
| **Conversion rate benchmarking dashboard** | Phase 5 (CFO) | Huntr 1.78M application dataset: 5.8% tailored resume → interview benchmark |
| **What-if scenario modeling** | Phase 5 | "Apply 15 more → expected 1.2 interviews" — predictive analytics |
| **Anonymous peer benchmarking** | Phase 5 | Opt-in: "NYU RE Finance students average X apps/month" |
| **RE market intelligence feed** | Phase 3 (CIO) | CoStar/MSCI RCA data for company cards; recent deals for interview prep |
| **Chrome extension** | Phase 6 | One-click capture from LinkedIn/Indeed; autofill Workday/Greenhouse/Lever |
| **Daily application streak** | Phase 6 | +60% commitment per gamification research; streak freezes |
| **XP + achievement system** | Phase 6 | "First Interview" badge; "10 Apps in Week" achievement; building upgrades unlock |
| **Natural language querying** | Phase 3+ | "Show me all REPE apps from October" via CRO agent tool |
| **Compensation data** | Phase 3+ | CBRE Finance Intern: $25-26/hr; JLL: $25/hr — inline with application cards |

---

## 7. Design Tokens (War Room Specific)

### 7.1 Color Tokens

```css
/* src/styles/floor-7.css — War Room color overrides */
:root[data-floor="7"] {
  /* Backgrounds */
  --wm-bg-void:    #060B14;  /* Near-black, blue undertone */
  --wm-bg-deep:    #0A1628;  /* Main floor background */
  --wm-bg-panel:   #0F1F3D;  /* Panel/card surfaces */
  --wm-bg-surface: #152847;  /* Elevated surfaces, hover states */
  --wm-bg-border:  #1E3A5F;  /* Borders, dividers */

  /* Accents */
  --wm-accent-primary:   #1E90FF;  /* Electric blue — interactive elements */
  --wm-accent-secondary: #00D4FF;  /* Cyan — data outlines, wireframes */
  --wm-accent-live:      #00FF87;  /* Phosphor green — live/active ONLY */
  --wm-accent-warning:   #F59E0B;  /* Amber — pending, stale, under review */
  --wm-accent-danger:    #DC3C3C;  /* Red — rejected, critical alerts */
  --wm-accent-intel:     #9B59B6;  /* Purple — priority/classified */

  /* Text */
  --wm-text-primary:   #E8F4FD;  /* Near-white, blue tint */
  --wm-text-secondary: #7FB3D3;  /* Muted blue-white */
  --wm-text-muted:     #4A7A9B;  /* Dim blue-gray */
  --wm-text-data:      #00D4FF;  /* Cyan — live data values */

  /* Typography overrides for Floor 7 */
  --font-display: 'Space Grotesk', sans-serif;  /* Replaces Playfair Display */
  --font-data:    'IBM Plex Mono', monospace;   /* Replaces JetBrains Mono */
  --font-body:    'Satoshi', sans-serif;        /* Unchanged */
}
```

**Semantic meaning of each accent:**
- `--wm-accent-primary` (#1E90FF): Any clickable/interactive element
- `--wm-accent-secondary` (#00D4FF): Decorative wireframes, data readouts, CRO whiteboard numbers
- `--wm-accent-live` (#00FF87): ONLY for "currently active" status indicators — never for primary UI
- `--wm-accent-warning` (#F59E0B): Stale apps, pending review, needs-action state
- `--wm-accent-danger` (#DC3C3C): Rejections, critical alerts, irreversible actions
- `--wm-accent-intel` (#9B59B6): Tier-1 firm badges, priority applications

### 7.2 Typography Overrides

| Element | Floor 7 Token | Value | Why Different |
|---|---|---|---|
| Floor name (War Room) | `--font-display` | Space Grotesk (condensed) | Tactical feel; Playfair Display too warm |
| Data labels on cards | `--font-data` | IBM Plex Mono | Machine-human signal; purpose-built for terminal UIs |
| Card field names (TARGET:, APPLIED:) | `--font-data` + uppercase | IBM Plex Mono, `letter-spacing: 0.1em` | Dossier/field label aesthetic |
| Status badges | `--font-data` | IBM Plex Mono | Consistent with data layer |
| Conversation (CRO dialogue) | `--font-body` | Satoshi | Character voice should be human, not machine |
| Ticker strip | `--font-data` | IBM Plex Mono, 11px | Terminal readout feel |

### 7.3 Animation Timing Tokens

```css
:root[data-floor="7"] {
  /* Entry animations */
  --anim-card-enter:      200ms ease-out;   /* Card appearing */
  --anim-panel-slide:     400ms cubic-bezier(0.16, 1, 0.3, 1); /* Spring panel */
  --anim-approach-zoom:   300ms ease-in-out; /* Room zoom on character click */

  /* Data updates */
  --anim-value-flash:     150ms ease-out;   /* Number changes: cyan flash → settle */
  --anim-card-drag:       0ms;              /* Drag: instantaneous (handled by CSS transforms) */
  --anim-card-drop:       200ms ease-out;   /* Post-drop: settle into position */

  /* Ambient (always running) */
  --anim-glow-pulse:      3000ms ease-in-out infinite;  /* Active panel breathing */
  --anim-radar-sweep:     4000ms linear infinite;       /* Radar rotation */
  --anim-status-pulse:    2000ms ease-in-out infinite;  /* Status dot rings */
  --anim-ticker:          30000ms linear infinite;      /* Ticker scroll */
  --anim-stale-blink:     2000ms ease-in-out infinite;  /* Stale app amber blink */
  --anim-critical-blink:  800ms ease-in-out infinite;   /* Critical/offer fast pulse */
}
```

### 7.4 Atmospheric Effects Implementation

**Blueprint Grid:**
```css
.war-room-bg {
  background-color: var(--wm-bg-void);
  background-image: 
    linear-gradient(rgba(30, 144, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 144, 255, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;   /* 20px on mobile */
}
```

**Scanline overlay (panels only, not full UI):**
```css
.data-panel::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.12) 50%);
  background-size: 100% 4px;
  pointer-events: none;
  opacity: 0.2;
}
/* Skip on mobile entirely */
@media (max-width: 768px) { .data-panel::after { display: none; } }
```

**Panel glassmorphism:**
```css
.tactical-panel {
  background: rgba(15, 31, 61, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(30, 144, 255, 0.15);
  border-radius: 2px;  /* Angular, not rounded */
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(30, 144, 255, 0.08);
}
```

**Pulsing status dots:**
```css
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.active   { background: #00FF87; }
.status-dot.pending  { background: #F59E0B; }
.status-dot.danger   { background: #DC3C3C; }
.status-dot.inactive { background: #4A7A9B; }

.status-dot.active::before,
.status-dot.active::after {
  content: ''; position: absolute; inset: 0;
  background: inherit; border-radius: 50%;
  animation: var(--anim-status-pulse);
  opacity: 0.4;
}
.status-dot.active::after { animation-delay: 1s; }
@keyframes status-pulse { to { transform: scale(2.5); opacity: 0; } }
```

---

## 8. Open Questions & Risks

### What Still Needs to Be Decided

| Decision | Options | Deadline |
|---|---|---|
| **CRO character name** | TBD per VISION-SPEC.md | Before Phase 1 build |
| **Character art pipeline** | (A) AI-generated Flux.1+LoRA, (B) Flux.1 one-shot curated, (C) Fiverr commission | Before 1.5 |
| **Rive vs. CSS sprites for V1** | Rive if art is ready; CSS sprites if rushed | Depends on art decision |
| **IBM Plex Mono licensing** | Google Fonts (free, OFL) — confirm for embedding | Before 1.1 |
| **`tsParticles` vs. CSS-only particles** | tsParticles (~100KB) vs. pure CSS keyframes | Before 1.1 |
| **drizzle-kit RLS bug** | Write raw SQL migrations for policy changes (current workaround) | Ongoing (Phase 0 risk) |
| **Google OAuth production** | Must publish before real user testing; review takes 1-2 weeks | Before Phase 2 |

### What Could Go Wrong

| Risk | Likelihood | Mitigation |
|---|---|---|
| **AI SDK v5/6 API confusion** | High | This blueprint clarifies: `ai: ^6.x` IS SDK 5's naming. Use `inputSchema:`, `stopWhen:`, `sendMessage()` throughout |
| **Rive character art not ready** | Medium | Implement 1.5 with CSS sprites + GSAP first; upgrade to Rive when art is complete |
| **Supabase Realtime RLS failures** | Medium | Use service-role client with `SET LOCAL app.user_id` for subscriptions, OR use a separate events relay table outside RLS |
| **@dnd-kit multi-container edge cases** | Low-Medium | Test with 8+ columns early; @dnd-kit/sortable has known issues with many containers — may need `SortableContext` per column with `items` prop |
| **GSAP Flip visual artifacts** | Low | Avoid Flip during active `isDragging` state — only trigger on `onDragEnd` |
| **Performance on low-end devices** | Medium | Audit with Chrome DevTools. Kill scanlines, particles, blur first if >50ms frame times |
| **Anthropic caching not reducing costs** | Low | Cache requires identical prefix (system+tools). Log `usage.cacheReadInputTokens` in `agent_logs` to verify |
| **Inngest Realtime instability** | Medium | TECH-BRIEF.md §5 flags this as "developer preview." Fallback: Supabase Realtime on `notifications` table |

### What Armaan Must Do Manually (Cannot Be Automated)

1. **Character illustration** — Create 3-5 pose variants for the CRO (idle, talking, gesturing, working, alert). Either generate with Flux.1 in ComfyUI, commission on Fiverr (~$100-200 for one character), or use a placeholder SVG initially.

2. **Google OAuth — publish to Production** — Required before Phase 2 (Gmail). Go to Google Cloud Console → OAuth consent screen → Submit for verification. Takes 1-2 weeks. Start this before you start Phase 2 work.

3. **CRO name decision** — The system prompt uses `{CHARACTER_NAME}`. Needs a name before the character system ships.

4. **Supabase pgvector extension** — Run `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase SQL Editor (or confirm it's already enabled). `schema.ts` references `vector` columns but the extension must be manually enabled.

5. **Anthropic API key** — Add `ANTHROPIC_API_KEY` to `.env.local` and Vercel environment variables.

6. **RE firm intelligence data** — The firm tier cards (Blackstone, CBRE, JLL, etc.) need initial seed data. Write a seed script or manually insert 10-15 RE firms into the `companies` table with correct `tier`, `internshipIntel`, and `internshipTimeline` fields.

---

## 9. Implementation Order

### Task Sequence

| # | Task | Depends On | Sessions | Complexity |
|---|---|---|---|---|
| **1** | Establish Floor 7 environment (1.1) | Phase 0 complete | 1 | M |
| **2** | Application CRUD API + DB queries (1.2) | Floor shell, schema | 1-2 | M |
| **3** | Application form UI (modal + fields) | Task 2 | 1 | M |
| **4** | War Table Kanban board (1.3) — static first | Tasks 2-3 | 2 | M |
| **5** | @dnd-kit drag-and-drop (1.3 DnD) | Task 4 | 1 | M |
| **6** | Optimistic updates + Supabase Realtime (1.3) | Tasks 5, DB | 1 | M |
| **7** | CRO tools.ts — rewrite with `inputSchema:` (1.4) | Schema, DB queries | 1 | S-M |
| **8** | CRO route.ts — streamText + tool loop (1.4) | Task 7 | 1 | M |
| **9** | System prompt + memory integration (1.4) | Task 8, pgvector | 1 | M |
| **10** | Character state machine (XState) (1.6 foundation) | — | 1 | M |
| **11** | CRO character frontend (1.5) — sprite/placeholder | Task 10 | 1-2 | M |
| **12** | Dialogue panel + useChat integration (1.5) | Tasks 8, 11 | 1 | M |
| **13** | Character interaction system refactor (1.6) | Tasks 10-12 | 1 | L |
| **14** | Proactive alerts (CRO backend) | Tasks 8-9 | 1 | M |
| **15** | War room atmosphere polish (1.1) | Task 1 | 1 | S |
| **16** | Accessibility audit (keyboard DnD, ARIA) | Tasks 5-6 | 0.5 | S |
| **17** | Mobile adaptation | All above | 1-2 | M |
| **18** | Tests: CRUD unit tests, CRO tool tests, E2E | All above | 1 | M |

### Dependency Graph

```
[Phase 0] → [1: Floor env] → [15: Polish]
         ↘
          [2: CRUD API] → [3: Form UI] → [4: Static board] → [5: DnD] → [6: Realtime] → [16: A11y]
                    ↘                                                                   ↓
                     [7: Tools] → [8: Route] → [9: System prompt + memory] → [14: Alerts]
                                                                             ↓
                     [10: XState] → [11: Character sprite] → [12: useChat] → [13: Reusable system]
                                                                             ↓
                                                                    [17: Mobile] → [18: Tests]
```

### Recommended Session Plan

| Session | Tasks | Goal | Deliverable Complete |
|---|---|---|---|
| **Session 1** | 1, 2 | Floor environment + application DB layer working | 1.1 ✓, 1.2 partial |
| **Session 2** | 3, 4, 5 | War table with static then draggable cards | 1.2 ✓, 1.3 partial |
| **Session 3** | 6, 7, 8 | Realtime Kanban + CRO route streaming | 1.3 ✓, 1.4 partial |
| **Session 4** | 9, 10, 11 | System prompt + XState + character placeholder | 1.4 ✓, 1.5 partial |
| **Session 5** | 12, 13, 14 | Full dialogue system + proactive alerts | 1.5 ✓, 1.6 ✓ |
| **Session 6** | 15, 16, 17, 18 | Polish + accessibility + mobile + tests | Phase 1 complete ✓ |

**Total: 6 focused sessions (~2 weeks of active development).**

---

## Source Citations

All decisions in this document are derived from the following research files:

| Source | Location | Used In |
|---|---|---|
| [PkgPulse DnD Comparison 2026](https://www.pkgpulse.com/blog/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026) | research-kanban-pipeline.md §1 | §2.1 |
| [Atlassian Pragmatic DnD](https://atlassian.design/components/pragmatic-drag-and-drop) | research-kanban-pipeline.md §1 | §2.1 |
| [Rive Runtimes](https://rive.app/runtimes) | research-character-system.md §1 | §2.2 |
| [Rive State Machine Docs](https://help.rive.app/editor/state-machine) | research-character-system.md §1 | §2.2, §3.5 |
| [AI SDK 5 Vercel Blog](https://vercel.com/blog/ai-sdk-5) | research-cro-agent.md §1 | §2.3 |
| [streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) | research-cro-agent.md §1 | §2.3, §4.2 |
| [useChat Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) | research-cro-agent.md §1 | §2.3, §4.3 |
| [Anthropic Tool Use Guide](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) | research-cro-agent.md §2 | §4.2 |
| [XState in React — Stack Builders](https://www.stackbuilders.com/insights/Visualizing-your-app-logic-with-XState-React/) | research-character-system.md §5 | §2.4 |
| [Persona 5 UI/UX Analysis — Ridwan Khan](https://ridwankhan.com/the-ui-and-ux-of-persona-5-183180eb7cce) | research-character-system.md §4 | §2.5 |
| [War Room Color Palette](https://scifiinterfaces.com/2015/07/01/iron-man-hud-a-breakdown/) | research-war-room-design.md §3 | §2.6 |
| [HUDS+GUIS Avengers Analysis](https://www.hudsandguis.com/home/2013/05/15/the-avengers) | research-war-room-design.md §1 | §2.6 |
| [XCOM 2 UI Design — Hannah Montgomery](https://jamuidesign.com/xcom-2/) | research-war-room-design.md §4 | §2.6, §5.1 |
| [Marmelab Kanban with Supabase](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html) | research-kanban-pipeline.md §5 | §5.5 |
| [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime) | research-kanban-pipeline.md §5 | §5.5 |
| [WCAG 2.5.7 Implementation Guide](https://www.allaccessible.org/blog/wcag-257-dragging-movements-implementation-guide) | research-kanban-pipeline.md §6 | §5.4 |
| [Huntr 2025 Annual Report](https://huntr.co/research/2025-annual-job-search-trends-report) | research-innovative-features.md §3.1 | §6, §4.1 |
| [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | research-cro-agent.md §3.2 | §4.1, §4.6 |
| [Reddit Layered Persona Framework](https://www.reddit.com/r/PromptEngineering/comments/1mdkkkx/beyond_the_single_prompt_a_layered_framework_for/) | research-cro-agent.md §3 | §4.1 |
| [CSS Glow Effects](https://freefrontend.com/css-glow-effects/) | research-war-room-design.md §5 | §7.4 |
| [Glassmorphism UI Guide](https://uxpilot.ai/blogs/glassmorphism-ui) | research-war-room-design.md §5 | §7.4 |
| [CSS Status Indicators — Snippflow](https://snippflow.com/snippet/css-status-indicators-with-pulsing-animation/) | research-war-room-design.md §6 | §7.4 |
| [NNGroup Touch Target Size](https://www.nngroup.com/articles/touch-target-size/) | research-character-system.md §3 | §5.6 |
| [Hines Internships](https://www.hines.com/careers/graduates-and-interns) | research-innovative-features.md §2.7 | §6 |
| [Blackstone Students](https://www.blackstone.com/careers/students/) | research-innovative-features.md §4.1 | §6 |
| [Mission Control UX Patterns](https://uxplanet.org/mission-control-software-ux-design-patterns-benchmarking-e8a2d802c1f3) | research-war-room-design.md §1 | §5.1 |
| [UI Density — Matt Strom-Awn](https://mattstromawn.com/writing/ui-density/) | research-war-room-design.md §2 | §5.1 |
| [Codrops: 3D Product Grid with R3F](https://tympanus.net/codrops/2026/02/24/from-flat-to-spatial-creating-a-3d-product-grid-with-react-three-fiber/) | research-kanban-pipeline.md §4.3 | §5.1 (noted, not used in Phase 1) |
| [GSAP Free for Commercial Use](https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/) | TECH-BRIEF.md §1 | §2.1, §3.3 |
| [Drizzle RLS Docs](https://orm.drizzle.team/docs/rls) | TECH-BRIEF.md §4 | §3.2 |
| [Drizzle GitHub Issue #4198](https://github.com/drizzle-team/drizzle-orm/issues/4198) | TECH-BRIEF.md §4 | §8 |

---

---

## 10. Audit Findings & Required Fixes

### CRITICAL — Must fix before implementation starts

**1. Missing `position` column in `schema.ts`**
The `applications` table has NO `position` column. The blueprint specifies lexicographic string ordering for Kanban card positions (§3.2, §5.5). **Action:** Add `position: text("position")` to the applications table. Add composite index on `(userId, status, position)` for efficient column queries. Create a Drizzle migration. Backfill existing rows: `UPDATE applications SET position = lpad(row_number::text, 10, '0')` ordered by `createdAt` within each status group.

**2. Zod import path — use `zod/v4` not `zod`**
All existing contracts use `import { z } from 'zod/v4'` (Zod 4 modern API). Blueprint tool code samples show `from 'zod'` which resolves to the v3-compat API. All new code MUST use `zod/v4`.

**3. Contracts layer vs runtime tools layer**
The existing `src/lib/contracts/departments/cro.ts` defines Zod validation schemas (contract shapes). The NEW `src/lib/agents/cro/tools.ts` file uses `tool()` from `'ai'` with `inputSchema:` for AI SDK runtime. These are separate layers — contracts validate shapes, tools execute. Don't conflate them.

### MEDIUM — Fix during implementation

**4. Status column mapping incomplete**
Schema has 10 statuses but §5.3 shows only 6 columns. Fix: `interview_scheduled` + `interviewing` share "ACTIVE ENGAGEMENT" column. `under_review` = "INTEL REVIEW" column (visible). `accepted` + `withdrawn` join `rejected` in collapsed "COMPLETED" group.

**5. `buildCROSystemPrompt` call signature mismatch**
§4.1 defines `(stats, userName, memories)` but §3.4 route handler calls `(stats, memories)` — missing `userName`. Fix the route handler to pass user's name.

**6. No error states specified**
Add: CRO API failure → character enters "confused" state + retry button. Supabase Realtime disconnect → show "connection lost" indicator. DB failure → optimistic revert (partially covered in §5.5).

**7. No empty state / onboarding for new users**
New user opens Floor 7 → empty table. Fix: CRO greets new user with "Let's add your first application." Empty table shows dashed-border "Add your first op" card. Pipeline health shows "N/A — add 5+ to activate."

**8. Rate limiting needed on CRO API**
Add in-memory rate limit: 1 request per 3 seconds per user. Prevents cost spikes from spam-clicking.

### LOW — Polish items

**9. Cut from Phase 1:** `RadarWidget.tsx`, `MiniPipelineRadar.tsx` (decorative; column count badges serve the purpose).

**10. Move to Phase 3:** `lookupAtsJob` tool (ATS scraping is CIO territory, not Phase 1 pipeline management).

**11. Use CSS particles over tsParticles** — saves ~100KB. 30 absolute-positioned divs with `@keyframes` achieve same effect.

**12. Lock Rive vs CSS sprites decision:** At START of Session 4, if `.riv` file exists in `/public/assets/characters/`, use Rive. Otherwise CSS sprites. XState machine is identical either way.

**13. Add `useChat` id prop:** `useChat({ id: \`cro-${userId}\`, api: '/api/cro' })` to prevent conversation collision across floors.

**14. Ghost echo effect:** Reduce from 200ms to 100ms or it looks like a rendering bug. Gate behind `prefers-reduced-motion`.

**15. Define test strategy:** (a) CRUD operations unit tests, (b) CRO tool execute functions with mocked DB, (c) DnD E2E with Playwright, (d) optimistic revert on error.

---

---

## 11. Chain of Command — AI Hierarchy Spec

**Full specification:** [`docs/CHAIN-OF-COMMAND.md`](./CHAIN-OF-COMMAND.md) (1,500+ lines)

The War Room's AI hierarchy follows a strict chain of command:

```
User → CEO Agent → CRO Agent → 5 Specialist Subagents
```

### Summary

| Agent | Codename | Model | Role |
|-------|----------|-------|------|
| CEO | `tower-ceo` | Claude Sonnet 4 | Routes user intent to departments |
| CRO | `war-room-cro` | Claude Sonnet 4 | Decomposes pipeline tasks to subagents |
| Job Discovery | `cro-job-discovery` | GPT-4o-mini | Finds and scores new opportunities (SDR) |
| Application Manager | `cro-application-manager` | Claude Sonnet 4 | Manages pipeline status, flags stale apps (AE) |
| Pipeline Analyst | `cro-pipeline-analyst` | GPT-4o-mini | Conversion rates, health scores, trends (RevOps) |
| Intel Briefer | `cro-intel-briefer` | Claude Sonnet 4 | Company research for active pipeline items (Enablement) |
| Offer Evaluator | `cro-offer-evaluator` | Claude Sonnet 4 | Comp benchmarks, negotiation strategy (CSM) |

### Key Design Decisions

- **Nested agent-in-tool pattern**: Each subagent is a `tool()` in the CRO's tool array. AI SDK v5/6 native.
- **Scope enforcement via tool restriction**: Agents can only do what their tools allow. Primary enforcement mechanism.
- **Knowledge injection > persona labels**: Research proves "you are an expert" prompts don't work. Injecting decision trees, tier rankings, and benchmarks creates real expertise.
- **Static context for <50 items**: RE Finance tiers, recruiting calendar, and benchmarks are small enough to inject directly. No RAG.
- **All side-effects require user approval**: Status updates, outreach drafts, anything touching the real world.

See the full spec for: production system prompts, few-shot examples, RACI matrix, domain knowledge injection tables, error handling, Inngest wiring, and contract amendments.

---

*Document length: ~1,500 lines + audit + hierarchy spec reference. Compiled from 5 research files + 6 project context files + 3 deep hierarchy research files. All decisions are concrete, cited, and implementation-ready. Audit completed with 23 findings (2 critical, 6 medium, 7 low). A developer should be able to open this document and start writing code immediately.*
