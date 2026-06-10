# ⚠️ Gotchas — campaign-level, hard-won

*Things that bit a real run. Tool-level, not target-specific (target gotchas live in the
target repo's CLAUDE.md / class kit). Cap: 400 lines — `check-caps.sh` is the one owner
of this number (entry-structured: ~100 entries × ~4 lines).*

## Workflow tool
- **Codex agents + JSON schema fail** — `agentType: 'codex'` has no StructuredOutput tool.
  Let Codex return prose; structure it with a Claude pass after.
- **Large outputs + schema can abort the run** — agents returning big HTML/SVG through a
  schema can fail StructuredOutput and kill the workflow. Wrap risky agents, cap output
  size, and resume from the runId instead of relaunching.
- `Date.now()` / `Math.random()` / argless `new Date()` throw inside workflow scripts
  (resume safety). Pass timestamps in via `args`.

## Codex (the Siege arm)
- For fail-closed read-only review, shell `codex exec` with `--ignore-user-config`
  (NOT `--strict-config` — it rejects the desktop-app config.toml). Auth stays via
  CODEX_HOME.
- Codex strips `*KEY*`/`*SECRET*`/`*TOKEN*` env vars from tool shells — secrets it needs
  must go in `~/.codex/config.toml [shell_environment_policy.set]`.

## Unattended runs
- **No DB migrations unattended** (no Management API token; direct DB is IPv6-only;
  Supabase MCP needs interactive OAuth). Ship numbered SQL + apply/rollback notes; the
  Commander applies via the SQL editor. Plan campaigns so this is a handoff, not a blocker.
- Interactively-authenticated MCP servers (claude.ai connectors) may be absent in
  headless/cron contexts — don't make a campaign's critical path depend on one.

## Media
- fal.ai result URLs expire (≥7 days) — download immediately. `scripts/fal-gen.mjs` is the
  turnkey path; MCP auth header is `Bearer`, SDK/REST is `Key`.
