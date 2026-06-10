# 📒 Session Ledger — 2026-06-09 (the anti-amnesia doc)

*Written immediately before context compaction, at the Commander's order: "compact without
losing ANY vital information." This is the re-grounding document for the post-compaction
session (or any successor). It indexes what's on disk, captures what exists ONLY in the
conversation, and defines the live operation in flight. Read this + `HANDOFF.md` and you
are fully re-armed.*

---

## 1. State in one screen

**The Military, doctrine v2 + the at-max review, kernel installed.** One day's arc:
Opus swarm design → Fable v1 rewrite (doctrine, not software) → v1 sieged same day
(4 Claude lenses + Codex 18-finding teardown; ~39 kills folded; 1 finding rejected:
pre-Go Briefing budget cap — contradicts intent-deserves-disproportionate-spend) →
**v2 after the Commander's counterattack** (Intelligence Division with real machinery ·
Deployment Officer recalled as seat resolver · Standing Operations · Skirmish/Campaign/
Probe gears · SITREP→Dispatches, WORKLOG→War Log) → **full-spectrum review**
(`THE-MILITARY-AT-MAX.md`: Tailor pipeline, General's seat spec, night-shift answer,
Base-vs-andro corrections, organ-at-max atlas, 14 new gaps — 3 fixed in doctrine:
cold-start mode, first-contact exemption, doctrine-version stamp) → **the Kernel
installed** (core-not-skills, live on this machine).

## 2. The doc map (all in `docs/factory/` unless noted)

