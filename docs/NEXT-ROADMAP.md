# NEXT ROADMAP — The Tower
## Design Overhaul + Autonomous Operation Phase

**Status:** Proposal — awaiting user sign-off on §7 before first rebuild phase begins.
**Scope:** Every floor redesigned from the ground up — including the Lobby. Every floor also advances the North Star (user describes want → Tower autonomously discovers / tracks / tailors / applies / preps / coaches). The **bar** is the target aesthetic (luxury game UI + Bloomberg Terminal + Apple spatial design) rendered at Awwwards-winner quality. The current Lobby is the strongest *reference point* we have today for motion vocabulary and primitives, but it is a starting point, not a finish line.
**Author:** Autonomous planning session, 2026-04-21.
**Naming:** Original master plan used Phase 0–6 (all complete). This doc uses **Rebuild 1–7** (R1–R7) to avoid collision.

---

## §1 — State of the Union

Ten floors are built and shipping; every one reads as a placeholder that proves the plumbing works but not the promise. The Lobby is the closest any floor gets to feeling hand-crafted, but it too needs an overhaul to hit the target aesthetic — it is a *reference*, not the destination.

**Lobby (L)** — Strongest current floor. GSAP timeline entrance, cursor-following spotlight, 30-particle dust field, frosted-noise glass with 3D tilt, gold shimmer sweeps on directory rows, dual-ring radar pulses, cinematic stagger. But it's still a reception-hall-with-a-sign-in — no Concierge character, no first-run onboarding ritual, no cinematic exterior approach, no spatial arrival. Gap to target aesthetic: M. Still overhauled in this plan, just later and building on the primitives we mature across R1–R3.

**Penthouse (PH)** — Primitives are strong (`GlassPanel`, `StatCard`, `PipelineNodes`, `QuickActionCard`, `PulseRing`) but the layout is a SaaS dashboard with a gold tint. Quick Action cards display "Phase 1/2/3" badges — a tell that the product is still showing scaffolding. No character presence. No CEO at the window. Gap: M.

**War Room (7)** — Kanban + CRO whiteboard on blueprint grid + cyan particles + corner accents + live ticker. The most *functional* floor, but the room is color-theme + particles, not a war room. No cinematic entrance, no cursor tracking, no shimmer sweeps. Table rows are generic cards, not instrumentation. Gap: L.

**Rolodex Lounge (6)** — Amber dust + warm palette + contact grid. Lounge feel is applied, not earned: no drawers, no card-flip affordance, no physical rolodex metaphor. CNO and CIO both live here, unclearly demarcated. Gap: L.

**Writing Room (5)** — Ruled-line texture, red margin rule, desk-lamp glow, amber motes. Strongest room-identity of the secondary floors — the only one that actually reads as a *place*. But the editor is a plain panel beside a silhouette; no pen glow, no paper rustle, no environmental response to text input. Gap: L.

**Situation Room (4)** — Alert rings, radar sweep, scanlines, amber-red particles. High *animation density*, but the motion is atmospheric loop, not interactive: clicking a row doesn't make the rings respond. Signature ring is wasted potential. Gap: L.

**Briefing Room (3)** — Teletype intel feeds are the most distinctive non-Lobby affordance in the whole building and the only one that feels hand-crafted. Still, interview prep content floats *beside* the teletype rather than responding to it. Gap: M (best of the Ls).

**Observatory (2)** — Very thin: sparse particles, a borrowed radar sweep, a 2-column grid. No signature moment. A panoramic analytics floor rendered as a flat chart page. Gap: XL.

**C-Suite (1)** — SVG agent-network diagram + "Ring the Bell" card + CEO silhouette. The most important floor (the orchestrator) is one of the emptiest. Network is static; bell-ring is a toast-y reveal; CEO has no presence. Gap: XL.

**What actually works across the building:** `PersistentWorld` skyline architecture (mount-once canvas, GSAP-tweened ambient color and offset during elevator nav), day/night engine, floor-shell chrome, agent dialogue primitives (`agents/dialogue/*`), 16-table schema with pgvector, CEO orchestrator with department dispatch tools, Gmail OAuth + parsing, CMO cover-letter generation (genuinely good), CPO prep-packet generation, memory extraction/retrieval per agent.

**What doesn't yet work** is the *product promise*: the building looks like a building but acts like a CRUD app. No proactive push. No autonomous discovery. No live dispatch. No resume engine. No mock interviews. No offer evaluator. The next phase closes that delta while rebuilding each floor to Lobby quality.

---

## §2 — North Star Gap Analysis

**North Star:** User describes what they want, and the Tower autonomously discovers jobs, tracks them, drafts tailored resumes and cover letters, applies, prepares interviews, and coaches through offers. Ranked by impact on actual job-search outcomes:

