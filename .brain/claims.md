# 🚧 CLAIMS — who is working on what
<!-- EARNED-tier piece: activate on the first real multi-lane week. Until then this
     template just documents the format.
     Rules: APPEND-ONLY (O_APPEND is atomic; never read-modify-write this file).
     Claims ADVISE, never lock (Cursor's 20-agents→throughput-of-2 collapse).
     Expired TTL = lane free. Release by appending a release line. -->

## Format (one JSON line per event)
{"event":"claim","holder":"<agent-id>","lane":"<name>","globs":["src/elevator/**"],"branch":"<worktree-branch>","surfaces":["port:3000"],"granted":"<iso>","ttl_min":120,"reason":"<one line>"}
{"event":"release","holder":"<agent-id>","lane":"<name>","released":"<iso>","result":"merged|abandoned|handoff"}

## Live claims
<!-- append below this line -->
