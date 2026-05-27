# ArtLab daemon: process alive but heartbeat never written

## Symptom

After `npm run artlab:daemon -- start` (or `restart`), the daemon process is running (confirmed via `ps -p <pid>` and `lsof -p <pid> | grep cwd` showing the correct `.artlab/engine` working directory), but `<workspaceRoot>/daemon-heartbeat.json` is never updated. The file retains its previous contents from a prior daemon run (often a stale `pid` belonging to a dead process).

This makes `npm run artlab -- doctor` and `npm run artlab -- health` report the daemon as down even when launchd shows it as loaded.

## Reproduction (seen 2026-05-27)

```bash
cd /Users/armaanarora/Documents/The Tower
launchctl bootout gui/501/com.tower.artlab 2>/dev/null || true
npm run artlab:daemon -- start
sleep 10
cat .artlab/engine/daemon-heartbeat.json
# → pid + at timestamp are from BEFORE the restart
ps aux | grep "scripts/artlab.ts daemon run" | grep -v grep
# → shows live process, e.g. pid 28481
```

The launchd plist (`/Users/armaanarora/Library/LaunchAgents/com.tower.artlab.plist`) is well-formed:
- `WorkingDirectory` = `/Users/armaanarora/Documents/The Tower/.artlab/engine`
- `KeepAlive` = true, `RunAtLoad` = true
- `StandardOutPath` / `StandardErrorPath` write into `.artlab/engine/logs/`

The stdout log shows the daemon coming online (`● daemon online`) and then immediately logging `◌ daemon shutdown complete` — but ps still shows a live tsx process at the same pid moments later.

## Suspected root cause

The daemon loop in `src/lib/artlab/daemon/entry.ts` calls `writeHeartbeat()` at the top of `runDaemonOnce()` (line 145). If the daemon never enters the main loop — for example because startup blocks on a TLS handshake to Telegram, or an env-var lookup, or a lock acquisition — the heartbeat is never written. The fact that `recordDaemonError()` would write to `.artlab/engine/daemon-errors.jsonl` and we see no recent entries there suggests the loop isn't even reaching error-handling; it's stuck somewhere earlier.

Worth checking:
- Whether `bootstrapDaemonContext()` (or whatever sets up `ctx`) is blocking on a synchronous network call
- Whether the daemon's `process.on("SIGTERM"/SIGHUP")` handlers are misreading launchd signals as shutdown
- Whether the lock file (`.artlab/engine/.lock.daemon.json`) is being acquired but never released, causing a second invocation to immediately exit

## Workaround

Use the CLI directly — `npm run artlab -- produce/status/queue/health/doctor` all work without the daemon. The daemon is only needed for autonomous Telegram polling + queue processing.

## Out of scope

Surfaced during the 2026-05-27 ArtLab UX fix sweep but explicitly deferred — that sweep was bounded to 8 tasks and the daemon bug is a deeper investigation.