| Rank | Capability | Today (0–100) | Why this rank |
|------|-----------|---------------|---------------|
| **1** | **Job Discovery pipeline** | 15 | Everything else assumes applications exist. Nothing flows until the top of the funnel flows. Closing this turns the War Room from a tracker into a hunter. |
| **2** | **Resume tailoring engine** | 5 | Schema has `documents.type = 'resume_tailored'` and zero code writes to it. Per-application tailoring is table-stakes for 2026 job search — its absence is the single most embarrassing gap. |
| **3** | **Auto-apply / approved-send loop** | 20 | `outreach_queue` with `pending_approval → approved → sent` exists for email. We need the same for cover-letter-attached application sends, plus ATS-aware drafting (Greenhouse/Lever/Workday form maps). |
| **4** | **Proactive push (CEO speaks unprompted)** | 25 | Cron runs, writes a static notification string. There is no true CEO-authored briefing. Without proactive push, the user has to *remember* to open the Tower — which is the opposite of autonomy. |
| **5** | **Agent parallelism + dependency ordering** | 45 | Dispatch works sequentially with `maxSteps: 3`. For briefings, CEO should parallel-fan to N departments and wait on `dependsOn` chains. This is a 2-day refactor with huge compound returns. |
| **6** | **Interview simulation (live mock, not packets)** | 30 | CPO generates prep material but never drills. A text-based mock interview in a tool loop (Q → answer → feedback → next Q) ships in a week and changes how the floor feels. |
| **7** | **Offer evaluation & negotiation** | 0 | No structured comp data, no market benchmarking, no negotiation scripts. Low-frequency use case (users get few offers) but high-stakes; closing it late is fine. |
| **8** | **Memory: cross-agent semantic retrieval + visible UI** | 75 | Memory is wired but siloed per agent and invisible to the user. Making it *visible* (CRO's whiteboard reading agent_memory, Rolodex cards showing recalled facts) is a UX win with zero backend work. |
| **9** | **Background worker durability** | 20 | Vercel Cron + in-memory Promise.all is brittle. Moving to Inngest (or Vercel Queues) buys retries, event sourcing, and durable scheduled tasks. Invisible to user; critical for scale. |
| **10** | **Cross-agent handoff (CRO learnings reaching CMO)** | 20 | When CRO discovers "Blackstone prefers non-technical openers," CMO should know next time it drafts. Today each agent's memory is a silo. |

**Biggest compounding unlock:** #1 (Job Discovery). The moment the War Room populates itself overnight, every other agent has something real to do and the product becomes autonomous.

**Cheapest 24-hour win:** #2 (Resume tailoring). The schema, the docs table, the CMO structured-generator pattern, and pgvector are all already there. One new tool + one new document type.

**Biggest emotional unlock:** #4 (Morning Briefing ritual). The moment the CEO speaks unprompted is the moment the Tower stops being software.

---

## §3 — Design Language Proposal

The overhaul targets a coherent house style: **luxury game UI + Bloomberg Terminal + Apple spatial design.** Every floor must read as the same building — but each room must be unmistakably its own place. Generic component-library smell is the explicit enemy. The current Lobby is the strongest reference we have today, but even it is below bar — primitives extracted from it are starting material, not finished product.

### Shared primitives (codify once, reuse everywhere)

These already exist inside `src/app/lobby/lobby-client.tsx` or `src/components/penthouse/*`. Extract them into `src/components/world/primitives/` and make every floor consume them.

| Primitive | Source of truth | What it does | Tooling |
|---|---|---|---|
| `<CinematicEntrance>` | Lobby's GSAP tl | 1s container fade + staggered children (y+scale+opacity, power3.out, 50ms gap) on mount. Obeys `prefers-reduced-motion`. | GSAP timeline |
| `<SpotlightGlow>` | Lobby spotlight ref | rAF'd mouse-following radial gradient. Configurable color/size. | Raw DOM + rAF |
| `<RadarPulse>` | Lobby + Penthouse | Dual-ring ping, 2.5–3s, signals "alive / pending / alert." | CSS keyframes |
| `<ShimmerSweep>` | Lobby DirectoryRow | Left-to-right gold shimmer on hover. Signals "interactive / new." | CSS transform |
| `<FrostedGlass>` | Lobby SignInCard | Glass surface + SVG fractalNoise overlay + 3D tilt (max 3° rotateX/Y) + hover glow sphere. | CSS + SVG filter |
| `<ParticleField>` | Lobby + every floor | Deterministic 20–30 particles; color/density/speed configurable per floor. | CSS keyframes |
| `<GoldUnderline>` | Penthouse | 0 → 64px gradient grow under section headings. | CSS keyframe |
| `<CountUp>` | (new — extract) | Data numbers count up on mount with mono tabular-nums. Universal instrumentation feel. | Motion or raw rAF |
| `<DepthLayer>` | (new) | Explicit z-layer tokens (0 sky, 1 tint, 2 vignette, 10 room, 20 UI) — stop inline magic numbers. | CSS var |

**Design token additions (global):** per-floor 2-color accent pairs, extracted from `PersistentWorld.AMBIENT_COLORS`, exposed as `--floor-accent` and `--floor-accent-dim` CSS vars scoped by `[data-floor]`. Every primitive reads those vars — a Kanban card on Floor 7 glows cyan, the same primitive on Floor 5 glows violet, no branching code.

**Motion philosophy:** Rauno Freiberg / Linear vocabulary — motion exists to explain the *in-between* state, not to decorate. No bouncy spring physics. Every transition under 700ms. Every element that moves must earn it (state change, data arrival, interaction feedback).

**Typography system:** Already set (Playfair Display / Satoshi / JetBrains Mono). Add two rules: (1) every number >0 renders in JetBrains Mono with `tabular-nums` so digits don't jitter; (2) every *room label* (FLOOR 7 — THE WAR ROOM) is JetBrains Mono 11–12px with 0.3em letter-spacing — the universal Tower "signage" style.

### Per-floor mood, motion vocabulary, and tooling pick

Tools chosen per floor; not one-size-fits-all. Each choice is justified against the floor's *signature moment*, not against generic "performance."

| Floor | Mood | Motion vocabulary | Tool pick | Why this tool |
|---|---|---|---|---|
| **L Lobby** | Cinematic arrival — exterior approach, revolving door, concierge greeting | Camera pull through skyline into reception, dust motes, first-run onboarding | **GSAP** (arrival timeline) + **R3F** (exterior building approach, very short) + **Rive** (Concierge) + existing CSS primitives | Current Lobby is a static reception; target is a scripted *arrival scene* for new users and a quiet welcome-back for returning. Small R3F scene justified by signature arrival moment. |
| **PH Penthouse** | Golden-hour boardroom, panoramic calm | Data materializes on glass (Morning Briefing ritual) | **GSAP timeline + Motion layout** + optional **Rive** for CEO idle | GSAP owns the morning briefing scene (precise multi-element choreography); Motion for declarative layout crossfades on stat updates; Rive gives designer-driven CEO poses. |
| **7 War Room** | Bloomberg Terminal tactical | Kanban drag with Motion layout, live ticker data stream, blueprint flow lines | **Motion** (Kanban/drag) + **Canvas2D** (flow lines) + **GSAP** (entrance) + **Rive** (CRO) | Motion's layout animations are the gold standard for Kanban; Canvas2D owns the custom war-table flow visualization (lines pulsing between stages as applications move); Rive for CRO at whiteboard. |
| **6 Rolodex Lounge** | Warm library, vintage executive lounge | Physical rolodex spin, card flip on select, warmth as color temperature | **R3F** (3D rolodex centerpiece) + **Motion** (contact grid) + **GSAP** (entrance) + **Rive** (CNO+CIO) | The rolodex *must* be physical — 2D flip is a cop-out. R3F scene = ~500 triangles, trivial. Motion for the grid. |
| **5 Writing Room** | Library-quiet, warm wood, single desk lamp | Type-in live with pen-glow, paper-rustle, document preview as scroll reveal | **Motion** (editor) + **Remotion** (document preview) + **GSAP** (entrance) + **Rive** (CMO) | Remotion is the unconventional pick — use it to render cover-letter *previews* as a video-quality scroll-through, not HTML. This is signature and nobody does it. |
| **4 Situation Room** | Mission control, alert energy but composed | Alert cards with ring response on hover, live world-map of outreach flows | **Canvas2D** (situation map) + **Motion** (alert cards) + **GSAP** (entrance) + **Rive** (COO Dylan Shorts) | Canvas2D gives a custom "map of outreach flight paths" that isn't achievable with declarative libs. |
| **3 Briefing Room** | Clean preparation space, whiteboard + intel feeds | Teletype scroll (keep), whiteboard fills live during mock, STAR framework coaching | **GSAP** (teletype + entrance) + **Motion** (briefing panels) + **Rive** (CPO poses during drill) + **Web Speech API** (optional voice mock) | GSAP owns the teletype (precise scroll control). Rive for CPO because interview drilling needs expressive state changes. |
| **2 Observatory** | Panoramic, celestial, cool blue calm | The **Orrery** — user's pipeline as orbiting planets | **R3F** (orrery) + **Motion** (2D panels) + **GSAP** (entrance) + **Rive** (CFO) | R3F is the *reason* this floor exists. Pure 3D, 60fps, instanced spheres. This is the floor that earns 3D in the whole building. |
| **1 C-Suite** | Executive boardroom, commanding | Physical bell ring + camera pullback + dispatch trace | **GSAP** (bell + camera) + **Canvas2D** (orchestration graph) + **Motion** (panels) + **Rive** (CEO — most expressive) + **ElevenLabs** (optional CEO voice) | GSAP owns the bell-pull timeline; Canvas2D renders the live dispatch graph (nodes light up as agents execute); Rive handles CEO's high-expression range. |

### What we are *not* using — and why

- **Framer Motion (legacy)** — superseded by Motion in 2026; use Motion throughout.
- **@dnd-kit** (already installed) — keep for Kanban; it plays nicely with Motion layout animations.
- **Three.js raw** — too heavy. React Three Fiber only.
- **Lottie** — Rive beats Lottie in 2026 (smaller runtime, state machines, designer-first). The only Lottie case we'd accept is an existing asset pack we already own. We don't, so default Rive.
- **Generic shadcn/ui primitives** — banned on floors. Each floor's UI must be custom or Tower-primitive-derived. shadcn stays acceptable for admin pages (settings, Stripe portal, auth error).

### The test for "at bar"

A floor is at bar when a new user, spun up cold, can point at it and say **one specific thing that room does that nothing else does** — AND name a comparable SaaS / game UI moment it reminds them of (Linear's command menu, Arc's spaces, Raycast's launcher, a AAA game's home screen). Observatory today fails; its Orrery would pass. War Room today has particles; its live flow-line war-table would pass. Current Lobby fails too — it's a *reception hall* but no new user would describe it as "a signature moment." Each Per-Floor Phase Plan in §5 names the floor's one specific thing — its signature — including the Lobby's arrival scene.

---

## §4 — Floor Priority Order

### The sequence

1. **R1 — War Room (Floor 7)**  *(start here — autonomy heartbeat)*
2. **R2 — Penthouse (PH)**  *(Morning Briefing ritual)*
3. **R3 — C-Suite (Floor 1)**  *(orchestration upgrade, parallel dispatch)*
4. **R4 — Lobby (L)**  *(cinematic arrival + Concierge onboarding — first-impression layer for new users arriving now that the building is autonomous)*
5. **R5 — Writing Room (Floor 5)**  *(resume tailoring + cover letter refinement loop)*
6. **R6 — Briefing Room (Floor 3)**  *(live mock interview + drill)*
7. **R7 — Situation Room (Floor 4)**  *(auto-approved outreach + undo window)*
8. **R8 — Rolodex Lounge (Floor 6)**  *(warm networking + CIO research docks)*
9. **R9 — Observatory (Floor 2)**  *(the Orrery + analytics polish)*

Observatory intentionally last: it has the highest design lift (XL) and the lowest North-Star payoff (analytics summarize what already happened — nothing depends on it). Better to polish it when the rest of the building is autonomous and the user actually has data worth contemplating.

Lobby positioned at R4 (not R1, not last): (a) the current Lobby is the least-broken floor, so delaying its rebuild costs the least; (b) we want mature primitives (cinematic entrance, Rive, R3F patterns, Concierge character) proven on R1–R3 before reinventing the entrance; (c) by R3 the building is genuinely autonomous, so the new Lobby can *show* that autonomy to first-time users via the Concierge onboarding (§6.6); (d) shipping it mid-sequence gives us a clean "new marketing-ready entrance" moment coinciding with any public launch push.

### Why War Room first

A strict scoring of the four criteria from the brief:

| Criterion | War Room | Penthouse | C-Suite | Writing Room |
|---|---|---|---|---|
| (a) Autonomous-loop impact | **10/10** — Job Discovery lives here; closes the #1 North Star gap | 6/10 — Briefing surface, not engine | 8/10 — Orchestration, but no autonomous value without Discovery | 8/10 — Resume/cover letter engine, but needs jobs to tailor to |
| (b) Design lift | L | M | XL | L |
| (c) Dependencies | none (entry point of data) | depends on R1 (briefing needs discovered jobs) | depends on R1 (CEO dispatches to a War Room that has work) | depends on R1 (needs apps to tailor against) |
| (d) Fastest win validating new bar | 5/5 — densest data floor; if we hit Lobby quality here, every other floor's path is obvious | 3/5 — already has good primitives | 2/5 — needs a lot of custom invention | 4/5 — strong existing room identity |

War Room is the one floor that scores top on every axis. It's also the floor where "Bloomberg Terminal" tone has to land first, because it's the densest. Validating the new design language here de-risks every subsequent floor.

**Narrative corollary:** the moment the War Room goes autonomous is the moment the Tower stops being a CRUD app. Every other rebuild then pulls on that thread.

### Pacing note

R1, R2, R3 form a tight triangle — each amplifies the others. Plan to ship them in close succession (ideally 4–6 weeks total), then pause and gut-check before starting R4. R4–R8 can be sequenced more loosely based on observed user behavior (e.g., if early users do lots of mock interviews, promote R5).

---

## §5 — Per-Floor Phase Plan

Each plan: **Vision statement · Design tooling · 3–5 signature interactions · Functionality upgrades toward North Star · Effort (S/M/L/XL) · Success criteria.**

Effort scale: S (1–3 days) · M (4–7 days) · L (8–14 days) · XL (15+ days).

---

### R1 — War Room (Floor 7) ⟵ **start here**

**Vision.** A Bloomberg Terminal carved into mahogany. The room is the war table — a long tactical console where jobs stream in live, applications advance through stages with visible hand-offs, and CRO paces behind the whiteboard translating numbers into orders. Every row of data has weight. Every status change feels like an *operation*, not a form submit.

**Design tooling.**
- **GSAP** — `<CinematicEntrance>` + the "new-job arrival" choreography (row slides in from top, blueprint line draws from "discovered" lane down to the new card).
- **Motion** — Kanban layout animations (`<motion.div layout>` on each application card; drag reorder with spring preset).
- **Canvas2D** — the **Flow Lines** layer behind the Kanban: animated blueprint lines connect stages, pulse when an app moves between them, thicker lines = higher throughput, thin lines = bottlenecks.
- **Rive** — CRO character at whiteboard; state machine for Idle → Talking → Thinking → AlertSpotted. Minimum 3 poses per state.
- **Web Audio** — optional short tactical radio chirp when a new job is discovered, gavel when an app becomes "offer" (muted by default).

**Signature interactions.**
1. **Live job arrival.** Overnight worker discovers jobs → when user enters floor, cards slide in from the top of the "discovered" lane with a score (0–100) badge and tier ribbon. Blueprint line draws from the top of the screen down to the card.
2. **Drag-to-advance.** Dragging a card from applied → screening triggers the Canvas2D flow line to *thicken* permanently (pipeline health visible as line weight). Motion layout animation, spring preset, no jank.
3. **The Whiteboard scrubber.** CRO's whiteboard in the back of the room shows live numbers — active pipeline, conversion rates, stale count. Scrubbing a time-range slider below the whiteboard makes the numbers count up/down; the Canvas2D flow lines animate to match history. "What did my pipeline look like two weeks ago?" becomes a visible time-warp.
4. **Stale pulse.** Any application past its stale threshold pulses red-amber (radar-pulse primitive, orange variant). CRO turns their head toward the oldest stale when you enter the room (Rive state change).
5. **Ring-the-CRO.** A floor-specific version of Ring-the-Bell sitting on the war-table. Click → CRO dispatches all five subagents in parallel, whiteboard clears, subagent statuses appear as 5 vertical columns filling top-down with streaming text, results merge back into a 30-second CRO briefing.

**Functionality upgrades toward North Star.**
- **Job Discovery worker** — Inngest scheduled function, runs every 4 hours. Fetches from JSearch (aggregator) + Greenhouse careers JSON feeds for user's saved target companies + Lever API + Ashby public job feeds. Dedups by URL. Embeds each JD via pgvector and scores against user's saved profile. Writes to `applications` with `status = 'discovered'`.
- **User Target Profile** — new UI on War Room entry. Simple text field: *"What are you looking for?"* Parsed by CRO into sectors/titles/tiers/locations and persisted on `user_profiles.preferences`. Every job discovery run reads this.
- **Match Score column** — `applications` gets a virtual `match_score` (0–100) computed from pgvector cosine + tier weight + freshness.
- **Bulk actions** — shift-click + drag across cards, batch status change, bulk follow-up draft.
- **CRO parallel fan-out** — refactor CRO agent to dispatch all subagents via `Promise.all` in the tool execute layer rather than sequential tool loop. Return compiled result in one message.
- **Visible memory** — CRO's whiteboard backgrounds pulls live from `agent_memory` filtered by agent='cro'. When CRO learns something new, you see it get written to the whiteboard.

**Effort:** **XL** (design overhaul L + Job Discovery M + Target Profile + CRO parallel fan-out S + visible memory S).

**Success criteria.**
- Cold user types "RE finance summer internships in NYC" on first visit; returns next morning to 10+ scored opportunities already populated.
- Dragging a card between stages feels better than Linear's issue drag (subjective; test with 3 people).
- Pipeline flow lines pulse within 200ms of status change — no blocking, no layout jank.
- Zero "Phase 1/Phase 2" placeholder badges anywhere on the floor.
- Whiteboard content reads from `agent_memory` — demonstrably not hard-coded.
- Lighthouse Performance >90 on War Room route.

---

### R2 — Penthouse (PH)

**Vision.** The CEO is *already at the window* when you arrive each morning. The skyline is gold-hour. There's a briefing unfolding on glass. This is not a dashboard — it's the first minute of your workday, scripted.

**Design tooling.**
- **GSAP** — the **Morning Briefing** choreography (camera push-in, CEO turns from window, data materializes on glass panels in sequence, CEO dialogue typewriter-reveals line by line).
- **Motion** — StatCard crossfades when values change; PipelineNodes segment expansion.
- **Rive** — CEO character (turn, speak, gesture, sip-coffee, nod). Highest-fidelity Rive on the whole floor.
- **Optional ElevenLabs** — CEO voice layer. Disabled by default; settings toggle. Brief-only (never mid-conversation).

**Signature interactions.**
1. **The Morning Briefing Scene.** First load of the day (per-user timezone, configurable 7am–9am default). Elevator auto-arrives at PH. CEO is at the window with their back to camera. They turn: "Good morning, Armaan. Three things this morning." Each "thing" materializes as a glass panel over the skyline with count-up numbers. User can dismiss (skip), ask a follow-up (open dialogue panel), or accept (CEO nods, dispatches follow-up work, panel folds away).
2. **The Weather Window.** Skyline reacts to real weather (already wired in `WeatherEffects.tsx`) *and* to the **pipeline weather** — if conversion rate dropped week-over-week, morning light is slightly grayer; if an offer arrived overnight, golden light amplifies. Subtle, 5% saturation shift.
3. **Night Shift Report card.** A single glass panel shows what happened while the user was offline: *"7 jobs discovered · 3 emails triaged · 1 offer flagged."* Click to expand into full overnight timeline.
4. **Panoramic view shift.** Scrolling the dashboard doesn't scroll the window — it tilts the skyline 2° vertically. Feels like tipping your chair back.
5. **Quick Actions become actions.** Remove the "Phase 1 / Phase 2" badges. Each Quick Action dispatches a real agent call (Add Application → CRO, Research Company → CIO, Prep Interview → CPO, Quick Outreach → CMO). Dispatching shows a live status toast in-world.

**Functionality upgrades toward North Star.**
- **Proactive CEO briefing** — Inngest daily function that *calls the CEO agent* (not just writes a string). CEO compiles the night's activity, writes a `notifications` row with `type='morning_briefing'` and a structured payload (three things, tone, suggested actions). Front-end replaces the toast with the scripted scene above.
- **The Night Shift data** — aggregate `agent_logs` + new `applications` + new `emails` + changes to `application.status` since last user session. Surface as a single query fed to the Morning Briefing.
- **Quick Actions → real dispatches** — wire the 4 cards to the 4 existing agent routes. Return value surfaces as an in-world notification, not a toast.

**Effort:** **L** (primitives exist; the work is scene-direction + wiring, not new libraries).

**Success criteria.**
- CEO greets user by name, in character, with real overnight data, within 2 seconds of page paint.
- User can dismiss the briefing with spacebar / Esc (keyboard-first — Linear vocabulary).
- Skipping the briefing never prevents access to floor; it just folds away.
- 100% of Quick Actions actually dispatch a live agent call — no placeholder badges.
- A week of daily briefings with different overnight activity produces demonstrably different scripts (not templated).

---

### R3 — C-Suite (Floor 1)

**Vision.** This floor is the brain of the building. When the user rings the bell, the camera pulls back and the **entire chain of command** — all 7 departments and their subagents — lights up live as agents dispatch, think, return, merge. The user is not chatting with a chatbot; they are watching a boardroom run.

**Design tooling.**
- **GSAP** — The bell pull, camera pullback, and the merge-back choreography when briefings complete.
- **Canvas2D** — **The Dispatch Graph** — force-directed layout of nodes (CEO center, 7 department nodes ring, subagent leaves). Edges animate with flowing dots during live dispatch. Nodes glow when thinking, settle when done.
- **Motion** — Side panel layout animations; dialogue panel slide-in.
- **Rive** — CEO character with the richest pose set in the building (at desk, walking, pointing at graph, considering, delivering verdict). ≥8 state transitions.
- **Optional ElevenLabs** — CEO voice overlay for bell-ring responses; off by default.

**Signature interactions.**
1. **The Physical Bell.** A brushed-gold bell sitting on the CEO's desk (SVG + GSAP wobble on click). Click → bell rings audibly (if sound on), low-frequency resonant *bong*, building lights dim 15% for 800ms across all floors (propagated via a root CSS var), camera slow-pulls back, dispatch graph fades in over the desk.
2. **Live Dispatch Graph.** As the CEO decides which departments to engage, matching nodes pulse. As each department executes, edges between CEO and that node animate with flowing particle dots. When a subagent is invoked, a sub-edge draws from the department node to the subagent leaf. When results return, the dot flow reverses. Node settles gold = success, amber = partial, red = error.
3. **Interleaved narration.** As dispatches complete, CEO delivers the synthesis line by line in a typewriter dialogue panel at the bottom. Each line is gated on the corresponding node settling. User sees *both* the reasoning AND the underlying compute simultaneously.
4. **Ad-hoc directives.** At any point in the ring-the-bell flow, user can press `/` to inject a new instruction ("also have CPO pull prep for Hines"). CEO re-plans, graph updates live.
5. **Boardroom seat.** The CEO dialogue panel lives in "a chair at the boardroom table" — bottom-left seat-shaped frame, not a chat sidebar.

**Functionality upgrades toward North Star.**
- **CEO parallel fan-out** — `src/lib/ai/agents/ceo-orchestrator.ts` refactor: after CEO produces `CeoDecision`, dispatch all departments with `dependsOn: []` in `Promise.all`; those with dependencies wait on `Promise.all(deps).then(...)`. No more sequential `maxSteps: 3` bottleneck.
- **Event-streamed dispatch** — use AI SDK v6 `streamText` + data stream parts so the front-end can render node state changes live. `writeData({ type: 'agent-start', agent: 'cro' })` → `{ type: 'agent-complete', agent: 'cro', summary: '...' }`.
- **Dependency DAG from `dependsOn`** — currently schema-supported but not wired in executor. Wire it.
- **Unprompted CEO** — threshold-based triggers: when `agent_logs` or pipeline state crosses configured thresholds (3+ stale apps, 2+ rejections same-day, offer arrived), Inngest fires an event, CEO auto-dispatches a briefing, result queues as high-priority notification. Delivered via pneumatic tube (see §6).
- **Cross-agent memory bridge** — extract high-importance memories into a shared `user_profiles.shared_knowledge` jsonb. CEO's system prompt includes this. Other agents can read it. The "Blackstone prefers non-technical openers" insight reaches CMO without manual plumbing.

**Effort:** **XL** (floor redesign L + parallel dispatch refactor M + event streaming M + Rive CEO L + dispatch-graph Canvas S).

**Success criteria.**
- Ringing the bell with "How's everything looking?" triggers ≥3 departments to dispatch in parallel; user visibly sees them run concurrently.
- Total bell-to-briefing time <60s for a "full briefing" command (down from current sequential).
- Pressing `/` mid-dispatch lets user inject a new instruction and the CEO adapts the plan.
- Three threshold triggers fire autonomously over a week of test usage (stale threshold, rejection cluster, offer arrived).
- CEO's briefing references knowledge first learned by a sibling agent (CMO referencing CRO's pipeline insight).

