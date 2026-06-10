# 🏛️ The Military — the concept (read me first)

*An explainer for someone who's never heard of this.*

## In one breath
**You give it an idea. It gives you back the finished thing — built, attacked, surviving.**
You're the Commander-in-Chief: you sharpen what you want with it, edit one contract file,
say **go** — and a campaign runs: one very strong AI agent plans it, builds it, calls in
reinforcements only when genuinely needed, has a *rival* AI try to kill the result, and
ships only what survives. Then it writes down what it learned, so the next campaign is
sharper. It works for anything you can describe — an app, a feature, research, a decision —
and it gets smarter every run.

> **North star:** the last tool you need to build. Everything downstream of *"I want X"*
> gets handled. The only ceiling left is your imagination.

## The big idea (and the big change)
The first design (2026-06-09, Opus era) assumed builders were weak: break everything into
tiny tasks, freeze contracts everywhere, swarm dozens of workers, route between models,
log every step into a pipeline. Machinery to compensate for weakness.

Then the capability jump landed, and the design was rethought around one maxim:

> **Build nothing the model curve will obsolete. Build only what compounds as models improve.**

Orchestrators, routers, manifests, daemons *depreciate* — every smarter model needs them
less. Briefs, rubrics, golden templates, debriefs *compound* — every smarter model executes
them better. So **The Military is not software**. It's **doctrine**: a campaign protocol
plus a thin set of files, run by the strongest available agent on top of tools that already
exist. When models get smarter, The Military gets stronger automatically.

Building stopped being the scarce thing. The doctrine spends its discipline on what's still
scarce: **knowing what to build** (the Briefing), **knowing it's actually right** (the
Siege), and **getting smarter every run** (the Debrief).

## The five moves
```
👑 You ─▶ 📋 THE BRIEFING    it interrogates you until intent is sharp → writes the Orders
                │              (one editable file: mission, victory conditions, how it'll
                │               be judged, guardrails, cost estimate, cut-lines)
          🚦 GO/NO-GO        the one spend gate: YOU edit the Orders directly, say "go"
                │
          🔨 THE BUILD       one strong agent builds it end-to-end (F1, the default);
                │             fans out helpers for side-work (F2); true parallel
                │             decomposition only when measured walls demand it (F3)
                │             — walking skeleton early, situation reports as it goes
          💥 THE SIEGE       a DIFFERENT model family attacks it with kill authority;
                │             every finding dispositioned; done = survived, not "tests pass"
          🎓 THE DEBRIEF     after-action report → distilled into doctrine
                              → the next campaign starts smarter
```

And when you don't yet know exactly what you want (exploration, taste, debugging), a cheap
**Probe loop** runs first — small builds whose only job is to *discover* the intent — and
the five moves start once it's found.

## Show me: *"I want a gym tracker"*
1. 👑 You: "Dead-simple gym tracker my girlfriend, brother & I share — log lifts fast,
   see progress."
2. 📋 The Briefing interrogates: *"Log a set in under 10 seconds mid-workout — is that THE
   make-or-break?"* … then writes `ORDERS.md` with victory conditions, the test plan, a
   cost estimate, and what's explicitly out of scope.
