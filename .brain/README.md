# 🧠 .brain/ — this project's memory (any agent: read this first)

This folder is the project's brain. Every AI agent working here reads it on the way in
and writes back on the way out. Global conventions: `~/Developer/commonbrain/`.

```
save/<lane>.md    live task state — ONE file per work-stream. Resume from here.
                  Template: ~/Developer/commonbrain/templates/save.md
claims.md         who's working on what (multi-agent weeks only)
decisions/        settled choices + WHY — one fact per file. Do not relitigate.
gotchas.md        traps that bit a real run IN THIS PROJECT
```

**On boot:** read your lane's save file + scan both gotchas files (here + global) for
entries matching your task. Echo the mission in ≤5 lines before building.
**On done:** update the save file · answer "what bit us?" · ship-affecting work gets a
cross-family review (`~/Developer/commonbrain/conventions/done.md`).
**Promotion rules** (what's allowed to become memory):
`~/Developer/commonbrain/conventions/promotion.md`.