---

### R4 — Lobby (L)

**Vision.** The front door of the Tower. The moment where a first-time user *decides* whether this building is real. Current Lobby is a dark reception hall with a sign-in card; target is a **cinematic arrival scene** for new users and a quiet, respectful welcome-back for returning. Pay attention to *who is arriving* — existing auth cookie = low-ceremony fast lane; no auth = full scripted arrival. By R4 the rest of the building is autonomous, so the Lobby can promise autonomy truthfully.

**Design tooling.**
- **R3F** — A short (~6 second) exterior approach scene on first-ever visit only: camera flies through the skyline, passes the Tower's crown, dollies down past lit windows into the revolving door. 3D model kept cheap (maybe 5–10k tris total).
- **GSAP** — Arrival choreography timeline (exterior → interior transition → Concierge greeting → sign-in card materializing).
- **Rive** — **The Concierge** character (new). Warm professional, behind a subtle desk. State machine: idle → greeting → listening → directing → fading-out. 4-5 poses minimum.
- **CSS / GSAP primitives** — keep existing dust particles, spotlight, directory — but restage them with proper depth (foreground / midground / background layers) instead of flat overlay.
- **Web Audio** — distant ambient lobby tone (piped classical, footsteps, faint city hum from the door). Muted by default.

**Signature interactions.**
1. **The Arrival.** First visit ever: camera starts above the NYC skyline, spots the Tower, approaches it at ~30mph, descends past lit office windows (each randomly animated), decelerates into the revolving door, passes through, and resolves onto the lobby interior. Skippable after 1s with spacebar. Never plays again for returning user.
2. **The Concierge greeting.** First visit: after arrival, Concierge is standing behind the desk. *"Welcome. I'm [name]. Tell me what you're looking for."* User types a freeform description of the job search. Concierge (Rive state change) nods, types into a terminal-style intake form visible to user, fills a structured `user_profiles.preferences` record. "While you complete sign-in, I'll brief the building." Elevator ding; floor indicator lights up.
3. **Fast lane for returning users.** Existing session cookie → skip the arrival scene, Concierge replaced with a dim silhouette that says *"Welcome back, [name]."*, elevator doors are already open, one click to Penthouse. Zero ceremony, low latency.
4. **The Directory as a living map.** Current directory listing becomes a *building cross-section* on the right — an illustrated vertical slice of the Tower with each floor's room visible as a tiny diorama. Hovering a floor lights it and whispers its current status ("WAR ROOM — 23 active ops"). New unlocks animate in when a milestone is hit during onboarding.
5. **Handoff to Morning Briefing.** If this is the user's first-ever session and Job Discovery (R1) has returned results during the onboarding conversation, the elevator auto-carries them to Penthouse where the CEO is already standing at the window with a briefing ready — their first Morning Briefing is *about the jobs the building already found them.* Wall-to-wall autonomous experience from first click.

