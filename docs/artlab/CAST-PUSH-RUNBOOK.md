# ArtLab — Cast Push Runbook (Phase 6)

The 9 Season-1 characters to produce after Rafe Calder is promoted:

| # | Character ID | Telegram trigger | Floor / role | Special notes |
|---|---|---|---|---|
| 1 | priya | `make Priya Vasquez` | Floor 7 War Room / CRO | Pipeline closer energy; deep colors |
| 2 | dylan | `make Dylan Marsh` | Floor 6 Rolodex / CNO | Warm extrovert; relationship-focused |
| 3 | vera | `make Vera Bloom` | Floor 5 Writing Room / CMO | Editorial precision; "atelier confidence" |
| 4 | sol | `make Sol Navarro` | Floor 4 Situation / COO | Calm authority; situational adaptability |
| 5 | inez | `make Inez Reyes` | Floor 3 Briefing / CPO | Coaching/interview prep persona |
| 6 | mina | `make Mina Hart` | Floor 2 Observatory / CFO | Analytical; comfort with numbers |
| 7 | etta | `make Etta Brooks` | Floor 6 secondary / CIO | Information-architecture mind |
| 8 | rowan | `make Rowan Park` | Floor 4 secondary | Operations support |
| 9 | nadia | `make Nadia Saito` | Floor 3 secondary | Interview-prep coach |

**Per-character protocol:**

1. From Telegram: send the exact trigger text (column 3).
2. Wait for concept-board notification (5 lanes) — typical wall-clock < 4 minutes (post-Phase-5).
3. Reply `approve direction <n>` selecting the lane closest to the character's role.
4. Wait for final-board notification (21-sprite grid) — typical wall-clock < 10 minutes.
5. Inspect the final board carefully against the character's role + voice.
6. Reply `approved for app` to promote.
7. `npm run artlab:status -- <runId>` confirms `closed` phase.
8. Browser-QA the affected floor: `npx playwright test tests/e2e/<floor>-browser-qa.spec.ts`.
9. Run `npm run artlab -- health` and verify the speed/quality dashboard shows no regression.

**If a concept board fails QA:** reply `revise: <one-sentence direction>`. Engine regenerates. Three consecutive coherence failures escalate to Armaan via Telegram blocker.

**If the production pack is wrong:** cancel via Telegram `/cancel <runId>` — engine releases budget reservations and writes a refund-confirmation message.

**Memory checkpoint after every promote:**
- `wc -l .artlab/engine/memory/style-wins.jsonl` increased by 1.
- `wc -l .artlab/engine/memory/style-rejections.jsonl` may have grown if any concepts were rejected.
- `wc -l .artlab/engine/memory/prompt-evolution.jsonl` may have grown if the prompt builder hardened.

**Bundle test (after at least 3 characters promoted):** send `make the war room with Rafe in it` from Telegram. Engine should parse as a bundle, spawn ≥ 2 linked sub-runs (war-room environment + Rafe co-appears scene), and promote atomically.