3. 🚦 You cross out "social feed", change "PWA" to "must feel native", type **go**.
4. 🔨 One agent builds the whole app (it's F1-sized). You get a First Contact link to a
   working skeleton the same hour, then Dispatches while it fills in.
5. 💥 Codex attacks it: finds the offline case nobody specified. Fixed. Survives round two.
6. 🎓 The AAR records what the Siege caught and what it cost; one lesson graduates to
   doctrine. ✅ You get a URL. The *next* campaign briefs faster and tests smarter.

## Why "done = survived", not "tests pass"
The builder writing its own tests and declaring victory is a closed loop — it's most
confident exactly when it's most wrong. So nothing ships until a **different model family**
(no shared blind spots) attacks it with explicit kill authority, and every finding gets a
recorded disposition. For things with no tests — research, decisions, decks — the judging
rubric is frozen *before* building and attacked *before* go, and anything the world only
judges later (a decision the market answers) goes in a **verdicts ledger** with a
check-back date: the system doesn't get to grade its own taste.

## Why it compounds (the Intelligence Division — and it's measured, not promised)
Four organs, each a proven mechanism (full spec: `THE-INTELLIGENCE-DIVISION.md`):
1. **The Archive** — *everything* is recorded (every order, log, attack, and especially
   every piece of your feedback **with its reason**), indexed so the right precedent
   surfaces at every Briefing — and precedent that keeps working ranks higher automatically.
2. **The Analyst** — a standing agent that runs nightly: consolidates lessons, checks old
   predictions against what actually happened, watches the metrics for drift, and proposes
   doctrine improvements as PRs you approve. The force has a member whose whole job is
   making the force better.
3. **Boot Camp** — new kinds of work start supervised: you approve/reject with reasons,
   a few dozen rounds, all remembered — until the rejection rate falls below a written
   threshold and the class **graduates** to unsupervised. You can watch the trust curve.
4. **The Armory's forge** — every campaign that survives can mint reusable weapons:
   templates, rubrics, whole skills. The Military is a skill that creates smaller skills.

And the honest scoreboard: every campaign logs its **Service Record** (attack kill-rate,
estimate accuracy, how often you had to intervene, cost). Improvement is a falling curve
on a chart — if the chart doesn't fall, it isn't improving, and the Analyst flags it.

## What happens when the strongest model gets expensive
The compounding lives in **the files, not the model** — every mechanism above improves a
*frozen, cheaper* model too (that's what the research shows and why these mechanisms were
chosen). When the Fable window closes: the General's seat falls back down a named chain
(Fable → Opus → Sonnet), the solo-build bar drops with it, and the force **decomposes
earlier and attacks harder** — the original swarm design was never deleted; it's the
reduced-strength gear. Before the window closes, the same benchmark campaign runs on both
seats so the fallback posture is measured, not guessed.

## What keeps it safe
**Rules of Engagement**, set before any spend: blast-radius classes (🟢 build freely /
🟡 propose as a PR, never write directly / 🔴 human confirms each irreversible action),
protected paths, cost + time stop-losses, and a loop detector that halts repeated failing
hypotheses. Danger gates the depth of everything — not size.

## The cast, the docs
The full cast table, Force Levels, fleet, and retired units: **`THE-MILITARY.md`**.
The executable doctrine an agent actually runs: **`THE-MILITARY-DOCTRINE.md`**.
Why everything changed and the kill-log of the design's own siege:
**`2026-06-09-fable-revision.md`**.

## Two tempos, three gears
Bounded **campaigns** build things; **standing operations** run things that never finish —
a product, a store, a content pipeline — on rhythms: a *"Good morning, Commander"* brief
every day, a weekly review, and pivot councils when something underperforms. Small
reversible jobs run as **skirmishes** (the ceremony collapses); unknown territory runs a
**probe loop** first. The Military is rigid exactly where it must be (the attack, the
stop-losses, the danger gates) and loose everywhere else — the Orders can waive any other
rule with a logged reason.

## Where it lives
A `/military` skill in Claude Code (the brain) → a `military` CLI for launching campaigns
from any terminal → daily rhythms on a scheduler → gates and dispatches on your phone via
Telegram → and eventually **the Base** (`THE-BASE.md`): a walkable command world where
every room is a function, every character is a real agent, and every terminal is real —
the same move The Tower makes for job-seeking, applied to the force itself.

## Status
Doctrine v2 — sieged on day one (4 adversarial lenses + a cross-model assault), then
rebuilt harder after the Commander's counterattack added the learning machinery, the
fallback chains, and the standing tempo. Not yet field-tested: the first campaign is
**Operation: Proving Ground** (the gym tracker), where the real thing under test is the
doctrine. The dream is unchanged. The machinery lives in files that compound — so the
model curve makes it stronger every month instead of more obsolete.