**Functionality upgrades toward North Star.**
- **Target profile onboarding** — the Concierge conversation produces a structured profile (role targets, sectors, companies, locations, salary band, base resume if uploaded, preferred tones) and persists it to `user_profiles.preferences`. This is the input every agent has been waiting for.
- **Base resume upload** — drag a PDF into the Concierge chat → AI parses into structured markdown → saved as `documents.type = 'resume_base'`. Powers all R5 resume tailoring.
- **First-run Job Discovery trigger** — onboarding completion fires an immediate Inngest job that runs CRO's Job Discovery against the new profile. Results populate before the user reaches the Penthouse.
- **First-run Morning Briefing** — a one-time override that generates a Morning Briefing scene based on the just-discovered jobs (not overnight data), giving the new user a complete autonomy preview in their first 2 minutes.
- **Progress-aware building directory** — the cross-section illustration reads from `progression_milestones` and visually locks / unlocks floors. Matches the existing progression system, just in-world.

**Effort:** **L** (R3F exterior is the heaviest new element; the arrival choreography is precise but contained).

**Success criteria.**
- New-user first-click-to-first-Morning-Briefing <3 minutes.
- Arrival scene plays at 60fps on MacBook Air M1 baseline.
- Returning users never see the arrival scene again — strict one-time-per-account.
- Concierge captures a usable target profile from 95% of test conversations.
- Directory cross-section's floor states match actual backend progression milestones with zero drift.

