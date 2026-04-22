# THE TOWER — BRIEF

> **This is a Brief, not a Spec.**
> A Spec tells Claude what to build. A Brief tells Claude what must feel true, what must not break, where to look, and what "done" tastes like. Claude does the 90% research, then the 10% execution. If this doc ever starts telling Claude *which library* or *which mechanic* — that's a bug in this doc, not a standard to uphold.

**Audience.** Any Claude session working on The Tower. And Armaan, once per phase.
**Disposition.** Direction, not instruction. Research first, execute last. Quality and completeness are climate, not sections.
**Status.** Awaiting sign-off on §11 (Open Questions) before R0 starts.

---

## For the Human (Armaan — read this first)

You open a Claude session. You say: *"Let's do R0."* (Or R1, or *continue*.) That's kickoff.

Claude reads this doc and acts on it. Most of its time goes to research — references, sketches, options — and a minority to code. When a phase is done, Claude pings you. You click through, react, say *ship it* or *change this.* No daily cadence, no standup, no PR queue.

**You do not need to know:** git worktrees, which libraries Claude chose, what a Rive state machine is, or any section below marked *(for Claude sessions)*. If any word in this doc confuses you, tell Claude — jargon here is a bug, not a feature.

**You do need to:** answer questions when Claude asks (usually batched at phase kickoff), click through what Claude built when it pings, say when something feels wrong.

That's the whole job.

---

## §0 — How to read this (for Claude sessions)

### The principle

This doc does not tell you how to build. It tells you:
- What *done* feels like (Intent).
- Where to steep before deciding (Reference Library, §5).
- What you cannot break (Climate, §4 — Immovables below).
- What you must research before choosing (per-phase Research demands).
- How we'll know it landed (Proof).

The *how* — libraries, mechanics, animations, copy — is yours to find. If this doc ever tells you which library or which interaction count, treat that as sparks, not specs. Our failure mode as creators is being over-prescriptive; don't collude with it.

### The 90/10 split

Most of your time on any phase is research, not execution. Before code:

1. Read the References in §5 that the phase calls out. Read — not skim.
2. Sketch at least three alternative takes on the central moment. Two should feel wrong. Knowing *why* they feel wrong is how you find the right one.
3. Write a **Taste Memo** (100–200 words) — *"What I'm going for in this phase is…"* — and commit it to `.tower/research/{phase-id}/taste-memo.md`.
4. Commit an annotated **references.md** listing what you actually studied and what you took.
5. Commit **sketches/** — the three alternatives. Prose, ASCII, diagrams, whatever communicates.
6. Commit **open-questions.md** — what you don't know yet and expect to discover.
7. *Only then:* build.

If you're writing code before these artifacts exist, you are in the wrong mode. Stop. Go back. The Phase Ledger verifier (§9) enforces this — build commits without prior research artifacts = flagged drift.

### The Doubt Protocol

Every phase, same session that kicks off: five artifacts in `.tower/ledger/doubt/{session_id}/`.

1. **Pre-mortem.** *"Imagine this shipped and failed publicly. Three likely causes?"*
2. **Challenges.** *"Three arguments this approach is wrong."* Steelman each.
3. **Assumptions audit.** *"Five load-bearing assumptions. Confidence + how to validate cheaply?"*
4. **Alternative sketch.** *"One meaningfully different approach. ≤200 words."*
5. **Fresh-eyes notes.** *"Reading the Brief cold, what confuses me? What feels off?"*

### The Sharpening Loop

At the end of every phase, after the work is done but before hand-off:
- Live with what you built. Click around. Sit with it.
- Pick **one** unprompted thing to add that would surprise someone in a competitor's product. A sound, a copy line, an idle animation, an Easter egg, a private joke. The memorable detail.
- Commit as `R{N}/sharpening: the surprise.`

This is the difference between competent and memorable.

### The Fresh Session veto

When a phase feels done, a fresh Claude session — no prior context — reads the Brief and the live product and answers: *"Did this go beyond the Brief in a good way? Where did it settle for the obvious?"* If Fresh Session finds mediocrity, the phase is not done.

Fresh Session is adversarial to laziness. Treat its output as equal weight to Red Team's.

### The standing permission

You are required to:
- Go off-script when you find something better than what this doc imagined.
- Seed Easter eggs, niche references, private jokes, surprise moments. The Tower is a place; places have character.
- Reject a provocation when a better one exists. Argue for the alternative in your Taste Memo.
- Propose edits to this doc when your build reveals the doc was wrong.

You are forbidden from:
- Breaking the Climate (§4). The Immovables are structural.
- Shipping "what the doc said" when you have a better idea and haven't argued for it.
- Asking for permission on creative details. Decide. Ship. We'll notice if it's wrong.

### Immovables (never doubt these)

- **The building metaphor is sacred.** Floors, elevator, rooms, characters, windows. Extend, don't replace. Never "dashboard." Never "modal." Never "toast." Never "sidebar."
- **The North Star is fixed.** Autonomous job search. Features that don't serve it get cut, not the Star.
- **RLS on every table.** Per-user. No service-role shortcuts at runtime.
- **Drizzle schema-only + Supabase REST at runtime.** The DB is IPv6-only and serverless Vercel cannot reach it directly. Any "just use Drizzle at runtime" proposal is wrong. Drizzle exists for migration and type inference, not for query.
- **Stack invariants.** Next.js 16 App Router. React 19. Tailwind v3 (JS config, NOT v4). `@supabase/ssr` (NOT auth-helpers). Fully typed TS — no `any`. No `console.log` in shipped code. No TODO/FIXME in shipped code. Aria attributes on interactives. `prefers-reduced-motion` respected everywhere.

Everything else is fair game.

---

## §1 — The North Star

*In one sentence.* The user describes what they want. The Tower autonomously discovers jobs, tracks them, drafts tailored resumes and cover letters, applies, prepares for interviews, and coaches through offers. The user should feel they hired a career-operations team, not that they're using a dashboard.

*In a picture.* A user arrives at the Lobby in the evening, signs in with Google, and within their first session sees a Morning Briefing about three opportunities the Tower discovered for them while they finished the onboarding conversation. Three days later the Tower has quietly delivered seven new applications, drafted five tailored cover letters, flagged two stale follow-ups, and surfaced one warm intro. A month in, the user has three offers to evaluate. A door they hadn't seen before appears on Floor 1 — the Negotiation Parlor. They walk in. CFO, CRO, and the Offer Evaluator are already at the oak table. Folders. Comp band chart on the wall. Work begins.

This is the texture. Every Brief below serves this picture. If a phase can't defend itself against this standard, cut it.

---

## §2 — What exists today (honest assessment)

**Shipping.** The Lobby (GSAP cinematic entrance, frosted-glass primitives, the strongest current reference for motion vocabulary). Nine other floors as thin shells — Penthouse through C-Suite — proving plumbing works but not promise. Persistent world chrome: skyline canvas mounts once and cross-fades ambient color on navigation; weather reacts to real conditions; day/night tied to user local time. Auth via Supabase SSR. Per-user Gmail OAuth with inbox classification. Google Calendar sync. CEO orchestrator with dispatch tools. Eight department agents. Memory extraction and per-agent retrieval. Cover-letter generation (surprisingly good). Prep-packet generation. 16-table schema with pgvector and RLS. Stripe webhook idempotency. Progression milestones.

**Placeholder.** Every floor except the Lobby reads as a shell with a color tint. Penthouse Quick Actions still carry *"Phase 1 / Phase 2"* badges — a tell that the product is showing scaffolding. Characters are silhouettes on most floors. No proactive agent push. No autonomous Job Discovery. No resume tailoring. No mock interviews. No offer evaluation. Each is a gap the North Star cannot tolerate.

**The session-persistence bug.** Users relogin every visit. Primary hypothesis: `src/proxy.ts` exists but Next.js 16 reverted its proxy-rename — middleware file must be `src/middleware.ts`. Try the rename first. If it doesn't fix it, investigate JWT TTL, cookie SameSite/Secure, refresh-token rotation, and `prompt: "consent"` OAuth parameter.

**Known orphaned / ready-to-wire.** `src/components/floor-6/cio-character/CIODialoguePanel.tsx` (CIO dialogue not yet wired). `src/components/world/FloorStub.tsx` (generic Coming Soon template). `src/components/world/MilestoneToast.tsx` (gold milestone notification). `src/hooks/useCharacter.ts` (generic character hook). `src/lib/db/queries/agent-memory-rest.ts`, `daily-snapshots-rest.ts`, `notifications-rest.ts`. `src/lib/gsap-init.ts` (centralized GSAP import — not yet wired; Lobby/EntranceSequence/Elevator import directly from `"gsap"`).

---

## §3 — The Gaps (from today to the North Star)

Ranked by impact on actual job-search outcomes for an early-career applicant.

| Rank | Capability | Today (0–100) | Why this rank |
|------|-------------|----------------|----------------|
| 1 | **Job Discovery pipeline** | 15 | Everything downstream assumes applications exist. Nothing flows until the top of the funnel flows. |
| 2 | **Resume tailoring engine** | 5 | Schema field `documents.type='resume_tailored'` exists; zero code writes to it. Per-application tailoring is 2026 table stakes. |
| 3 | **Auto-apply / approved-send loop** | 20 | `outreach_queue` exists for email drafts; needs extension for ATS-aware application sends. |
| 4 | **Proactive push (CEO speaks unprompted)** | 25 | Cron writes static notifications. No CEO-authored briefings. No autonomy *felt*. |
| 5 | **Agent parallelism + dependency ordering** | 45 | CEO dispatches sequentially with `maxSteps: 3`. Should fan out and await deps. |
| 6 | **Interview simulation (live, not packets)** | 30 | Prep packets generate well; live drilling doesn't exist. |
| 7 | **Offer evaluation & negotiation** | 0 | `applications.salary` is free-text. No structured comp. No negotiation scripts. |
| 8 | **Memory: cross-agent semantic retrieval + visible UI** | 75 | Wired but siloed per agent and invisible to user. |
| 9 | **Background worker durability** | 20 | Vercel cron + in-memory Promise.all. Brittle. |
| 10 | **Cross-agent handoff (learnings percolate)** | 20 | CRO's insights don't reach CMO. Each agent's memory is a silo. |

- Biggest compounding unlock: **#1 Job Discovery**. Populate the funnel and every agent has real work.
- Cheapest quick win: **#2 Resume tailoring**. Schema exists. Pattern exists. pgvector exists. One tool, one flow.
- Biggest emotional unlock: **#4 Morning Briefing**. The moment the CEO speaks unprompted is the moment this stops being software.

---

## §4 — The Climate (standing conditions, inherited by every phase)

Every Brief below inherits this by default. A phase that doesn't honor the Climate is not done.

### The metaphor (sacred)

Floors, elevator, rooms, characters, windows, pneumatic tubes, cabinets, tables, whiteboards, bells, presses, folders, binders, skyline, weather. Use building language. **Banned in product UI:** dashboard, sidebar, modal, toast, widget, notification (→ *tube*), widget, panel (except in architecturally-appropriate forms like "glass panel"). If a word belongs in Asana, it doesn't belong here.

When a feature doesn't yet have an in-world form, that is a research problem — not a permission to fall back to SaaS primitives. Propose the metaphor; build it.

### Security (non-negotiable)

Per-user RLS on every table. Google OAuth tokens encrypted at rest (AES-256-GCM via Node stdlib, per-user key via HKDF on a server master). Cron endpoints bearer-authenticated via `CRON_SECRET`. CSP, HSTS, SameSite=Strict session cookies, Permissions-Policy, Referrer-Policy. Audit log for OAuth connect/disconnect, data export, data delete, agent side-effects (send_email, update_status). CSRF protection on all state-changing API routes. Prompt-injection defense for any third-party content passing to Claude (delimited tags + pre-classifier where justified). IDOR checks enforced at the query layer on every pgvector similarity search (user_id in WHERE, not RLS alone). Rate limiting (Upstash) with tiered envelopes per endpoint class. No `SUPABASE_SERVICE_ROLE_KEY` in any client-reachable code path, ever.

Threat posture is standing — you don't re-derive it each phase. If you're touching auth, crypto, or billing: two independent reviewer sessions must approve the change.

### Accessibility (non-negotiable on user-facing surfaces)

WCAG 2.2 AA. Keyboard-operable — tab through every floor in reading order; `Enter`/`Space` activates; `Esc` closes. Elevator buttons keyboard-addressable. `prefers-reduced-motion` respected (animations become instant state changes; particles pause; Rive drops to static pose). Screen-reader semantics — `<main>` per floor, `<nav>` for the elevator, live regions for speaking characters, aria-live summaries of cinematic animations. Alt-text for AI-generated content (resumes, cover letters, briefings). Focus traps in dialogues.

### Responsive (desktop-first, phone-minimal)

Desktop is the canvas. Tablet gracefully degrades. Phone shows a small-screen fallback — a stripped list of the Tower's essentials with a *"best on desktop"* hint. Full Tower is not a phone experience in v1.

### Data rights (for users, not just for regulators)

Users see what the Tower knows about them, export it, and delete it. Export and delete are *spatial* — think Archive Chamber and Purge Chamber — not REST endpoint prompts. They should feel solemn, not clinical. 30-day soft-delete window for recovery. Hard-delete thereafter, with audit record.

### Legal baseline

GDPR + CCPA. EU AI Act limited-risk posture: transparency (agent presence is visible — the metaphor handles this), logging (`agent_logs` exists), and a human-review contact path. Cookie consent for EU visitors. Privacy Policy + ToS. `.well-known/security.txt`.

### Quality floor (required on every phase)

- **Empty states** that *invite*, not apologize. Designed moments, not stock messages.
- **Error states** in-character. Calm, curious, specific. No apologetic-groveling copy.
- **Happy-path E2E test** for the phase's main flow.
- **Observability** — logs labeled, cost-per-user tracked.
- **Copy reviewed** against the Voice fingerprint (below).

### Voice fingerprint

Concise, warm, competent. No exclamation points outside earned moments. No emoji in agent dialogue except the Concierge, once, intentionally. No startup cringe (*"let's crush it!"*). Errors are calm and specific. Forbidden in UI copy: *"Oops!"*, *"Something went wrong"*, *"Try again"* alone. Every error carries character — either a specific description or a warm redirection. If the copy would fit in Asana, rewrite it.

### Cost awareness

Per-user monthly envelope for active Pro users is roughly **$10–20**: Claude API (dominant), Supabase, Vercel, Inngest, Resend, optional ElevenLabs. Anything that meaningfully moves this number is called out in the phase's Proof.

### The North Star tax

Every phase advances the North Star demonstrably, OR unblocks a sibling phase that does. If a phase does neither, cut it.

---

## §5 — The Reference Library

*This is the soul of the doc. Steep here before any phase. References are grouped by dimension, not by phase. Per-phase Briefs call out which anchors apply. Discover your own. Add them. The library grows.*

### Aesthetic

- **Blade Runner 2049** (dir. Villeneuve) — environmental light as mood. Interior warmth against exterior brutalism.
- **Severance** (Apple TV) — corporate geometry. The weight of a place where work happens.
- **Control** (Remedy game) — environmental UI. Text as architecture.
- **Apple Vision Pro demo reels** — depth without disorientation. Glass that belongs to the room.
- **Gattaca** (1997) — precision and quiet stakes. Offices that feel earned.
- **NYC financial-district night photography** — real skyline reference. Search the actual view from midtown towers at dusk.
- **Tadao Ando and Peter Zumthor interiors** — concrete, light, restraint.

### Motion & interaction

- **Rauno Freiberg — Devouring Details** (devouringdetails.com) — grammar of fine interactions. Required reading for anyone doing UI here.
- **Linear's 2026 UI refresh** (linear.app/now/behind-the-latest-design-refresh) — density without overwhelm. Keyboard-first. Motion with purpose.
- **Superhuman** — command menu. Instant transitions. Undoable sends.
- **Arc browser** — Spaces, Command Bar, Little Arc, the onboarding story. The Browser Company's entire aesthetic.
- **Raycast** — launcher patterns, extension surface.
- **Framer.com marketing pages** — cinematic reveals.
- **Awwwards Site of the Year nominees** — rotate through the current three.
- **godly.website** — curated inspiration.

### Game interactions (underused in SaaS — deeply valuable)

- **Balatro** — card deals. The satisfaction of things *arriving*.
- **Disco Elysium** — the Thought Cabinet. Idea management as architecture.
- **Hades** — codex entries unlocking with typing animation. Narrative progression inside UI.
- **Death Stranding** — delivery arrivals. Weight. Consequence.
- **Animal Crossing** — the mailbox. Gentle delivery metaphor.
- **Portal** — the cake reveal. Payoff.
- **Outer Wilds** — quiet. Systems that notice when you notice them.
- **Satisfactory / Factorio** — pipelines as environment. Seeing throughput.
- **Return of the Obra Dinn** — frozen moments. Light as reveal.
- **Her Story** — interface as investigation.

### Sound & audio

- **Hans Zimmer — Dune (2021) score.** Horn stabs. Commitment without melodrama.
- **Andrew Prahlow — Outer Wilds score.** Silence as presence.
- **Hypnospace Outlaw OS sounds** — personality in UI beeps.
- **Apple design sounds** — the industry baseline.
- **Hotel elevator chimes** — real-world reference; YouTube has playlists.
- **Ding sounds in Japanese convenience stores** — gentle summoning.

### Narrative — introducing powerful characters

Watch the first three minutes of each. That's what "first meeting the CEO" should feel like.

- **Succession pilot** — Logan Roy's first scene. Weight without exposition.
- **Scandal pilot** — Olivia Pope's command.
- **Mad Men pilot** — Don Draper's opacity.
- **The Undoing pilot** — Elena Alves's composure.
- **The Bear pilot** — Carmy's competence under pressure.
- **Better Call Saul pilot** — Jimmy's wit in a corporate room.
- **Severance** — Mark's first meeting with Milchick.

### Character fingerprints (starting points — find your own)

Don't treat these as definitions. Steep, then invent past.

- **CEO (Floor 1).** A retired admiral running a SaaS. *Or* Olivia Pope's precision with Logan Roy's weariness. *Or* Satya Nadella's warmth after watching ten companies die. Doesn't explain themselves. Reads numbers before emotion.
- **CFO (Floor 2).** Caliper-and-glasses professor. Christopher Lloyd's hesitation with Bill Belichick's data obsession. Confidence intervals. Never rounds up.
- **CPO (Floor 3).** A STAR-method coach. Coach Carter crossed with *Undefeated*'s Bill Courtney. Warm but sharp. Interrupts to sharpen, not shame.
- **COO — Dylan Shorts (Floor 4).** Practical realist. Season-1 Walter White (high school chemistry teacher who sees everything). Calm under pressure. Blunt about trade-offs.
- **CMO (Floor 5).** Literary perfectionist. Don Draper's weight with a poet's tongue — Ada Limón, Claudia Rankine, Richard Siken. Rewrites obsessively. Argues about tone.
- **CNO (Floor 6).** Warm connector. Leslie Knope's encyclopedia of people minus the manic energy. Recalls names and context.
- **CIO (Floor 6).** Cerebral researcher. A Bell Labs scientist in wireframes. Facts with caveats.
- **CRO (Floor 7).** Chess player. Gordon Gekko's strategic mind without the moral void. Three moves ahead. No small talk.
- **Concierge (Lobby).** Attentive host. A five-star hotel's head concierge crossed with a great career advisor.
- **Offer Evaluator (Negotiation Parlor).** Deal Desk. Christopher Walken's unflappable delivery with a negotiator's patience.

### Product references by domain

- **Tracking / pipelines.** Linear (study), Pipedrive (anti-pattern), Granola (study), Notion databases (anti-pattern).
- **AI agents.** Vercel v0, Claude Console, Lovable, Perplexity's sidebar, Character.AI (anti-pattern for clutter, study for presence).
- **Writing / documents.** iA Writer, Scrivener, Arc Boosts, Paper by Dropbox.
- **Calendars.** Cron/Notion Calendar, Amie, Fantastical.
- **Onboarding.** Duolingo's first streak, Arc's setup, Superhuman's onboarding, Tinder's first match, Linear's signup, Granola's intake.

### Anti-patterns (things the Tower cannot feel like)

- Asana, Monday, Notion, Trello, Jira.
- Generic shadcn-kit dashboards with colored-tag chips.
- Slack's left-nav + right-panel layout.
- Clippy, Cortana, any condescending assistant.
- Typeform-style wizards with progress dots at the top.
- LinkedIn's density of noise.
- Any "Oops!" error message, anywhere.

---

## §6 — Phase order and why

Ordering is a forcing function — it declares what we believe matters first.

| # | Phase | One-line why |
|---|-------|---------------|
| R0 | **Hardening Sprint** | Fixes trust. Encrypts tokens. Fixes session persistence. Stands up the Phase Ledger. No feature can ship on a leaky foundation. |
| R1 | **War Room (Floor 7)** | Closes #1 (Job Discovery). Sets the design bar. First floor to ship the North Star proof-of-concept loop end-to-end. |
| R2 | **Penthouse (PH)** | Closes #4 (Morning Briefing). The emotional unlock that turns tracking into ritual. |
| R3 | **C-Suite (Floor 1)** | Closes #5 (parallel orchestration). Turns the CEO from router to conductor. |
| R4 | **Lobby (L)** | With autonomy now real, redesign the entrance so new users meet it from the first click. |
| R5 | **Writing Room (Floor 5)** | Closes #2 (resume tailoring) + extends cover letters. Document floor. |
| R6 | **Briefing Room (Floor 3)** | Closes #6 (live interview drilling). Turns prep from reading to drilling. |
| R7 | **Situation Room (Floor 4)** | Closes #3 (approved-send + undo). Deadlines and follow-ups ship here. |
| R8 | **Rolodex Lounge (Floor 6)** | Relationship warmth as architecture. Opens the network-effect moat. |
| R9 | **Observatory (Floor 2)** | Analytics as Orrery. Design luxury phase. Ships last because nothing depends on it. |
| R10 | **Negotiation Parlor (C-Suite annex)** | Materializes when an offer arrives. Schema and data layer ship alongside R7 so we're ready. |

R1 → R3 form a tight triangle; each amplifies the others. Ship close together, without distraction. R4 follows because primitives are now mature and the first-impression layer deserves their best expression.

---

## §7 — The Briefs

*Each Brief demands research before execution. Read the References in §5 before writing a Taste Memo. The Memo is your pledge. The code is your follow-through.*

*The common inheritance for all Briefs: Climate (§4), the Immovables (§0), the Quality floor, the Voice fingerprint.*

---

### R0 — Hardening Sprint

**Intent.** The building's utilities work. Auth persists. Secrets are encrypted. Cron is authenticated. Audits are recorded. Users can see, export, and delete their data. The Phase Ledger is live; future sessions know what's real vs. claimed. Invisible to the user, load-bearing for everything after.

**Why now.** The single most compounding investment in the roadmap. Everything after R0 stands on R0.

**Anchors to steep in.** 1Password's public security docs. OWASP LLM Top 10. Anthropic's prompt-injection research notes. Stripe's public post-mortems. Supabase SSR auth docs. For the Phase Ledger: how Linear tracks its own milestones; how companies like Stripe or Shopify run change-tracking. For encryption: Filippo Valsorda's writings on Node crypto.

**Research demands.**
- Verify the session-persistence root cause. Primary hypothesis: `src/proxy.ts` exists but Next 16 final expects `src/middleware.ts`. Test the rename with an instrumented log line; observe in Vercel logs. If unrelated, investigate JWT TTL, cookie SameSite/Secure, refresh-token rotation, `prompt: "consent"` OAuth parameter. Do not guess — instrument and verify.
- Choose between AES-GCM via Node stdlib vs Supabase Vault for token encryption at rest. Justify.
- Design `audit_logs` — what's worth recording, what isn't, what fields, what indexes.
- Choose export format (JSON + original PDFs, zipped, signed URL, Resend email). Decide on retention of the export link.
- Design the Purge flow. What persists for audit, what disappears, what's the 30-day window UI.
- Choose Inngest vs Vercel Queues vs raw Vercel Cron for durable workers. Spike both briefly.
- Sketch the Phase Ledger scaffold: `.tower/ledger/CURRENT.yaml`, per-phase YAMLs, verifier, handoff generator, commit-message linter.
- Decide if MFA ships now or later. Sketch the Settings UI either way.
- Research prompt-injection defenses that actually work in 2026 (delimited tags, pre-classifiers, meta-prompts, structured-output contracts). Don't pick the first one you read.

**Provocations.** The Security Office (a literal room — see §5 character fingerprints for Token Vault as a sculpture, Archive Chamber for export, Purge Chamber for deletion). Rather than a Settings page, what if security is a *place*? What if the Panic Button is an actual lever?

**Anti-patterns.** Generic "Settings → Security" panel. Text-only audit log. Copy that reads *"Your data has been exported."* instead of a scene.

**Non-negotiables.** Every Climate rule. Session persistence verified with a real E2E test (Playwright — add if missing). All 13 sub-items below each pass with evidence files committed.

**Sub-items (reference — adapt, justify, shrink or grow as your research demands; do not execute blindly).**

- Session persistence fix (P0; middleware rename first hypothesis).
- Token encryption at rest (P0).
- Cron endpoint authentication (P0).
- Security headers (CSP / HSTS / SameSite / Permissions-Policy / etc.) (P1).
- `audit_logs` table + write path (P1).
- Data export endpoint (P1).
- Data deletion endpoint (P1).
- Prompt-injection defense for Gmail parser (P1).
- Per-endpoint rate limiting (P1).
- Phase Ledger scaffold (P0 — see §9).
- MFA option (P2).
- Secrets rotation runbook (P2).
- Stale-dependency upgrade pass (P2).

**What would break this.** Shipping R0 without an E2E test verifying session persistence across a laptop close/reopen. Shipping the Ledger without a drift verifier. Relying on "we documented it" instead of "we verified it." A `SUPABASE_SERVICE_ROLE_KEY` reaching any client bundle.

**I don't know yet.** Whether Inngest or Vercel Queues wins for durable workers. Whether MFA ships now or later. Whether the Ledger lives in `.tower/ledger/` or a fresher-named directory.

**Proof.** Session survives laptop-lid close + reopen. `SELECT google_tokens` returns ciphertext. `curl` on any cron route without `CRON_SECRET` returns 401. Export delivers a zip by email with signed URL expiry respected. Delete demonstrates actual row removal after soft-delete window. Prompt-injection test fixtures don't make the parser go off-script. `securityheaders.com` grades A. A fresh Claude session opens `.tower/ledger/CURRENT.yaml` and correctly identifies the active phase.

**Sharpening target.** Find a detail in the Security Office that rewards curiosity — an easter egg when a user clicks the Token Vault, a sound when the Panic Button is armed, a moment that makes a power user smile.

---

### R1 — War Room (Floor 7)

**Intent.** A tactical console carved from mahogany. The CRO is on the floor when the user arrives. Jobs *arrive* (not appear). Applications move through stages with visible consequence — every status change feels like an operation, not a form submit. By the end of a user's first session on this floor, they've watched one opportunity get discovered, one resume get tailored, one cover letter get drafted, one outreach get queued for approval, and one email actually send after they approve. The North Star is real on Floor 7 first, then everywhere else.

**Why now.** Closes the top-of-funnel. Until Job Discovery flows, no other agent has real work.

**Anchors to steep in.** Bloomberg Terminal. Superhuman. Linear's issue drag. Balatro's card deals (watch the deal animation in slow-mo). Death Stranding's package arrivals. Satisfactory's conveyor belts. Hades's codex reveal. Disco Elysium's Thought Cabinet. Rauno Freiberg on "the in-between state."

**Research demands.**
- Spend hours, not minutes, in the anchors above. Take notes on what makes *arrival* feel earned.
- Explore ≥3 metaphors for how jobs arrive on the floor. Cards slide? A dossier drops? A pneumatic-tube canister lands in a slot? A blueprint line draws from the ceiling? Sketch each; pick one that feels truest.
- Explore ≥3 approaches to the CRO intake (the thing that captures the user's target profile). Conversation? A legal pad on a desk? A pinboard of target companies? Sketch each.
- Research Job Discovery sources. JSearch as aggregator. Greenhouse + Lever + Ashby public feeds. What's the best combined source for the user's market? Rank by noise-to-signal and API reliability.
- Research how to dedupe and score. pgvector cosine? Role-title regex? Company-tier weighting from `docs/CHAIN-OF-COMMAND.md`? All of the above? Prototype a scorer against 20 synthetic JDs and eyeball the top 5.
- Design the **North Star proof-of-concept loop** (mandatory deliverable). A single-session flow where: user states targets → a real job is discovered (or at minimum pulled from a cache) → CMO drafts tailored resume → CMO drafts cover letter → record lands in `outreach_queue` as `pending_approval` → user approves → Resend sends.
- Research what the CRO's *whiteboard* should read from. Today `agent_memory` is populated asynchronously; can the whiteboard be a live view of it? What's the write-path latency?

**Provocations.** The war table as Bloomberg-tactile. The Batch Stamp as rubber on a wooden block. Match-score as glow, as ribbon, as sound — pick one and commit. The CRO intake as conversation, visible on a legal pad. The *first application move* as a moment (gavel? sound? CRO turns head?) — find one worthy of the first time.

**Anti-patterns.** Trello-with-gold-skin. Horizontal Kanban labels ("TODO / IN PROGRESS / DONE"). *"+ Add task"* button. Drop-shadow card hover. Colored-tag chips. Any word from Asana appearing on the floor.

**Non-negotiables.** Climate in full. IDOR-safe pgvector queries (user_id in WHERE, not just RLS). Rate-limit the Job Discovery worker — we cannot hammer third-party APIs. CSRF protection on state-changing routes. Empty state for zero-applications must *invite* (no "No data yet").

**What would break this.** Shipping Kanban that reads as Trello. Shipping Job Discovery with noise-to-signal high enough that users ignore the floor. Shipping without the proof-of-concept loop (pretty demo, dead promise). Shipping the CRO whiteboard with hard-coded data.

**I don't know yet.** Cadence for the Job Discovery worker (fixed-interval cron vs event-driven vs hybrid). Whether match-scores are stored or computed on read. Whether the CRO intake is one conversation or evolves over multiple touches.

**Proof.** A cold user declares targets and returns later to ≥5 scored opportunities. Dragging a card between stages passes a three-person vibe test against Linear's issue drag. The proof-of-concept loop executes end-to-end in a user's first session. Whiteboard content visibly reflects `agent_memory` writes. Empty state invites. Lighthouse >90 on the War Room route.

**Sharpening target.** Find the CRO's idle moment — the mannerism, the desk object, the sound cue that makes a first-time visitor lean in. Seed it and don't ask permission.

---

### R2 — Penthouse (PH)

**Intent.** The CEO is *already at the window* when the user arrives in the morning. Gold-hour skyline. A briefing is unfolding on glass. This isn't a dashboard with a greeting — it's the first minute of a scripted workday. When the user opens the app in the morning, they don't see numbers first — they see the CEO turning from the window.

**Why now.** Closes the proactive-push gap. The moment the CEO speaks unprompted is the moment the Tower stops being software.

**Anchors to steep in.** Severance's opening sequence. Mad Men — Don Draper walking into his office. Blade Runner 2049 slow interior pans. Apple Vision Pro ambient environments. A great TV pilot's first scene (see §5 Narrative). Military-ops morning briefings (*The West Wing*, *Twelve O'Clock High*). Rauno on in-between states.

**Research demands.**
- Explore ≥3 options for the Morning Briefing scene: scripted cutscene, conversational dialogue, reveal-as-you-scroll, mix. Sketch each.
- Explore how the scene handles *a quiet night* (no news). The CEO should still be present, just quieter — not absent.
- Plan pre-compute vs real-time generation. Users seeing "give me a moment" from the CEO feels wrong; pre-compute during cron sync and persist to `notifications` so open-to-paint is near-instant.
- Investigate what the Penthouse shows *outside* the morning hour. Afternoons? Evenings? Late night? The CEO can't always be at the window; where are they?
- Research adding an optional voice layer (ElevenLabs). Decide if it ships now, later, or never.

**Provocations.** The CEO turns from the window. The CEO is seated, nursing coffee, slides a folder. The CEO waits until the user sits. Pick a posture. The skyline reflects pipeline weather — good nights, more gold; bad nights, grayer — subtly, 5% saturation shifts. Quick Actions turn from placeholder badges into *real* agent dispatches, arriving back as pneumatic-tube delivery.

**Anti-patterns.** Dashboard with a greeting. Hero CTA. "Welcome back!" banner. Stat cards in a KPI grid. Any *"Phase 1 / Phase 2"* badge (banned — replace with architectural progression language if needed at all).

**Non-negotiables.** Climate in full. Briefing first-paint within a fast budget (pre-compute; don't block on Claude). Briefing is skippable in the first instant with `Esc` or spacebar. Never auto-play voice without explicit user opt-in.

**What would break this.** A Penthouse that reads as dashboard-with-gold-tint. A briefing that feels scripted once and generic forever. Voice as default-on.

**I don't know yet.** Auto-play vs user-triggered briefing. Whether user reactions ("interesting" vs "skip") become signal the CEO learns from.

**Proof.** User can describe the morning scene from memory after a week. The briefing reads as conversation, not broadcast. A no-news day still produces a Penthouse moment worth returning to. Different overnight activity demonstrably produces different scripts.

**Sharpening target.** The CEO's idle detail. A photo frame. A pen. A thirty-second pause before speaking on the day a rejection landed. The detail that tells us they've been here before.

---

### R3 — C-Suite (Floor 1)

**Intent.** The brain of the building. When the user rings the bell, the camera pulls back and the chain of command lights up live — all seven departments, subagents branching under them, edges flowing with dispatch. The user is not chatting with a chatbot; they are watching a boardroom run. When the CEO is between sessions, they're at their desk — maybe glancing at a photo frame, maybe reading, maybe waiting.

**Why now.** Closes #5 (parallel agent orchestration). Makes the CEO real as an orchestrator rather than a router.

**Anchors to steep in.** *War Games*' map room. *The Social Network*'s rowing scene (the pacing). Command-center films — *Apollo 13*, *Zero Dark Thirty* situation rooms. Hades's codex edges. Observable / d3-force force-directed graphs. Rauno on choreographed state changes.

**Research demands.**
- Explore ≥3 ways the bell rings. Physical 3D bell (R3F or Rive 3D) with resonant sound and a building-wide light dim. A brushed-gold handle the user pulls. A ceremonial knock on the boardroom table. Sketch each.
- Design the Dispatch Graph. Force-directed? Radial? Hand-drawn paths from a pre-defined layout? What renders on the main thread without jank when 7 nodes fire at once?
- Plan parallel fan-out in the AI SDK v6 layer. Today `ceo-orchestrator.ts` fires sequentially. Research how to produce `Promise.all`-based dispatch without blowing up the tool-step budget. This likely needs a new `agent_dispatches` schema with `depends_on uuid[]` — treat that as a real deliverable, not an afterthought.
- Decide on streaming pattern. AI SDK v6 `writeData` for live agent-start / agent-complete events? Batching strategy (100ms window) to keep Canvas redraws manageable?
- Research unprompted CEO triggers. Thresholds (stale apps > N, rejections clustering, offer arrived). What becomes a notification? What earns an in-world escalation?
- Plan cross-agent memory bridge. `user_profiles.shared_knowledge` as a namespaced jsonb (`{ [agent_key]: { [memory_key]: value } }`) — sketch how agents write and read to it without stepping on each other.

**Provocations.** The bell is physical. The dim of building lights is felt on other floors. The CEO addresses the user by name *inside* the dispatch scene. The graph's flowing dots are the thinking *made visible*. The user can press `/` mid-dispatch to inject a new instruction and the CEO adapts.

**Anti-patterns.** A chat sidebar. A toast that says "Briefing generated." A status bar. A modal of results.

**Non-negotiables.** Climate in full. Schema change for `agent_dispatches` called out as a deliverable. Two independent reviewer sessions must approve anything touching the auth or Stripe path (they're both in this floor's blast radius if we touch billing gates).

**What would break this.** A Dispatch Graph that stutters under load. A CEO that feels like a router instead of a conductor. Thresholds that never fire (unprompted CEO must speak).

**I don't know yet.** Whether force-directed layout is right (might need web-worker). Whether node count will grow enough to need batching. Whether CEO voice ships in R3 or R4.

**Proof.** Ringing the bell with *"How's everything looking?"* triggers ≥3 departments to dispatch visibly in parallel. Total bell-to-briefing time is modest and felt as *work being done*. `/`-injecting mid-dispatch adapts the plan. ≥3 threshold triggers fire autonomously across an extended test. CEO's briefing references a learning first captured by a sibling agent.

**Sharpening target.** Find the *visual signature* of orchestration — the thing that makes the Dispatch Graph a thing you *want* to see again.

---

### R4 — The Lobby (L)

**Intent.** The front door of the Tower. The moment when a first-time user *decides* this building is real. Existing users get a quiet welcome-back (zero ceremony). Returning users are already logged in and routed to their last floor. First-time users get a cinematic arrival that earns the building's promise. The Concierge captures a target profile in a conversation, not a form. Their first session ends with a Morning Briefing built from jobs the Tower discovered during onboarding.

**Why now.** Autonomy is real by R3; the entrance must show it.

**Anchors to steep in.** Apple TV screensavers (the aerial approaches). Arc browser's setup flow. Uncharted 4's opening sequence. The Last of Us Part II's first minute. Superhuman's onboarding. Linear's signup. Granola's intake. Hotels — the best ones — how they treat arrival. *Severance*'s Mark-first-day scene. Any first-person game's opening that resolves from an exterior approach.

**Research demands.**
- Explore ≥3 approaches to the first-visit arrival scene. Full R3F 3D model descending through the skyline vs pre-rendered video vs CSS-only parallax. The decision matters — each has wildly different build complexity and polish ceiling.
- Design the Concierge conversation. How does it feel? How long? What does the user type? What's the parsing model (Claude structured output)? What happens on skip?
- Research LinkedIn sync integration (OAuth). Promote from "R5+" to R4 onboarding if feasible — it's a trust/credibility moment.
- Plan the first-run Job Discovery trigger. The Concierge completes → Inngest job fires → results ready before the user reaches the Penthouse. How do we time this?
- Design the first-ever Morning Briefing (one-time override of the normal flow). It references jobs found *during onboarding*, not overnight data. This is the autonomy proof.
- Design the **Building Directory cross-section** — the vertical slice of the Tower with lit/locked floors visible to the user before they've entered most of them.
- Plan the returning-user fast lane. Existing session cookie = skip everything, auto-elevator to last floor.

**Provocations.** The Concierge is a new character — not a repurposed department head. They live only in the Lobby. The arrival scene is a signature moment a visitor would post about. The Directory cross-section is a tiny diorama that updates with progression. A skip button exists and is honored.

**Anti-patterns.** Typeform-style wizard with progress dots. A modal asking "What best describes you?" A form with *First Name / Last Name / Role*. A multi-screen onboarding flow with "Next →" buttons. Any arrival that feels like a loading screen.

**Non-negotiables.** Climate in full. First-time arrival skippable. Returning users never see the cinematic scene after the first time (strict one-time-per-account). Concierge captures a usable profile from ≥95% of test conversations. LinkedIn integration is optional — no gate behind it.

**What would break this.** An arrival scene that plays every visit. A Concierge that feels like a chatbot. A first-run Morning Briefing that fires without real discovered data. A first session that ends without the user seeing autonomy.

**I don't know yet.** R3F vs pre-rendered video (§11 Q2 raises it). Whether the Concierge gets their own named character or is represented only through voice.

**Proof.** First-click to first-Morning-Briefing is fast and feels continuous. Returning users never see the arrival twice. Concierge extracts a usable target profile in most test runs. Directory cross-section reads live progression without drift.

**Sharpening target.** The one unprompted detail in the Lobby that makes a returning user feel *seen* — the Concierge remembers something. The elevator ding pitches differently if a night-shift report waits. Something.

---

### R5 — The Writing Room (Floor 5)

**Intent.** A quiet floor. A single desk lamp. Paper drafts stacked. A typewriter on the side. A press in the corner. When the user drops a job description, CMO picks up a pen — you watch a cover letter compose itself in real time, as if the character is writing it. When CMO finishes, the paper slides out as a publication-quality preview. For resumes: a mechanical press stamps a new version out of the base resume, sections glowing as CMO rewrites bullets to match the JD.

**Why now.** Closes the resume tailoring gap (#2) — the "embarrassing absence." Extends the cover letter loop. Document floor.

**Anchors to steep in.** Apple's recent (2024–2026) writing-app aesthetics. iA Writer's typography. Scrivener's corkboard. Don Draper's office. The Typewriter Revolution blog. Letterpress printing videos on YouTube. Olu Niyi-Awosusi's writings on typography. Rauno on pen-glow micro-interactions.

**Research demands.**
- Explore ≥3 approaches to live cover-letter composition. Pen-glow typewriter effect. Word-by-word streaming with subtle paper-rustle. A CMO handwriting animation over the page. Sketch each.
- Design resume tailoring end-to-end. Resume base upload (PDF → structured parse). Per-application tailoring. User approval gate *before sending*. Version stack.
- Research PDF preview rendering. Motion + scroll-snap vs Remotion vs native iframe vs `@react-pdf/renderer`. **Pick based on deployment footprint and quality — not novelty.**
- Research the *ATS keyword optimizer*. Post-tailor pass that scores resume fit against common ATS parsers (Lever, Greenhouse, Workday) and surfaces missing critical keywords. Cheap LLM call or static lookup?
- Plan the A/B tone generation for cover letters. Two tones in parallel, user picks, winner persists, loser kept for undo.
- Research the LinkedIn sync path (if deferred from R4). Pulling experience + education structured.

**Provocations.** The Resume Press as a mechanical object — lever arm, *ka-chunk*, embossed version number. The Typewriter as a real SVG (or Rive) sculpture. Tone dials as physical knobs. Draft stack as visible history on the desk.

**Anti-patterns.** A textarea labeled "Cover letter." A Google Docs clone. "Generate" button. "Regenerate" button without visible reasoning. Popups.

**Non-negotiables.** Climate in full. User approval gate before any application send. Base resume upload scanned for ReDoS patterns. Files stored in private Supabase Storage; no public URLs.

**What would break this.** A Writing Room that reads as Google Docs. A resume tailoring tool that ships without user approval gate (legal/ethical issue — applications go out in the user's name). A cover letter preview that looks like HTML.

**I don't know yet.** Whether Remotion is ever justified here or whether Motion scroll-snap is enough forever. Whether ATS keyword optimizer is a separate tool or bundled with tailoring.

**Proof.** User can generate a tailored cover letter and resume for one application quickly. Refinement loop: user types feedback → new draft appears shortly. Three tone variants demonstrably different on same input. PDF export reads as publication-quality.

**Sharpening target.** A detail in the Writing Room that rewards a writer's eye. A line of Siken on the wall. A typewriter that occasionally "jams" and CMO shrugs. The kind of surprise a careful user notices.

---

### R6 — The Briefing Room (Floor 3)

**Intent.** The whiteboard floor. CPO drills the user with mock interview questions. As the user answers (typed or spoken), the whiteboard fills with the STAR framework scaffold live. CPO interrupts to sharpen — *"What Action did you take? I need a verb."* At the end, the whiteboard snapshots into a Debrief Binder on the shelf, filed by company. Over time, the shelf fills.

**Why now.** Closes #6 (live interview simulation). Turns prep from reading to drilling.

**Anchors to steep in.** Coach Carter. Whiplash. Interview-coaching videos from top firms. STAR-method literature. NYU Career Center's mock interview tapes (if available). The OpenAI Whisper / Deepgram pipeline for voice transcription. Rauno on live-updating UI.

**Research demands.**
- Explore voice vs text mock interviews. Which first? Both? Which feels more like *being coached*?
- Design the whiteboard's STAR live-fill. Keyword extraction in real time from user text → highlighted under the right column. Handle ambiguity.
- Plan CPO's interruption logic. When does CPO stop the user? How often? Tunable per user?
- Design the Debrief Binder. File structure, rendering, replay mode. Score-over-time per company.
- Research packet regeneration triggers. Application moves to `interview_scheduled` → packet older than N days → auto-regenerate via Inngest. Notify via tube.
- Research optional interview *recording* (real interviews, not mocks). Calendar-aware. Deepgram transcription. Auto-debrief post-interview. Filler-word count. STAR completeness.

**Provocations.** CPO paces. The whiteboard is reactive — it *responds* to what the user types. The timer is visible; amber at 90s; CPO makes a wrap-up gesture. Binders age visually on the shelf.

**Anti-patterns.** A chat UI with Q&A. A practice interview that feels like a quiz. A score card without specifics. A stopwatch without context.

**Non-negotiables.** Climate in full. Voice recording is opt-in only; user can disable permanently. Debriefs are stored with user consent; fingerprintable data (voice samples) never leaves Supabase Storage's private buckets.

**What would break this.** A mock that feels scripted. CPO interrupting at the wrong moments. A debrief that's a JSON dump instead of a binder.

**I don't know yet.** Whether voice mode ships in R6 or gets deferred. Whether real-interview recording is a separate phase.

**Proof.** User completes a 3-question drill with scored STAR feedback per answer. STAR whiteboard fills are readable and accurate. Debrief contains Q/A + numeric scores + CPO's narrative feedback. Voice mode (if shipped) works end-to-end in Chrome and Safari.

**Sharpening target.** A detail that makes users want to drill again. An easter egg in the debrief. A sound when a binder lands.

---

### R7 — The Situation Room (Floor 4)

**Intent.** Mission control for time-sensitive matters. Follow-ups. Deadlines. Application status decay. Every stale follow-up has a drafted response ready to approve with an undo window. Approval-all feels like a COO running the room, not reckless batch-fire. The Pneumatic Tube lives here — proactive push lands as a physical object first.

**Why now.** Closes #3 (approved-send + undo). Also the home of the proactive push delivery mechanism for the whole building.

**Anchors to steep in.** Mission-control films (Apollo 13, The Martian, Zero Dark Thirty). Superhuman's snoozing and send-later. Hey.com's screener. Hotel concierge workflows. Fog of war in Civilization (for the flight-paths map).

**Research demands.**
- Design the Pneumatic Tube as an in-world notification delivery system. Sound, motion, paper-unfold reveal. Queue behavior during quiet hours.
- Explore the **Situation Map** — Canvas2D visualization of outreach flight paths (arcs between user node and company nodes). Live data flow. What makes it readable at 50+ nodes?
- Design approve-with-undo. Bar at top right with countdown? Toast-style (banned) vs. in-world banner? Cancel motion reverses?
- Research the calendar conflict resolver. COO tool that spots scheduling conflicts and surfaces them as alerts.
- Research application deadline tracking. Calendar integration for deadline awareness. Final-countdown alert cadence.

**Provocations.** The rings in the current Situation Room background should respond to interaction — clicking an alert pulses them outward. The tube delivers with *thunk*. The map's flight paths are earned, not decorative.

**Anti-patterns.** Notification center with a bell icon. "Notifications" as a word anywhere in UI. Generic "Mark all read" button.

**Non-negotiables.** Climate in full. Undo must be real — within the window, a clicked "cancel" prevents Resend from sending. Quiet hours are respected even for tube delivery (tubes queue and arrive at wake-up).

**What would break this.** Tubes arriving at 3am. Approve-all without undo. Alerts that pile up and stress the user instead of helping them.

**I don't know yet.** Whether the Situation Map is worth the build complexity vs a simpler list. Whether the tube replaces every notification globally or coexists with lighter in-world signals.

**Proof.** Follow-up drafts appear overnight for stale apps. Approve-all sends with visible undo bar. Flight paths render at scale. At least one proactive tube delivery per session during active use. Zero `alert()` or generic toast anywhere.

**Sharpening target.** The tube's *arrival* sound. Some detail in the Situation Map that makes the user linger.

---

### R8 — The Rolodex Lounge (Floor 6)

**Intent.** A warm lounge. Mahogany. Leather chairs. A physical rotating rolodex as the centerpiece. Contact cards with warmth encoded as temperature (cold/blue → warm/cream → hot/amber). CNO's side feels like a party; CIO's side feels like a library. The floor opens the network-effect moat: over time, users who opt in can (with consent) coordinate warm intros between themselves.

**Why now.** Relationships are the quiet compounding asset in job search. Also the moat — without cross-user network effects, the Tower is easier to copy.

**Anchors to steep in.** Real rolodexes (look up vintage office equipment). The library scene in *Indiana Jones and the Last Crusade*. *The Godfather*'s mahogany rooms. Letters of Note (the website). LinkedIn's anti-pattern (density as a warning). Granola's contact surface.

**Research demands.**
- Explore the rolodex centerpiece. R3F 3D? CSS 3D transforms? Lottie illustration? Performance at 200+ cards?
- Design warmth decay logic. Daily cron updating `contacts.warmth` by days-since-last-contact. CNO alerts when coldest card crosses threshold.
- Research **find-warm-intros**. pgvector similarity between contacts and companies. Second-degree connections surfaced. "You have a friend at Blackstone's sister firm."
- Plan the **cross-user network layer** (with consent only). Two users both targeting Blackstone. One has a warm contact; the other needs one. How do we facilitate without leaking data? Consent UX matters here.
- Design CIO's side of the floor. Dossier wall. Research freshness visualized (dossiers yellow and curl at corners as they age).

**Provocations.** The rolodex rotates on scroll. Cards *physically cool* over time. CNO and CIO are on opposite sides — `[` and `]` swings the camera between them. The moat-building cross-user matching is presented as an opt-in, consent-forward *ability*, not a background data aggregation.

**Anti-patterns.** A CRM. A contact list. LinkedIn embedded. Any mention of *"leads."*

**Non-negotiables.** Climate in full. Cross-user network features are opt-in only, with explicit consent language. User can see and revoke at any time.

**What would break this.** A Rolodex that reads as a Google Contacts clone. A cross-user feature without consent UX rigor. Warmth decay that feels punitive instead of informative.

**I don't know yet.** Whether cross-user matching ships in R8 or gets its own phase. Whether the rolodex is R3F or 2D.

**Proof.** Rolodex rotates smoothly with 200+ cards. Side-switch is instant. CNO surfaces warm-intro proposals autonomously. CIO refreshes stale research without prompting. Consent UX passes a Red Team read.

**Sharpening target.** The detail that makes the rolodex feel *private* — the thing a user puts on a card that only they see. A note, a sticker, a sound when they lean closer.

---

### R9 — The Observatory (Floor 2)

**Intent.** The contemplation floor. Panoramic, cool-blue, quiet. The centerpiece is the **Orrery** — the user's pipeline as celestial bodies in orbit. Tier-1 companies are inner planets; Tier-4 outer. Status changes flash; interview-scheduled spawns satellites; offers explode into supernovae; rejections fade. CFO stands at a panoramic window; a conversion funnel projects onto the glass. A rejection autopsy lives here — pattern analysis across rejections.

**Why now.** Design luxury phase. Ships last because nothing depends on it. But this is where we earn the "spatial" part of the Tower's aesthetic promise.

**Anchors to steep in.** Apollo 13's moon-approach orbital visualizations. NASA's 3D orrery simulators. Kepler motion in physics visualizations. The opening of *Interstellar*. Observable/d3 data-vis masters (Mike Bostock). Refik Anadol's data-as-sculpture work.

**Research demands.**
- Explore R3F orrery approaches. Instanced spheres? Shader-based? Animation library (Theatre.js)?
- Design pattern-overlay modes (by stage / by tier / by velocity). Smooth morph between them.
- Research rejection autopsy. Post-rejection 3-question debrief. Aggregate across rejections → monthly CFO insight. What counts as a pattern at small N?
- Plan the State of the Month report. Auto-generated PDF with orrery snapshot + charts + CFO commentary.
- Research CFO threshold triggers. Conversion rate drops >5% week-over-week → CFO auto-composes an analysis note → pneumatic tube.

**Provocations.** The orrery is the signature moment. A planet you click dollies the camera in and reveals that application's history. A supernova happens once per offer in the user's lifetime — make it unforgettable.

**Anti-patterns.** A Tableau dashboard. A chart library (Recharts, etc.) with a gold tint. Numbers without a story.

**Non-negotiables.** Climate in full. Orrery must run at 60fps with ≥100 planets. Falls back gracefully on low-end GPU.

**What would break this.** An Observatory that reads as a chart page with a theme. A rejection autopsy that feels like punishment.

**I don't know yet.** Whether the orrery uses Theatre.js. Whether the State of the Month ships monthly or quarterly. Whether rejection autopsy is mandatory or opt-in.

**Proof.** Orrery renders 100+ applications at 60fps on baseline laptop. Click-to-history is instant. Monthly report auto-generates with CFO commentary that's readable, not boilerplate.

**Sharpening target.** A planetary detail that rewards long looking — a pattern that emerges only over weeks.

---

### R10 — The Negotiation Parlor (C-Suite annex)

**Intent.** A door appears on the C-Suite wall when the user's first offer lands. Not before. The Parlor is a wood-paneled side room with an oak table, a comp band chart on the wall, and three chairs — Offer Evaluator, CFO, CNO gather. Offers are folders on the table. Drafts are drafted. Comp is analyzed. Scripts are written. Nothing gets sent without a hold window.

**Why now.** Offers are rare and high-stakes. A spatial room that materializes on demand makes them feel like culmination, not status change.

**Anchors to steep in.** Negotiation books (Never Split the Difference; Getting to Yes). Salary-negotiation YouTube — Haseeb Qureshi's Ten Rules. Levels.fyi's data. Christopher Walken's on-screen negotiation scenes. *Billions*' closing scenes.

**Research demands.**
- Design the door appearance. Animation timing. Notification. What the C-Suite looks like *before* vs *after* the door exists.
- Design the `offers` table schema: base, bonus, equity, sign-on, housing, start date, location, benefits jsonb, received_at, deadline_at, status enum.
- Research comp benchmarking. Levels.fyi API if available. Otherwise a static reference table for target sectors. Per-tier, per-location bands.
- Research the salary negotiation simulator (creative addition). CPO plays the recruiter. User practices counters. Scored on anchoring, concession management, walk-away.
- Research reference-request drafting. CNO drafts requests to the user's highest-warmth contacts, tracks whether references submitted, drafts thank-yous.

**Provocations.** The door is a moment. The comp band chart has a single pin for the user's offer — red below 25th percentile, gold above 75th. Competing offers stack as folders, and the chart shows both pins. The negotiation script drafts *live* in front of the user.

**Anti-patterns.** A "Comp benchmarks" page. A "Negotiation templates" library. Generic email drafts.

**Non-negotiables.** Climate in full. Send hold is not optional for negotiation emails (24h minimum). All offers data is user-owned and exportable.

**What would break this.** A Parlor that ships generically and fails the first real user. A negotiation script that sounds like boilerplate. A comp chart that's wrong about market bands for the user's specific market.

**I don't know yet.** Whether Levels.fyi has an API we can use, or whether we need a manual seed dataset.

**Proof.** Offer arriving via email parses into the offers table. Parlor door appears within a short window. Comp chart renders with real benchmarks. Negotiation script generation produces a draft the user can send with minor edits. Side-by-side comparison works with 2+ offers. Deadline alerts fire.

**Sharpening target.** The Parlor's signature detail. Something that rewards the rare user who gets here — a sound, an Easter egg, a CFO quip. This room will not be seen often; make each visit memorable.

---

## §8 — Living expansions (the post-offer, post-placement layers)

*Not phases of the initial build. Research directions for when R10 is behind us.*

**Post-offer transition layer.** The period between signing and start-date — relocation, resignation letter drafts, pre-start prep, onboarding anticipation. A temporary "Transition" floor appears, then fades.

**Alumni floor.** After the user lands, the building shifts. Most floors quiet. The Rolodex stays open. A subtle tier (*Alumni*, low monthly cost) keeps the user connected to their network and Tower's industry awareness.

**Industry cycle awareness.** The Tower's cron job knows that for RE finance, September opens full-time recruiting. Proactively re-engages the user at cycle start: *"RE analyst applications open today. Restart Discovery?"*

**Partner/spouse mode.** A household-level view where two users (with explicit mutual consent) share a Rolodex and coordinate interviews. Team tier UX.

**The moat layer.** Consensual, anonymized outcome aggregation — which resume keywords land interviews, which cover letter tones convert, which companies respond fast. Over time, the Tower knows things about (say) RE finance recruiting that ChatGPT doesn't, because we saw them happen. Start the plumbing before it's needed; don't retrofit.

---

## §9 — The Phase Ledger (how sessions hand off)

Markdown prose doesn't tell the next Claude session what's built vs. what's claimed. The Ledger does.

### Layout

```
.ledger/
  CURRENT.yml               # active phase pointer + schema version
  R0-hardening-sprint.yml   # per-phase state
  R1-war-room-floor-7.yml
  ...
scripts/
  ledger/
    verify.ts               # drift detection: notes-claimed evidence vs repo reality
  tower/                    # CLI that reads/writes the ledger (start, done, block,
                            #   handoff, status, resume, …). Commit-msg hook warns
                            #   when src/ commits are missing a [Rn/n.n] tag.
```

The Tower CLI (`npm run t …`) is the only interface agents use to mutate the
ledger; drift detection runs via Husky pre-commit (warn-only).

### Per-phase YAML (abbreviated)

```yaml
schema_version: 1
id: R0
name: "Hardening Sprint"
status: in_progress            # not_started | in_progress | blocked | done
percent: 10
deliverables:
  - id: "0.1"
    name: "Session persistence fix"
    priority: P0
    status: not_started
    commits: []
    evidence:                  # verifier checks these
      - path: "tests/e2e/session-persistence.spec.ts"
        kind: test_file
      - path: "src/middleware.ts"
        kind: file_exists
      # ... etc
decisions:                     # append-only log
  - date: ...
    decision: ...
    reason: ...
last_session_handoff:
  summary: ...
  next_step: ...
  gotchas: ...
```

### The verifier

`scripts/ledger/verify.ts` runs at session start AND on Husky pre-commit.

For each deliverable with `status ∈ {in_progress, done}`: check every `evidence` entry. `file_exists` → path exists. `test_file` → path exists AND test passes. `env_var_required` → env variable set. Output: a drift report. Drift surfaces in `NEXT-SESSION.md` and in CI.

### Commit message discipline

Husky commit-msg hook enforces: every commit must prefix `R{N}/{D}:` (deliverable-scoped) or `R{N}:` (phase-scoped) or `meta:` / `docs:` / `fix:` (housekeeping). Auto-updates the relevant `R{N}.yaml`'s `deliverables[].commits[]`.

### The handoff file

At session-end (or the 70% context threshold), agents run `npm run t handoff -- --stdin` with a JSON payload of decisions, surprises, and next steps. The Tower CLI writes `.handoff/YYYY-MM-DD-HHMM.md`, releases the phase lock, and commits the handoff. The next session reads the latest handoff via `npm run t resume`.

### What this replaces

- `SESSION-STATE.json` → deprecated.
- Acceptance-criteria checkboxes in `docs/MASTER-PLAN.md` → migrated to phase YAMLs.

### Creative framing

The Ledger is the **Foreman's clipboard**. Every building has a foreman. They don't design or build — they know what's finished and what's next. The Ledger is that clipboard in code.

---

## §10 — Execution modes

### Default — one session at a time

User opens a Claude session. Says *"let's do R0"* or *"continue."* Claude spawns sub-agents in parallel *inside* that single session for research, testing, building independent pieces. User doesn't manage branches, PRs, or merges. Claude handles all of it.

### Optional — overlapped phases (opt-in per wave)

For waves where phases are genuinely independent (e.g., R1+R2+R5 don't share files deeply), Claude can ask: *"This wave has independent phases. Want to overlap?"* If yes: Claude prints 2–3 copy-paste terminal commands that set up worktrees, user opens a second Claude Code session in the other folder. When both finish, Claude merges. User's total involvement: 3 copy-pastes per opted-in wave.

### When not to overlap

- R0 (foundation; must be serial).
- Wave 5 polish (touches everything).
- R4 Lobby (high-stakes integration).

### Who plays coordinator

Claude. The user never plays Conductor, Reviewer, or Integrator. Those roles live inside Claude sessions.

### File ownership for safe parallelism

If overlapping phases: each session owns its floor's path tree (`src/components/floor-N/*`, `src/lib/agents/{dept}/*`, `src/app/(authenticated)/{route}`). Serial-only files: `src/db/schema.ts`, `src/styles/globals.css`, `package.json`. Schema migrations land one at a time, coordinated through the Ledger.

### Red-team cadence

After every finished phase, Claude runs a red-team pass before handing to the user for review. User skims the REDTEAM-{session_id}.md output; agrees or disputes findings.

### Fresh-session cadence

Before declaring a phase done, a completely fresh Claude session reads the Brief and the live product and checks for mediocrity (see §0).

### "Max Power" loadouts (opt-in per phase)

- **Tournament.** Two Builder sessions build the same signature moment independently. Reviewer compares. User picks the winner. 2× cost. Reserve for the highest-stakes moments (Morning Briefing, Dispatch Graph, Lobby arrival).
- **Swarm.** For R0's P1 cluster: 5 sessions share one worktree, each owning one deliverable, with pre-agreed file ownership. High coordination, fast close.
- **Double-Check.** Two independent Reviewer sessions must both approve any change touching auth, crypto, or billing. No exceptions.
- **Deep-Think.** Dedicated Researcher session for architecture decisions (Inngest vs Vercel Queues, Rive vs Lottie). Written memo, user reviews, then build.
- **Vision Lock.** Before R4, produce 3 Figma-grade visual comps. User picks direction. First impressions matter too much for "build then iterate."

---

## §11 — Open Questions (what the user decides before R0)

*You can answer as few or as many as you want. The three marked **blocker** must be answered for R0 to start; the rest can be batched as phases approach.*

### Blockers to start R0

1. **Session-persistence fix strategy.** Primary hypothesis: `src/proxy.ts → src/middleware.ts` rename. Options:
   (A) Try rename first (5-min test, clear pass/fail). If it fixes it, ship and move on.
   (B) Do full audit before any fix.
   My recommendation: **(A)**. Cheap test; unblocks everything.

2. **Phase Ledger depth.**
   (A) Full design as spec'd in §9 (YAML per phase + verifier + handoff + commit-msg lint).
   (B) Lite — YAML structure only; skip the verifier until we see real drift.
   (C) Skip entirely; rely on markdown and human memory.
   My recommendation: **(B)** lite. Adopt the discipline; defer the scripting cost.

3. **Overlap mode appetite.**
   (A) Never overlap — one phase at a time always.
   (B) Overlap on Wave 2 + Wave 3 when asked.
   (C) Overlap whenever safe.
   My recommendation: **(B)**.

### Non-blockers (answer as phases approach)

4. **Job Discovery source priority.** JSearch only / ATS direct (Greenhouse, Lever, Ashby) / both. Rec: **both**.
5. **Auto-apply scope.** Draft-and-queue only / email-send with undo / form-fill via Playwright. Rec: **draft + email-send; defer form-fill**.
6. **Resume base data entry.** PDF upload with AI parse / LinkedIn scrape / manual markdown. Rec: **PDF + AI parse**.
7. **Character rendering plan.** Stay 2D-static / Rive for the 4 most-used (CEO, CMO, CPO, CRO) / Rive for all. Rec: **(B)**. *Resolve before R3 character work begins.*
8. **Morning Briefing auto-play.** Auto-play skippable / user-triggered banner / user-configured. Rec: **user-configured, default auto-play skippable**.
9. **ElevenLabs voice for CEO.** Ship with R2 / defer to R3 / never. Rec: **defer to R3**.
10. **Offer data model.** Extend `applications` / new `offers` table. Rec: **new `offers` table**.
11. **Inngest vs Vercel Queues vs raw Cron.** Rec: **Inngest**; migrate to Queues if/when GA is strong.
12. **Paywall timing.** After R1 / after R3 / after R5. Rec: **after R3**.
13. **Observability admin route.** Hidden `/admin/logs` behind `OWNER_USER_ID`? Rec: **yes**.
14. **Character art direction.** Commission Rive files / AI-generate poses / stay 2D-static. Rec: **answer when R3 approaches**.
15. **Analytics retention.** Indefinite / rolling 90 days / user-configurable. Rec: **user-configurable, default indefinite**.
16. **Mobile strategy.** Desktop-only hard / desktop-first + graceful degrade / full responsive. Rec: **desktop-first + graceful degrade**.
17. **Beta scope.** Armaan-only indefinitely / private beta at R3 / public at R3. Rec: **private beta at R3**.
18. **Monetization structure.** Old 10-app cap / new Free+Pro+Alumni+Team (see §4 cost + §2 norms discussion earlier). Rec: **new structure**.
19. **Pro price point.** $19 / $29 / usage-based. Rec: **$29/mo with 14-day trial**.
20. **Outcome corpus consent.** Opt-in anonymized aggregation from day one / never. Rec: **opt-in**.
21. **Cross-user network effects.** Build in R8 / defer to v2. Rec: **R8 with explicit consent UX**.
22. **EU AI Act posture.** Treat as mandatory even if US-only / defer until EU users. Rec: **mandatory**.
23. **R1 North-Star proof-of-concept priority.** Mandatory R1 deliverable / stretch. Rec: **mandatory**.
24. **Lobby arrival tech.** Full R3F / pre-rendered video / CSS-only parallax. Rec: **pre-rendered video** (same visual, less tech complexity). *Confirm before R4.*
25. **Outcome corpus retention.** Indefinite / 3-year rolling / user-configurable. Rec: **user-configurable, default 3-year**.
26. **Red-team cadence.** After every phase / user-request only / never. Rec: **after every phase**.
27. **Doubt artifacts commit policy.** Commit to repo / gitignore. Rec: **commit** — evidence of rigor.
28. **Tournament mode scope.** None / 2 moments (Morning Briefing + Dispatch Graph) / 4 moments / every signature. Rec: **2 moments**.

---

## §12 — Housekeeping (for Claude sessions)

Not a Brief. Just true things Claude needs when executing.

### Files that already exist and are worth reading before touching anything

- `CLAUDE.md` — project conventions (stack invariants, commands, Husky workflow, session state rules).
- `docs/VISION-SPEC.md` — the canonical spatial UI spec.
- `docs/CHAIN-OF-COMMAND.md` — CEO → department → subagent hierarchy (3,000+ lines; has the RE-finance tier list, recruiting calendar, scope-enforcement rules).
- `docs/CHARACTER-PROMPTS.md` — system prompts for 8 C-suite agents (may be stale relative to §5; read critically).
- `docs/SCHEMA-DRAFT.md` — 16-table schema with RLS.
- `docs/WAR-ROOM-BLUEPRINT.md` — Phase 1 implementation guide from the original roadmap.
- `docs/BUG-TRACKER.md` — fix log.
- `BOOTSTRAP-PROMPT.md` — auto-generated on every commit; source of truth for build health and current phase.
- `src/db/schema.ts` — the 16 tables.
- `src/lib/supabase/middleware.ts` / `src/lib/supabase/server.ts` / `src/lib/supabase/client.ts` — auth layer.
- `src/proxy.ts` — the currently-named middleware file; see R0/0.1 for why this matters.
- `src/components/world/PersistentWorld.tsx` — the shared world chrome. Don't touch unless you understand it.
- `src/app/lobby/lobby-client.tsx` — the current best reference for motion vocabulary. Until R4 ships, extract primitives from here into `src/components/world/primitives/`.

### Known orphaned / ready-to-wire modules

Listed in §2 above. These are pre-built infrastructure ready to consume in their owning phases.

### Critical technical gotchas

1. **DB access on Vercel serverless.** NEVER use Drizzle's `db` runtime client in server components or API routes on Vercel. The Supabase DB is IPv6-only at `db.jzrsrruugcajohvvmevg.supabase.co:5432` and the pooler returns "Tenant not found." All runtime access goes through the Supabase REST client (`supabase.from('table')...`). Drizzle is schema-only — migration and type inference, no query.
2. **React 19 + Next 16 JSX namespace.** Import `JSX` explicitly: `import type { JSX } from "react"`.
3. **GSAP tree-shaking.** `src/lib/gsap-init.ts` exists as a centralized import — but `lobby-client.tsx`, `EntranceSequence.tsx`, and `Elevator.tsx` currently import directly from `"gsap"`. Wire through gsap-init. (Minor tech debt, acceptable to defer.)
4. **ProceduralSkyline default.** Canvas-based renderer; defaults to "night" outside `DayNightProvider` context (intentional for lobby).
5. **EntranceSequence replay.** Uses sessionStorage for "played" flag — per-session first entrance.
6. **Vercel auto-deploy.** `main` gets automatic production deployment.
7. **Supabase REST client pattern.** `createClient()` from `@/lib/supabase/server` for server; `@/lib/supabase/client` for client.
8. **Next 16 middleware filename.** The framework expects `src/middleware.ts`. The current file is `src/proxy.ts`. This is the suspected root cause of the session-persistence bug (R0/0.1).

### Agent hierarchy (for Claude sessions touching agent code)

User → CEO → 7 departments (CRO, COO, CNO, CIO, CMO, CPO, CFO) → CRO has 5 subagents (Job Discovery, Application Manager, Pipeline Analyst, Intel Briefer, Offer Evaluator). Full spec: `docs/CHAIN-OF-COMMAND.md`. System prompts live in `src/lib/agents/{dept}/system-prompt.ts`. Tools in `src/lib/agents/{dept}/tools.ts`. Shared handler in `src/lib/ai/agents/shared-route-handler.ts`.

### Tech stack summary (authoritative)

Next.js 16 App Router · React 19 · TypeScript (strict; no `any`) · Tailwind v3 (JS config) · Supabase SSR + REST · Drizzle (schema-only) · Vercel AI SDK v6 · GSAP 3.14 · @dnd-kit · XState · Vitest + happy-dom · Zod v4 · Stripe · Upstash (Redis + Ratelimit) · Sentry.

### Session-end protocol

When a phase is done and the session ends: the Ledger verifier runs, the handoff file generates, the last commit is pushed. Run `npm run session:end -- --message "..."` as the one-line close. The user will see the phase review ping from Claude; they do not see the session-end machinery.

---

## §13 — The Shape of What We're Building

The Tower is a building. The building is a command center for an autonomous career-operations team. The autonomous team works for one user at a time. The user enters through a lobby, rides an elevator, walks into rooms, meets characters who remember them, watches work get done in real time, gets out of the building at the end of the day with real progress behind them.

That is the outcome. Everything in this Brief serves it.

If you're a Claude session reading this: go to the Reference Library. Steep. Write your Taste Memo. Sketch your three alternatives. Write down what you don't know. Then — only then — build. Sharpen at the end. Leave the phase better than the Brief asked for. Commit the surprise.

If you're Armaan: when the phase is done, Claude will ping. Click around. Tell us what's right and what's not. Say *"ship it"* or *"change this."* You have our attention.

---

*End of Brief.*