| File | What it is |
|---|---|
| `HANDOFF.md` | START HERE for any fresh session |
| `THE-MILITARY-DOCTRINE.md` | **v2 spine** — two maxims, five moves, gears/tempos, Verdict Ladder, RoE, fleet/resolver, §10 packaging |
| `THE-INTELLIGENCE-DIVISION.md` | learning machinery w/ provenance (Archive, Analyst, Boot Camp, minting, Service Record) |
| `THE-BASE.md` | frontend spec (9 rooms + Builder Mode, 10 UI laws, B0–B3 build order) |
| `THE-MILITARY-AT-MAX.md` | the examination round: kernel design, night shift, Tailor §3, General's seat §4, andro corrections §5, organ atlas §6, 14 gaps §7, linked-puzzle §8 |
| `THE-MILITARY.md` | canon cast v3 (incl. personnel file: who was retired/recalled and why) |
| `THE-MILITARY-CONCEPT.md` | newcomer prose explainer |
| `BRIEFING-ROOM.html` | the visual pitch, **rebuilt to v2** (render-checked, sliced screenshots verified) |
| `2026-06-09-fable-revision.md` | the full decision trail §1–8 incl. both siege kill-logs |
| `OPERATION-PROVING-GROUND.md` | pilot campaign, draft Orders ready for the Commander's edits |
| `OPERATION-BLUEPRINT.md` | superseded (banner) — cancelled 50–60-agent research run |
| `doctrine/` | PLAYBOOK (95 lines), GOTCHAS, VERDICTS, check-caps.sh (all caps green), class-kits/code.md |
| `2026-06-09-{factory-brainstorm,naming-worlds,title-bank}.md` | Opus-era corpora (851 ideas = the Reserve's bench) |
| `../research/androoagi-transcripts/` (44 .txt) | the TikTok field study, preserved from /tmp this session |
| this file | the compaction ledger |

Memory note (recall path): `~/.claude/projects/-Users-armaanarora-Developer-The-Tower/memory/project-the-military-build-engine.md` — current as of this ledger. MEMORY.md index line updated.

## 3. Machine state — what was INSTALLED this session (live config changes)

1. `~/.claude/CLAUDE.md` — "Skill routing" section **replaced** by the Military session
   kernel (route silently; organ names never surface; reflex defaults: sharpen-before-build,
   attack-before-done, danger→proposals).
2. `~/.claude/settings.json` — **UserPromptSubmit hook added**: echoes
   `<military-kernel>Route-check…</military-kernel>` into every message (~40 tokens).
3. `~/.codex/AGENTS.md` — Military kernel appended; Codex's standing seat = Demolition Squad.
4. **Backups of all three**: `*.bak-2026-06-09` alongside each file.
5. NOT done deliberately: no `/military` skill (routing-collision risk mid-revamp), no
   skill merging (grill-me/forge stay separate until after Proving Ground), no Routines
   created yet, **nothing committed to git**.

> ⚠️ **GIT WARNING:** `docs/factory/` (the ENTIRE Military) is untracked + uncommitted on
> one laptop. A `git clean -fd` or disk failure erases the whole system. First action
> when the Commander allows: commit it. This is also gap #11 (disaster recovery) eating
> its own tail.

## 4. 🔴 LIVE OPERATION — four parallel cold-eyes reviews (in flight NOW)

The Commander launched the no-bias brutal-review prompt (authored last turn) in **four
parallel fresh sessions**: Fable 5 **with** ultracode · Fable 5 **without** ultracode ·
Opus 4.8 with ultracode · Codex 5.5 fast mode.

Prompt design (for triage context): pointers + permission only, zero direction; **nothing
protected — not even the north star**; prior sessions' reasoning explicitly carries no
authority; includes the self-distrust warning ("written by a model like you — distrust
that comfort"); no obligation to be constructive. Deliverable: write verdict to
`docs/factory/2026-06-09-cold-eyes.md` + short version in chat.

> ✅ **FILE COLLISION — RESOLVED (22:45).** All four were told to write the same file;
> the clobber was caught and fixed live:
> - **Opus 4.8 verdict** safe at `2026-06-09-cold-eyes-opus.md` (it was the survivor on
>   the shared path; session 85e3b33d…).
> - **Fable #1 verdict** safe at `2026-06-09-cold-eyes-fable.md` — its first write WAS
>   clobbered by Opus, but the session self-rescued and re-saved (titled "Cold Eyes II";
>   **it read Opus's verdict first → semi-independent, weight accordingly at triage**;
>   session c372c8ee…; verified against its transcript).
> - **Guard daemon v3 armed:** PID 60685, `/tmp/cold-eyes-guard.sh`, detached (survives
>   session end/compaction), 8-hour watch from ~22:45 — polls every 2s and snapshots
>   EVERY distinct version of any `*cold-eyes*.md` into
>   `docs/factory/cold-eyes-snapshots/` (dedup via `.seen-hashes`). Both existing
>   verdicts already snapshotted. Gotcha learned: macOS bash is 3.2 (no `declare -A`) —
>   the guard is portable sh.
> - **Still running:** Fable #2 (Claude session b09b9ba5…, no write yet) and Codex 5.5
>   (`~/.codex/sessions/2026/06/09/rollout-…22-34-28-019eaf61…`). Wherever they write,
>   the guard preserves it. Both Fable transcripts contain the string "ultracode" (the
>   reminder appears either way), so identify which Fable had ultracode by asking the
>   Commander at triage.
> - Full verdict texts are also recoverable from each session's transcript JSONL
>   (`Write` tool_use inputs) if anything else goes wrong.

**Triage protocol when they return (this is siege round 3):**
1. Collect all four verdicts (watch the clobbering).
2. Dedupe findings across reviewers; convergent findings from different model families =
   highest-priority signal (the v1 siege showed the families find disjoint sets).
3. Adversarially verify before folding — reviewers can be confidently wrong; the
   disposition ledger discipline applies (fixed/rejected/deferred/accepted-risk + reason).
4. Findings against the **north star itself**: surface to the Commander, his call alone
   (he holds the dream sacred; the prompt deliberately didn't).
5. Fold survivors → doctrine v2.x; record the round in the fable-revision trail (§9).
6. Note: the kernel hook fires inside those sessions too — reviewer complaints about the
   kernel are themselves findings.

## 5. Conversation-only context (things written nowhere else)

- **Honest authorship flag:** `THE-MILITARY-AT-MAX.md` §1 (kernel) and §3 (Tailor) were
  written by ME from skeletons — their research agents over-compressed via the
  StructuredOutput schema (the known large-output+schema gotcha, reconfirmed twice this
  session). §2/§4/§5/§6/§7 are grounded in full agent briefs. If cold-eyes attacks §1/§3
  as under-evidenced, that's fair.
- **Research provenance:** v2 was powered by 4 web researchers (Hermes Agent/Curator ·
  ACE delta-playbooks · Voyager skill library · MemRL/Generative-Agents retrieval ·
  packaging incl. Routines + June-15 billing split · Mission-Control frontend patterns)
  + the 44-video andro pipeline (yt-dlp needed curl_cffi impersonation + `-f
  "b[vcodec^=h264]" -S "+res"` because TikTok's h265 streams were video-only; whisper.cpp
  base.en at /tmp/whisper-models/ggml-base.en.bin, Metal, ~6h audio in minutes).
- **Andro essentials** (if transcripts are ever lost): Ultron orchestrator (one expensive
  brain gates cheap workers), ~$400/mo for 7 businesses (~$16-17k Etsy + Fiverr
  thumbnails), approve/reject "a few hundred times over 2-3 days" → full trust, research
  bay (Nova) copies-what-sells, radar bay = standing system-improver, Obsidian archive of
  all feedback, replicate-never-install for ClawHub skills, Next.js+TS+Phaser + AI art,
  "the only true skill is articulation," "fuck the ecosystem — Discord would be easier."
- **Commander's standing preferences logged this session:** call it **the military**;
  hates skill-name proliferation (hence the kernel); wants recursive zoom-out/zoom-in
  examination rounds; wants brutal/unbiased external review (runs multi-model parallels);
  wants imagination pushed to max then trimmed; rebuild-the-HTML-after-substance ordering.
- **Key dates/economics:** Fable free window ends **2026-06-22** (then ~2× Opus, $10/$50
  per M); **2026-06-15** Anthropic billing split (headless/SDK/Actions → separate
  Agent-SDK credit pool, $200/mo incl. with Max 20×); Routines cap Max = 15 runs/day;
  budget posture $200 Max + $100 Codex Pro.
- **Workflow run IDs** (resumable, same session only — likely dead after compaction):
  siege wf_9761f0e1-ea3 · v2 research wf_91b5e099-dc2 · full-spectrum wf_d2f4d17f-79f.
  Full agent briefs in task outputs under /private/tmp/claude-501/… (volatile; key
  content already distilled into the docs).

## 6. The queue (next actions, ranked)

1. **Triage the four cold-eyes verdicts** (§4 protocol) → fold → doctrine v2.x.
2. **Commit `docs/factory/`** (Commander's word needed) — see GIT WARNING.
3. **Operation: Proving Ground** — Orders skeleton ready; Commander brings: victory-
   condition edits, Supabase/Vercel for the new repo, stop-loss numbers, "go."
4. **Stand up the night shift**: 3 scheduled Routines (Analyst nightly · Morning Brief
   daily→Telegram · check-backs weekly) + 1 API-trigger routine (Telegram→campaign).
5. **Fable-vs-Opus benchmark** in the General's seat before 06-22 (calibrates the
   capability-tier table; first Service Record entry).
6. After the pilot: `/military` plugin-skill + skill-folding migration; second proving
   ground must be **Rung-2** (researched decision memo) to exercise non-code verdicts;
   Base B1 terminals as a sibling campaign.

*Compaction may proceed. The files carry the force; this ledger carries the session.* 🎖️