---

### R5 — Writing Room (Floor 5)

**Vision.** The quiet floor. A single desk lamp. Paper drafts stacked. A typewriter sculpture on the side. When the user drops a job description, the room goes quiet — CMO picks up a pen — and the user watches a cover letter compose itself in real time as if the character is writing it. When CMO finishes, the paper slides out as a PDF preview with that *Remotion-rendered* cinematic scroll-reveal quality you can't get from HTML.

**Design tooling.**
- **Motion** — Editor panel transitions, document list drawer, tone-variant picker.
- **Remotion** — **The Preview.** Render the tailored cover letter as a Remotion composition (scroll-zoom, typewriter fill, subtle page-turn). Embed as an `<iframe>` preview right in the editor. Signature use of Remotion that no SaaS I've seen does.
- **GSAP** — Typewriter-with-pen-glow animation (the character writing the letter with a lit pen tip).
- **Rive** — CMO (leaning over desk, writing, pausing, looking up, crumpling a draft, nodding). High expression range.
- **Web Fonts** — A serif-italic display font as the cover-letter body face so the preview reads as *writing*, not *UI*.

**Signature interactions.**
1. **The Typewriter.** Physical SVG typewriter on the right side of the room. Click → drop-zone opens for a JD URL or text. CMO walks over (Rive transition), sits at the desk, starts typing. Each line fills in with pen-glow. Live, not queued-and-dumped.
2. **Tone dials.** Three physical knobs labeled *Formal · Conversational · Bold*. Twisting regenerates in-place with a cross-fade; previous draft dims into the desk-paper stack (visible history).
3. **Paper stack.** Every generated draft physically stacks on the corner of the desk. Click one → it rises to the top, rest fade. A flip-through interaction (arrow keys) scrolls through versions.
4. **The Resume Mint.** Second signature moment. A smaller sub-station in the room: a "resume stand." Drop a JD → camera zooms to a base-resume page, sections glow as CMO rewrites bullets to match JD keywords, the new page slides out, stamped with a version number. PDF export button below.
5. **Refinement loop.** After a draft, a single input at the bottom: *"What needs to change?"* Type "too formal, add personality" → CMO re-drafts with your feedback threaded in. Visible "v1 → v2" stack.

**Functionality upgrades toward North Star.**
- **Resume base model** — new `documents.type = 'resume_base'`. Upload UX (PDF → parsed into structured sections via a small AI pass → stored as markdown). Lives in Settings and the Writing Room's "resume stand."
- **Resume tailoring tool** — new CMO tool `generateTailoredResume(applicationId, jobDescription)`. Pulls base resume, rewrites experience bullets for keyword match, stores as `type='resume_tailored'` with `parentId = base resume id`, `version` auto-increments.
- **Cover letter refinement tool** — new CMO tool `refineCoverLetter(documentId, feedback)`. Cross-session: loads prior draft, re-prompts with user feedback, versions up.
- **A/B tone generation** — generate two tone-variant drafts in parallel on first pass; user picks, winner auto-persists, loser discarded (but kept as hidden version for undo).
- **PDF export** — server action using `@react-pdf/renderer` or playwright html-to-pdf. Google Drive export already exists (`src/app/api/drive/export/route.ts`) — extend to return a direct PDF URL too.

**Effort:** **L** (resume tailoring + refinement loop both use existing structured-generator patterns).

**Success criteria.**
- User can generate a tailored resume for an application in <30s from drop.
- Cover letter refinement loop: user types feedback → new draft appears in <15s, old draft visibly stacks.
- Remotion preview renders cover letter with the target serif face at publication quality.
- Three tone variants demonstrably different on same input (formal ≠ bold).
- PDF export produces a file indistinguishable from a hand-written cover letter at 100% zoom.

---

### R6 — Briefing Room (Floor 3)

**Vision.** The whiteboard room. CPO drills the user with mock interview questions. User answers into a text box (or voice, if enabled). The whiteboard fills with the STAR framework scaffolding live as the user speaks. After the drill, everything on the whiteboard auto-snapshots into a debrief document and slides off into the filing cabinet.

**Design tooling.**
- **GSAP** — Teletype feeds (keep — they're already the best motion on this floor). Whiteboard marker writing.
- **Motion** — Briefing panel layout animations, question-card presentation.
- **Rive** — CPO (pointing at whiteboard, nodding, raising eyebrow, interrupting gesture). Must feel like *being coached*.
- **Web Speech API** — Optional voice mock interviews (speech-to-text input, TTS question output). Off by default.

**Signature interactions.**
1. **Mock Interview Drill mode.** Button labeled "Drill Me." Click → CPO walks to whiteboard (Rive), picks a question from the packet, speaks it, whiteboard shows *S · T · A · R* columns empty. User types (or speaks) answer. As they type, keywords highlight and land under the correct column. CPO reacts — nodding for strong Situations, tapping whiteboard for missing Action specifics.
2. **Live STAR coaching.** Mid-answer, if CPO detects vague specifics, they interrupt with a Rive raise-hand + dialogue bubble: *"What specific Action did you take? I need a verb."* User refines. The whiteboard updates.
3. **Timer discipline.** Top-right of whiteboard shows a live timer. 90s soft limit. Over it, timer turns amber; CPO makes a "wrap up" gesture.
4. **Auto-debrief.** Drill ends → whiteboard content auto-exports to `documents` with `type='debrief'`, filed under the interview. Whiteboard clears with a sleeve-wiping Rive animation. The debrief appears as a stack on the side of the room (visible history).
5. **The Intel Feeds (keep).** Top teletype intel feeds stay, but now they update during the drill — they flash "LIVE: question generated for [company]" as CPO pulls questions.

**Functionality upgrades toward North Star.**
- **Live mock interview agent** — new CPO tool `startMockInterview(applicationId, mode: 'text' | 'voice')`. Loads prep packet, picks 3–5 behavioral questions scoped to company/role, enters turn-taking loop. Each answer graded on STAR completeness (Claude with structured output: `{ situation: 0-10, task: 0-10, action: 0-10, result: 0-10, verbs_count: int, specifics_count: int }`).
- **Mock debrief generator** — post-drill, compile Q/A pairs + CPO scores + per-answer feedback into a `documents.type='debrief'` record linked to the interview.
- **Mock history surface** — Briefing Room sidebar shows prior drills as debriefs, score-over-time for each company.
- **Packet regeneration trigger** — if application moves to `interview_scheduled` for a company whose packet is >7 days old, auto-regenerate. Notify user via pneumatic tube (see §6).

**Effort:** **L** (live mock interview loop is genuinely new work; teletype keeps).

**Success criteria.**
- User can complete a 3-question mock interview in a single session, see STAR-scored feedback per answer.
- STAR whiteboard animation is readable — you can literally see your Situation appear under the S column.
- Debrief document contains all Q/A plus numeric scores plus CPO's narrative feedback.
- Voice mode works end-to-end (dictate answer, hear next question) in Chrome/Safari.
- Prior-drill history renders on floor entry.

---

### R7 — Situation Room (Floor 4)

**Vision.** Mission control when something is on fire — except the control is graceful. Alerts float on a live map of outreach flight paths. COO (Dylan Shorts) stands at the desk coordinating. Every stale follow-up has a drafted response ready to approve with a 2-hour undo window. Pressing "approve all" does *not* feel reckless — it feels like a COO running the room.

**Design tooling.**
- **Canvas2D** — **The Situation Map.** Top half of the room shows a stylized map of the user's outreach network. Dots per company, pulsing when a thread is live. Flight paths animate when outreach leaves the building. Pairs beautifully with the existing alert-ring motion already on the floor.
- **GSAP** — Alert card entrance, ring-response choreography (rings pulse when user selects an alert).
- **Motion** — Alert list layout animations (reorder by priority on status change).
- **Rive** — COO at desk with multiple monitors (3 pose minimum: idle-typing, alert-turn, pointing-at-map).

**Signature interactions.**
1. **Alert rings become reactive.** Click a stale alert → concentric rings in the background pulse outward in that alert's color (amber urgency, red at-risk). Selection visibly "escalates."
2. **The Outreach Flight Paths.** Canvas2D map: each outreach email draws an arc from the user's node to the company's node. Sent = solid line, pending = dashed, bounced = red break. Hovering over an arc shows the thread summary.
3. **Approve-all with undo.** Bottom-right action: *"Approve all 4 drafts (2h undo)"* button. Click → all four drafts animate into "flight" along their arcs. A countdown bar at the top right shows the undo window. Click → thread cancellation; animations reverse.
4. **The pneumatic tube inbox.** Cross-floor notifications physically arrive at the Situation Room as tube canisters. Click → unfolds into a full detail card. This is where proactive push lives in-world.
5. **Deadline scrubber.** Bottom strip shows next 14 days as a timeline. Drag an alert onto a future day → reschedule. Drop on "today" → act now.

**Functionality upgrades toward North Star.**
- **Draft-and-queue auto-follow-up** — Inngest scheduled function, daily. Any application past its stale threshold automatically gets a follow-up email drafted by CMO, queued in `outreach_queue` with `status='pending_approval'`. Surfaces as an alert on Floor 4.
- **Approve-with-undo** — approve mutation updates status to `approved` but delays Resend send by 2h; undo within window cancels. Cron tail re-checks and sends if still approved.
- **Calendar conflict resolver** — COO tool that detects scheduling conflicts between calendar events and surfaces them as alerts.
- **Pneumatic Tube notification system** — replace current `NotificationToast` with the tube-canister model (see §6.1). All proactive agent push lands here first before fanning out.

**Effort:** **L** (alert engine + undo + tube visual + flight paths).

**Success criteria.**
- Follow-up drafts appear automatically overnight for any app past threshold.
- Approve-all sends 4 emails with a visible 2h undo bar.
- Flight path map renders 50+ nodes at 60fps.
- Pneumatic tube delivers at least one proactive alert per session (demonstrating real proactive push).
- Zero reliance on browser `alert()` or generic toast libraries anywhere in the flow.

---

### R8 — Rolodex Lounge (Floor 6)

**Vision.** A warm private lounge. A physical rotating rolodex on a mahogany side table. CNO and CIO share the room with a clear visual divide — CNO's side is warm leather chairs + contact cards, CIO's side is a glass wall of research dossiers. User can sit down on either side.

**Design tooling.**
- **R3F** — **The Rolodex.** 3D physical rolodex (~300 triangles). Scroll wheel rotates it. Cards have slight paper-bend depth. Tap a card → it flies out, camera zooms, card fills center.
- **Motion** — Contact grid layout (fallback when user prefers 2D) + research dossier drawer animations.
- **GSAP** — Room entrance, side-switch camera pan (CNO ↔ CIO).
- **Rive** — CNO (warm host; inviting gesture, nodding, page-flipping) + CIO (cerebral; stacking papers, reading, pointing at screen).
- **Lottie** *(exception)* — If a great "card flipping" Lottie exists already, acceptable here. Otherwise Rive.

**Signature interactions.**
1. **Physical Rolodex.** R3F scene. Rotates on scroll. Each card shows a contact's face (or initials avatar), name, company, relationship warmth as card tint (cold → blue-gray, warm → cream, hot → amber). Click → card flies out, camera zooms.
2. **Warmth decay visible.** Cards physically cool over time. A contact last touched 30 days ago shows visibly desaturated color. CNO gestures at the coldest cards on entry.
3. **Side-switch.** Keyboard `[` and `]` (or click CNO/CIO portraits) swing the camera to the CNO or CIO side. CNO side = rolodex + warmth UI; CIO side = research dossier wall.
4. **Dossier wall.** CIO's side: grid of company research dossiers, pinned to the wall with color-coded tier ribbons. Click → dossier unfolds into full intel with recent-news ticker, key people, interview intel, culture signals.
5. **Research freshness.** Dossiers >7 days old physically yellow/curl at the corners. Click "refresh" → CIO walks to the wall and re-pins an updated copy (Rive + GSAP).

**Functionality upgrades toward North Star.**
- **CIO research scheduler** — daily Inngest job: for each company with a `companies.researchFreshness > 7 days` AND at least one active application, auto-refresh research.
- **Contact warmth decay** — daily cron updates `contacts.warmth` based on days-since-last-contact (decay curve). Triggers CNO alert at threshold.
- **Find-in-network semantic search** — new CNO tool `findWarmIntros(companyId)` — pgvector similarity between `contacts` + `companies` to surface 2nd-degree connections ("You have a friend at Blackstone's sister firm"), returned as potential intro routes.
- **Auto-draft warm intro** — given a target company with no direct contact, CNO + CMO collaboratively draft a LinkedIn outreach to the warmest proxy contact asking for intro. Queued in outreach_queue.

**Effort:** **L** (R3F rolodex is the heaviest new component; rest reuses existing).

**Success criteria.**
- Rolodex rotates at 60fps with 200+ cards loaded.
- Side-switch via keyboard is instant (<150ms).
- CIO auto-refreshes any stale research without user prompt within one week of deploy.
- Warm-intro suggestion surfaces when user adds an app to a company with no direct contact.

---

### R9 — Observatory (Floor 2)

**Vision.** This is the *contemplation* floor. Panoramic. Cool blue. You come here to see patterns, not take action. The centerpiece is a 3D **Orrery** — the user's entire job-search pipeline rendered as celestial bodies orbiting a central sun. CFO stands at a panoramic window with a chart projected onto it.

**Design tooling.**
- **R3F** — **The Orrery.** Instanced spheres (one per application), orbits at three radii (discovered/applied = inner fast, screening/interview = mid, offer = far and slow). Color-coded by tier. Status-change = flash. Interview-scheduled = satellite. Offer = supernova explosion.
- **Motion** — 2D analytics panels (conversion funnel, velocity chart, weekly trend).
- **GSAP** — Entrance, orrery camera dolly on selection.
- **Rive** — CFO (examining charts with calipers, pointing at trends, lowering glasses).

**Signature interactions.**
1. **The Orrery.** Center of the floor. Click a planet → camera dollies in, planet grows, info panel appears showing the application's full history. Scrub a timeline slider → orrery rewinds (planets return to prior orbits, supernovae reverse into planets).
2. **Pattern overlay modes.** Top-right toggle: *Orbit (by stage) · Tier (by brand) · Velocity (by speed).* Switches the orrery's layout with a GSAP morph.
3. **Celestial benchmarks.** Dim reference orbits show target conversion rates. User's planets ahead of schedule glow brighter; behind schedule dimmer.
4. **The CFO's whiteboard.** Projected on the panoramic window: live conversion funnel + weekly trend + pipeline velocity. CFO turns and speaks when a metric crosses a threshold ("Your applied→screening rate just dropped 4 points").
5. **Export to PDF.** Entire floor snapshots as a "State of the Month" PDF with the orrery, charts, CFO commentary. Stored in `documents.type='state_report'` (new enum value).

**Functionality upgrades toward North Star.**
- **CFO proactive analyst** — threshold-based CFO trigger: any stat moves >5% week-over-week → CFO auto-composes a short analysis note, delivered via pneumatic tube.
- **State of the Month report** — monthly Inngest job; CFO compiles a report, saves to documents.
- **Benchmarking data** — integrate known RE-finance conversion benchmarks from `CHAIN-OF-COMMAND.md` tier system into reference orbits.
- **Agent cost panel** — show per-agent spend from `agent_logs.cost_cents` (the only analytics floor that should surface this).

**Effort:** **XL** (orrery is a real 3D scene; rest is chart polish).

**Success criteria.**
- Orrery renders 100+ applications at 60fps.
- Clicking a planet zooms in and shows full application history within 200ms.
- Pattern overlay modes morph smoothly between views.
- Monthly report PDF auto-generates and surfaces on the 1st of each month.

---

## §6 — Creative Additions (what you haven't asked for)

Ten unsolicited proposals. Each is tied to the North Star. None breaks the metaphor.

### 6.1 The Pneumatic Tube — in-world proactive push channel

Floor 4 gets a physical pneumatic tube running up the side of the room. When *any* agent has proactive news, a tube canister *thunks* into the receiver. User opens it; animated paper unfolds with the alert. Sound: heavy compressed-air whoosh + metal click.

*Why:* Replaces generic toasts. Makes proactive push the emotional centerpiece it deserves to be. And it's a simple GSAP scene + Web Audio + SVG paper-unfold, so it's cheap.
*Ties to North Star:* This is the delivery layer for autonomous agent output (#4 in §2 gap).

### 6.2 The Night Shift Report

On the first app open of each calendar day, the elevator's floor indicator shows a small counter: **"NIGHT SHIFT · 7 JOBS · 3 EMAILS · 1 OFFER."** Clicking expands into a full overnight activity log scene (camera pans across a brief "what happened while you slept" comic strip).

*Why:* Makes offline agent work visible. Users need to *feel* that the Tower is working when they're not looking.
*Ties to North Star:* Proactive push is worthless if users don't see it happened.

### 6.3 Dispatch Trace (named, reinforced)

C-Suite's ring-the-bell produces not a text response but a **live orchestration graph** with flowing dots along edges. User watches the chain of command execute. This is a named ritual, not just an animation — branded in the UI as *"Dispatch Trace."*

*Why:* Users' trust in agent systems scales with *legibility*. If they can see the work, they trust the work. (Rauno Freiberg principle: show the in-between.)
*Ties to North Star:* #5 Agent parallelism.

### 6.4 The Signal Log

A small drawer at the bottom of every floor: a scrolling log of *signals* (email received, app moved, threshold crossed, agent dispatched). Like a Bloomberg Terminal news ticker — always visible, never the focus. Hidden by default, keyboard `~` to toggle. Pure CSS + live SSE.

*Why:* Power users want density. This gives them the Bloomberg feel without crowding the primary surface.
*Ties to North Star:* Makes autonomous work legible moment-to-moment.

### 6.5 The Building Seasons

Layer on top of day/night: **quarterly seasons** that *very subtly* shift the skyline — autumn haze (September), snowfall ledges (December), cherry-blossom tint (April). Combined with **recruiting-calendar awareness**: in Sep–Nov (peak recruiting) the building's lighting is slightly tenser; in Mar–May (post-offer) lighter.

*Why:* Long-term emotional investment. A user who's been in the Tower across seasons has *seen* their building change. Cheap (CSS var overrides in `DayNightProvider`) but creates a one-year narrative arc.
*Ties to North Star:* Retention = autonomy's multiplier.

### 6.6 The Concierge Onboarding

*Note: promoted from "creative addition" into the R4 Lobby rebuild above. Kept here for cross-reference.*

The Concierge is a new character (not a repurposed department head) living exclusively in the Lobby. Role: greeter + onboarding guide + first-contact agent. Walks new users through a freeform target-profile conversation, parses it into structured preferences, uploads their base resume, triggers first-run Job Discovery, and hands them off to the CEO's first Morning Briefing.

*Why:* The first 5 minutes determine retention. Converting "sign up" → "your Tower found 3 jobs while you were reading this" is magic.
*Ties to North Star:* #1 Job Discovery becomes the first interaction, not the fifth.

### 6.7 The Interview Replay Vault

Every completed mock interview (R5) stores to a "vault" in the Briefing Room — a set of physical binders on a shelf. User can re-enter any binder to replay the drill, see their scores, retry the same questions. Over time, binder spines age, and the shelf fills — visible progression.

*Why:* Interview prep improves through repetition. Making prior sessions *physical* in the room incentivizes return.
*Ties to North Star:* #6 Interview simulation, compounding value over time.

### 6.8 The Offer War Room

When an offer arrives, the C-Suite gains a temporary **Offer War Room** annex (door appears on the wall). Inside: CFO + CRO + CNO jointly coach the user through negotiation. Competing offers stack as physical folders on the table. Comp benchmarks appear as a live chart on the wall. Negotiation scripts generate and refine in real time.

*Why:* Offers are rare and high-stakes. A dedicated scene makes them feel like a *culmination*, not a status change.
*Ties to North Star:* #7 Offer evaluation. Scope-controlled: the room only exists when relevant, so no upfront cost until R8 or later.

### 6.9 The Monetization Landing (Pro tier inside the building)

When a free-tier user hits a limit (10 apps), they see it *in the building*: a closed door on Floor 7 labeled *"Capacity — upgrade to continue."* Clicking opens a scene where the elevator takes them to a *secret* floor — the **Membership Office** — where a clean, calm rep explains Pro. Pricing cards are *in-world* panels, not a modal. No dark patterns.

*Why:* Monetization as metaphor, not as bolted-on paywall. Stripe schema is already wired; this is the UX wrapper.
*Ties to North Star:* Sustainable operation. Also aligns with user's "Analytical, not emotional" brand — no growth-hacker pressure tactics.

### 6.10 The Signature Sound Palette

Optional and muted by default, but worth spec'ing once so we don't accidentally ship inconsistency:

| Event | Sound | Source |
|---|---|---|
| Elevator arrival | Soft chime, single note | Web Audio sine |
| Pneumatic tube | Compressed-air whoosh + metal click | Sample (royalty-free) |
| Bell ring | Resonant bong | Sample |
| CEO speaking | Warm baritone (ElevenLabs optional) | Streamed TTS |
| Radar ping | Soft ping | Web Audio |
| Gavel (offer) | Single gavel strike | Sample |
| Typewriter (Writing Room) | Muted mechanical key | Sample loop |

All under a single `--sound-enabled` root var, all trigger-scoped, all pause on window blur.

---

## §7 — Risks & Open Questions (needs your sign-off before R1)

Questions listed in priority order. Numbered so you can just reply *"1: A, 2: B, …"*.

### Must-resolve before R1 starts

1. **Job Discovery source priority.** Which feeds first?
   - (A) **JSearch only** (simplest — one API, broad aggregation; best default)
   - (B) **Greenhouse + Lever + Ashby public JSON feeds** (more signal, Tier-1 firms like Blackstone/Brookfield live there; more plumbing)
   - (C) **Both — JSearch + direct ATS** (recommended for production but ~2x implementation time)
   - My recommendation: **C** to start if you have the time; else **A** first, **B** after. Flag if you have LinkedIn scraping appetite (legally gray — I'd default to no).

2. **Auto-apply scope.** How far should autonomous submission go?
   - (A) **Draft + queue for human approval only** (current `outreach_queue` model; safest)
   - (B) **Direct-to-inbox application emails** (when job source is an email) — auto-send with undo window
   - (C) **ATS form-filling via Playwright** (Greenhouse/Lever/Workday) — highest impact, highest risk (could flag user's apps as bot-submitted; some ATSes prohibit it in ToS)
   - My recommendation: **A + B** for R1. Defer C until after we see real user behavior.

3. **Resume base data entry.** How does the user onboard their base resume?
   - (A) **PDF upload → AI parses into structured markdown** (best UX; one small LLM pass)
   - (B) **LinkedIn scrape** (requires OAuth we don't have)
   - (C) **Manual markdown entry** (simplest; worst UX)
   - My recommendation: **A**. `@react-pdf/parser` + one Claude pass.

4. **Character rendering plan: Rive migration.** VISION-SPEC locked Option A (2D illustrated) for V1. I'm proposing Rive (designer state machines) as the upgrade path for characters that need rich pose sets (CEO, CMO, CPO, CRO). Do you want me to:
   - (A) **Stay 2D static + CSS transforms** (current; lowest cost; least expressive)
   - (B) **Move all characters to Rive** in each floor rebuild (highest quality; need Rive files — either we commission them or I spec them)
   - (C) **Hybrid** — Rive only for the 4 characters above; 2D-static for CNO/CIO/CFO/COO
   - My recommendation: **C**. Pragmatic — the 4 most-used characters get the expression range.

5. **Morning Briefing policy.** First-load-of-day scene:
   - (A) **Auto-play, skippable** (recommended — feels like a ritual)
   - (B) **Pending banner that user triggers** (safer; less magical)
   - (C) **User-configured** (both options in Settings)
   - My recommendation: **C**, default to **A**.

### Can-be-deferred to mid-phase

6. **ElevenLabs voice budget.** CEO voice would cost ~$0.18 / 1K chars. At 3 briefings/day × 200 chars = $0.11/day/user. Reasonable for Pro tier. Want to greenlight this for R2's Morning Briefing, or defer?
   - My recommendation: **Defer to R3**, ship R2 without voice, add voice as an "upgrade reveal" moment.

7. **Offer data model.** The `applications.salary` field is currently a free-text string. For R8 (Offer Evaluator) we need structured comp. Options:
   - (A) **Extend `applications`** with `base_salary_cents`, `bonus_cents`, `equity_value_cents`, `housing_cents`, `sign_on_cents`
   - (B) **New `offers` table** with one-to-many from applications
   - My recommendation: **A**. Interns rarely have multiple offers per app.

8. **Inngest adoption.** Background worker durability (#9 in §2) strongly benefits from Inngest. Cost: $20/mo for hobby tier (we'd fit). Alternative: Vercel Queues (newer, beta). Your call:
   - (A) **Adopt Inngest** (battle-tested; most agent-pattern examples use it)
   - (B) **Vercel Queues** (beta; on-platform; cheaper at scale)
   - (C) **Stay on Vercel Cron** and live with brittleness
   - My recommendation: **A** for R1; migrate to **B** if it hits GA and beats Inngest.

9. **Subscription paywall timing.** R9 has a "Membership Office" concept (§6.9). When to ship the paywall itself?
   - (A) **Ship gates behind R1 War Room** (immediate revenue; risks annoying early users)
   - (B) **Ship after R3** (autonomous loop is demonstrated first; user is invested)
   - (C) **Ship after R5** (once interview drilling is the stickiest feature)
   - My recommendation: **B**. Freemium at 10 apps, gate auto-apply + mock interviews behind Pro.

10. **Observability.** We have `agent_logs` but no dashboard. Do you want a *hidden* admin route (`/admin/logs`) for you-the-developer to watch live agent runs?
    - My recommendation: **Yes, behind `OWNER_USER_ID`** (env var already exists).

### Nice-to-know

11. **Character portrait art direction.** Locked-in V1 rendering is Option A (2D illustrated with parallax). For R3 (C-Suite), the CEO's Rive file would need ≥8 pose states. Two paths:
    - (A) **Commission a designer** via Rive community (~$500, 2 weeks)
    - (B) **AI-generate base poses + Rive-animate in-house** (~3 days, lower polish)
    - My recommendation: ask me when we get to R3. Early R1–R2 doesn't need new character art.

12. **Analytics privacy.** Daily snapshots capture pipeline state. Confirm you want this retained indefinitely (for year-over-year trends) vs. rolling 90 days.
    - My recommendation: **Indefinite**. Small data, high user-value over time.

---

## Appendix A — Shared Primitives Shopping List

To extract from existing files into `src/components/world/primitives/`:

| From | To | Notes |
|---|---|---|
| `lobby-client.tsx` GSAP tl | `<CinematicEntrance>` | Props: `stagger`, `duration`, `ease`. |
| `lobby-client.tsx` spotlight | `<SpotlightGlow>` | Props: `size`, `color`, `opacity`. |
| `lobby-client.tsx` ParticleField | `<ParticleField>` | Props: `count`, `palette`, `speedRange`. |
| `lobby-client.tsx` SignInCard 3D tilt | `<TiltCard>` | Props: `maxRotate`, `hoverGlowColor`. |
| `lobby-client.tsx` DirectoryRow shimmer | `<ShimmerSweep>` | Trigger: `hover` or `active`. |
| `penthouse-client.tsx` PulseRing | `<RadarPulse>` | Props: `color`, `size`, `ringCount`. |
| `penthouse-client.tsx` GoldUnderline CSS | `<GoldUnderline>` | Delay prop. |
| `penthouse/StatCard.tsx` counter-pulse | `<CountUp>` | Props: `from`, `to`, `duration`. |

One R0 prep task before R1: extract these into primitives and refactor Lobby + Penthouse to consume them. Estimated **M** effort. Pays back starting at R1.

---

## Appendix B — What We're Explicitly NOT Doing

- Rewriting `PersistentWorld` / skyline engine. They work, they're good, they're the right pattern.
- Migrating off Drizzle schema-only + Supabase REST. That architecture is correct for our deploy constraints.
- Keeping the Lobby as-is. It is *not* the final bar — it's the strongest current reference, and it gets its own rebuild at R4.
- Adopting Tailwind v4. Stay on v3 JS config per `CLAUDE.md`.
- Shipping custom cursor again. Standard cursor with `:hover` states is the ruling per BUG-007.
- Adding mouse-driven parallax to backgrounds. Autonomous Ken Burns-style drift is the ruling.
- Introducing any shadcn/ui primitives into floor UI. Tower primitives only.

---

**End of roadmap.** Reply to §7 questions to unblock R1 War Room start.
