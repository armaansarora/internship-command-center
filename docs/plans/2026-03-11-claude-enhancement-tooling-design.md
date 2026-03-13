# Claude Enhancement Tooling — Design Document

## 7-Layer Efficiency-First Architecture

### March 11, 2026

---

## Executive Summary

A comprehensive tooling strategy organized into 7 layers by activation cost — from zero-overhead always-on optimizations to on-demand creative tools. Every layer is designed to maximize Claude Code's efficiency, context utilization, and output quality across the Internship Command Center (ICC) project and all future projects.

Design principles:

- Everything maxed out (speed, cost, context — no compromises)
- Global + Project organization (global `~/.claude/` for cross-project, project-specific for ICC)
- New tools of any type integrate perfectly, optimized, maximized, and seamlessly
- Organization maximizes tool efficiency

---

## Layer 0: Zero-Cost Always-Active

These run invisibly with zero context overhead.

### RTK (Rust Token Killer)

- **What:** Compresses CLI tool OUTPUT (git log, file listings, etc.) 60-90% before they enter context
- **Install:** `cargo install --git https://github.com/rtk-ai/rtk`
- **Config:** `~/Library/Application Support/rtk/config.toml`
- **Integration:** `rtk init --global` creates `~/.claude/hooks/rtk-rewrite.sh`, `~/.claude/RTK.md`, patches settings.json
- **Hook ordering:** RTK's PreToolUse Bash hook must be FIRST in array, before any blocking hooks
- **Also creates:** Its own auto-loaded context file (`@RTK.md`, ~30 lines)

### MCP Tool Search

- **What:** Built-in Claude Code feature. Lazy-loads tool definitions on demand. Already active (auto-activates when tool descriptions >10K tokens)
- **Effect:** 85% context reduction for tool definitions
- **Action:** NONE — already working. Removed from implementation items.

### Remove Duplicate Context7

- Keep `context7@claude-plugins-official` (plugin, auto-updates)
- Remove the standalone MCP instance (`mcp__fb9353a7...`)
- Saves ~500 tool-description tokens

### Remove Control Chrome

- Eliminate redundant browser MCP
- Claude in Chrome is a **strict superset** of Control Chrome — all Control Chrome capabilities exist in Claude in Chrome with additional features
- Saves ~2000 tool-description tokens

### Desktop Commander Scoping

- Restrict filesystem access to project directories via `set_config_value` tool (not JSON editing)
- Required paths:
  - `/Users/armaanarora/Claude Code/internship-command-center`
  - `/Users/armaanarora/.claude`
  - `/Users/armaanarora/.claude/get-shit-done`
  - `/tmp`
  - Future: Obsidian vault path (add when installed)

### Telemetry

- Sentry SDK already handles error capture
- OTel addition specifically for AI operation tracing (agent steps, tool calls, token usage)
- Multi-exporter: Sentry gets errors, Langfuse gets AI traces

### Shell Aliases

```bash
alias icc="cd ~/Claude\ Code/internship-command-center"
alias icc-dev="icc && npm run dev"
alias icc-db="icc && npm run db:studio"
```

**Net effect:** Before: ~20K+ tokens of tool definitions, no compression. After: ~3K tool tokens (lazy loaded), 60-90% cheaper tool outputs.

---

## Layer 1: Auto-Loaded Context

Lightweight files always present in conversation context.

### ~/.claude/CLAUDE.md (Global — ~50 lines max)

Contents:

- Who you are (role, preferences)
- Tool overlap rules (when to use builtins vs Desktop Commander)
- MCP profile documentation
- Memory system location

### ICC CLAUDE.md (Project — ~80 lines max)

Contents:

- Architecture summary (Next.js 16 + Turso + Drizzle + Vercel AI SDK v4.x)
- Agent system overview (corporate hierarchy)
- Design system tokens (Boardroom)
- Key commands, conventions, file structure
- Current phase and priorities

### ICC .claude/rules/ (Path-Scoped)

**Known bug (#16299):** paths frontmatter may load globally regardless. **Mitigation:** Keep rules files SHORT (20-30 lines each). Total rules context budget: ~150 lines max. YAML paths must be quoted: `"src/lib/agents/**"`.

| File | Loads When Working On | Content |
|------|----------------------|---------|
| `agents.md` | `"src/lib/agents/**"` | Agent creation patterns, Vercel AI SDK conventions, Zod tool schemas, Mastra workflow patterns |
| `database.md` | `"src/db/**"`, `drizzle.config.ts` | Turso/libSQL specifics, vector column syntax, migration patterns, Drizzle conventions |
| `design-system.md` | `"src/components/**"` | Boardroom tokens, color palette, typography, component patterns |
| `api-routes.md` | `"src/app/api/**"` | Route handler patterns, SSE streaming, auth middleware, error handling |
| `testing.md` | `"**/*.test.*"`, `"**/*.spec.*"` | Vitest patterns, test utilities, mocking strategy |
| `integrations.md` | `"src/lib/integrations/**"` | API client patterns, rate limiting, error handling for external services |

### Context Budget (Revised)

- Global CLAUDE.md: ~50 lines
- Project CLAUDE.md: ~80 lines
- 6 rules files: ~150 lines (due to bug, may all load)
- RTK.md: ~30 lines (RTK-generated)
- GSD context: variable (injected by hooks)
- **Total: ~310 lines + GSD overhead**
- Mitigation: ZERO overlap between CLAUDE.md and rules files. Rules = domain-specific patterns only. CLAUDE.md = project-wide info only.

---

## Layer 2: Event-Driven Automation

Hooks that trigger on tool usage events.

### Hook Consolidation Strategy

Instead of separate hooks per tool (adding latency), use ONE PreToolUse hook script and ONE PostToolUse hook script that check tool name internally. Must MERGE with existing GSD hooks (append, not replace).

### settings.json Hook Structure

```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/gsd-check-update.js" }] }
    ],
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "~/.claude/hooks/rtk-rewrite.sh" }] },
      { "matcher": "", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/pretool-guard.js" }] }
    ],
    "PostToolUse": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/gsd-context-monitor.js" }] },
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/posttool-format.js" }] },
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/posttool-audit.js" }] }
    ]
  }
}
```

**Array ordering:** RTK first for Bash matcher, then pretool-guard catch-all. GSD hooks preserved in their existing positions.

### Security Guards (pretool-guard.js)

Single consolidated script:

- **Write:** Block writes to `node_modules/`, `dist/`, `.next/`, `.env*`. Enforce "use client" in client components.
- **Edit:** Reject edits to generated directories (`dist/`, `.next/`)
- **Read:** Warn on files >500KB to prevent context waste
- **Bash:** Block destructive commands without confirmation (`rm -rf`, `git push --force`, `DROP TABLE`, `git reset --hard`)

### Quality Automation

- **posttool-format.js** (Write|Edit): Auto-format with ESLint/Prettier (only if file is in project root with config)
- **posttool-audit.js** (Bash): Log to `.planning/sessions/audit.log` (command, exit code, timestamp only)

### Session Lifecycle

- **Notification:** PreToolUse writes timestamp to `/tmp/claude-tool-start`, PostToolUse reads it and fires macOS notification if elapsed >60s: `osascript -e 'display notification "Task complete" with title "Claude Code"'`
- **Stop/Summary:** Writes session summary (files modified, git diff stat, test results) to `.planning/sessions/YYYY-MM-DD-HH-MM.md`. Implemented as BOTH a Stop hook (auto-fires if supported) AND a `/session-summary` command (manual fallback).
- **SessionStart:** Existing GSD hook continues as-is.

---

## Layer 3: User-Invoked Workflows

Commands and skills loaded on-demand when explicitly called.

### Custom Commands (5 commands after GSD overlap resolution)

| Command | Location | Input | Output |
|---------|----------|-------|--------|
| `/test` | Global (`~/.claude/commands/`) | Optional: specific test file | Runs `pnpm test`, parses failures, suggests fixes |
| `/deploy-check` | Global (`~/.claude/commands/`) | None | Sequential gate: lint → typecheck → build → test. Pass/fail table |
| `/db-migrate` | ICC (`internship-command-center/.claude/commands/`) | Migration description | Generates Drizzle migration SQL, validates schema, applies |
| `/component` | ICC | Component name | Scaffolds Boardroom component: file, styles, exports, test stub |
| `/agent` | ICC | Agent name + department | Scaffolds V2 agent with corporate hierarchy pattern, Zod tools, tests |
| `/healthcheck` | ICC | None | Smoke tests all integrations, outputs pass/fail table |

**Removed (overlapped with GSD):** `/plan` (→ /gsd:plan-phase), `/review` (→ code-review plugin + /gsd:verify-work), `/debug` (→ /gsd:debug)

**Additional commands:**

- `/tools` — Global. Displays tool registry as formatted table.
- `/session-summary` — Global. Manual fallback for Stop hook.

### /healthcheck Specification

| Check | Method | Timeout |
|-------|--------|---------|
| Turso DB | `SELECT COUNT(*) FROM applications` via libsql client (sources `.env.local`) | 5s |
| TypeScript | `pnpm tsc --noEmit` | 30s |
| ESLint | `pnpm lint` | 15s |
| Vercel | `list_deployments` via Vercel MCP — check latest is not failed | 5s |
| Sentry | `get_advisors` via Sentry MCP | 5s |

No full build (too slow). Full build is in `/deploy-check`.

### Custom Skills (.claude/skills/)

Each is a markdown file with frontmatter:

1. **agent-builder** — Trigger: creating files in `src/lib/agents/`. Template: Vercel AI SDK agent, Zod tool schemas, Mastra workflow registration, test file. Inputs: agent name, department, tool list.

2. **turso-migration** — Trigger: editing `src/db/schema.ts`. Template: Drizzle schema + SQL migration. Handles: vector columns (`F32_BLOB(1536)`), `libsql_vector_idx`, foreign keys.

3. **boardroom-component** — Trigger: creating files in `src/components/`. Template: React component with Boardroom design tokens, CSS variables, accessibility attributes.

4. **floor-builder** — Trigger: creating files in `src/app/`. Template: Next.js 16 page with layout, loading state, error boundary, data fetching.

---

## Layer 4: On-Demand MCP Servers

Profiles document which MCPs are needed per workload. MCP Tool Search handles performance automatically (85% context reduction). Profile switching requires session restart (fundamental Claude Code limitation).

### Profile: Coding (Default)

| MCP | Purpose |
|-----|---------|
| Supabase | Turso database operations |
| Vercel | Deployment management |
| Context7 | Library documentation |
| Claude Preview | Dev server + visual verification |
| Playwright | E2E testing |
| shadcn/ui | Component installation |
| Sentry | Error monitoring |

### Profile: Communication

| MCP | Purpose |
|-----|---------|
| Gmail | Email management |
| Google Calendar | Calendar operations |
| iMessage | Messaging |
| Apple Notes | Note-taking |

### Profile: Creative

| MCP | Purpose |
|-----|---------|
| Gamma | Presentation generation |
| Claude in Chrome | Browser automation + GIF recording |
| Spotify | Background music |

### Profile: Full

All MCPs for cross-cutting work spanning coding + communication + creative.

**Storage:** `~/.claude/profiles/{coding,communication,creative,full}.json` — documentation, not live toggles.

---

## Layer 5: Agent Development Stack

V2-specific tools for building and testing the ICC agent system.

| Tool | Type | Purpose |
|------|------|---------|
| **Langfuse** | Package (`@langfuse/otel`). Uses OpenTelemetry span processor. Integrates with ICC application server-side code, NOT Claude Code CLI. Free tier: 50K observations/month (~150-600/month for ICC). | Traces agent steps — token usage, latency, tool calls |
| **promptfoo** | CLI (global install) | Test agent prompts. YAML test suites, run against models, compare outputs |
| **Vercel AI SDK Telemetry** | Built-in | Experimental OTel for `generateText`, `streamText`, tool execution. Verify compatibility with v4.x. |
| **VoltAgent Subagents** | Skills (markdown prompt files, NOT npm packages). Source: `github.com/VoltAgent/awesome-claude-code-subagents`. Install: copy `.md` files into `.claude/skills/voltagent-{name}.md`. Cherry-pick: `fullstack-developer`, `security-auditor`, `db-specialist`. | Specialized prompt patterns |

**Note on Langfuse:** Package is `@langfuse/otel`, NOT `@langfuse/vercel-ai` (which doesn't exist).

---

## Layer 6: Creative & Showcase

| Tool | Type | Purpose |
|------|------|---------|
| **Remotion** | Package | Programmatic video with React. Demo videos, onboarding walkthroughs. Free for individuals. ~500MB dependencies — install only when needed. |
| **GIF Creator** | Built-in (Chrome MCP) | Quick demo recordings |
| **Canvas Design** | Built-in skill | Architecture diagrams, flow charts, portfolio graphics |
| **Theme Factory** | Built-in skill | Consistent Boardroom branding across artifacts |

### Demo Pipeline

Manual workflow guide documented in CLAUDE.md (NOT an automated command). Each step independent — failure at step 3 doesn't block step 4. Prerequisites listed per step:

1. Build → 2. Playwright verifies → 3. GIF captures → 4. Remotion polishes → 5. Canvas creates thumbnails → 6. Obsidian stores

---

## Layer 7: Operations & Maintenance

### Obsidian MCP

- Persistent knowledge vault (decisions, research, patterns, session logs)
- Runtime dependency (app must be running), falls back gracefully if unavailable
- Primary memory: `.claude/projects/*/memory/` (already exists). Obsidian is supplementary.
- Default vault path: `~/Documents/Obsidian/ICC-Vault` (add to Desktop Commander config AFTER vault creation)

### Tool Registry (`~/.claude/tool-registry.json`)

```json
{
  "version": "1.0",
  "tools": [{
    "name": "string",
    "type": "mcp|cli|skill|hook|plugin",
    "scope": "global|project",
    "status": "active|disabled",
    "version": "string",
    "config_path": "string",
    "installed_date": "ISO date",
    "notes": "string"
  }]
}
```

Consumers: `/healthcheck` command, `/tools` command.

### Version Management (`tool-versions.json`)

Pin versions, scheduled weekly update check.

### Backup Strategy

Track in dotfiles repo:

- `~/.claude/settings.json`
- `~/.claude/tool-registry.json`
- `~/.zshrc` (aliases)
- `~/Library/Application Support/rtk/config.toml`
- Profile JSONs from `~/.claude/profiles/`

Project `.claude/` tracked in ICC git repo with `.gitignore`:

```
# .claude/.gitignore
*
!.gitignore
!commands/**
!rules/**
!skills/**
!launch.json
!settings.json
```

### /healthcheck

Smoke test all integrations. Run after updates, weekly.

---

## Current State vs. Target

### EXISTS Today

- MCP Tool Search (auto-active)
- Context7 plugin
- GSD hooks (SessionStart, PostToolUse, statusLine)
- 33 GSD commands in `~/.claude/commands/gsd/`
- 13 GSD agents configured
- Desktop Commander
- Claude in Chrome, Control Chrome, Gamma, Gmail, Calendar, iMessage, Apple Notes, Spotify MCPs
- Supabase, Vercel plugins

### DOES NOT EXIST (Must Create)

- `~/.claude/CLAUDE.md` (global)
- ICC `CLAUDE.md` (project)
- ICC `.claude/rules/` (6 files)
- ICC `.claude/commands/` (6 commands)
- ICC `.claude/skills/` (4 skills + 3 VoltAgent skills)
- `~/.claude/profiles/` (4 JSON files)
- `~/.claude/tool-registry.json`
- RTK (not installed, needs Rust/cargo)
- Obsidian (not installed)
- pretool-guard.js, posttool-format.js, posttool-audit.js hooks
- Shell aliases in .zshrc

---

## Implementation Priority

**Phase 0 (Immediate):** Layer 0 + Layer 1 — zero-cost wins + context files
**Phase 1 (Week 1):** Layer 2 + Layer 3 — hooks + commands/skills
**Phase 2 (Week 2):** Layer 4 + Layer 5 — MCP profiles + agent dev stack
**Phase 3 (Ongoing):** Layer 6 + Layer 7 — creative tools + operations

---

## Audit Trail

This design passed two comprehensive fine-comb reviews:

- **Pass 1:** 20 issues found and fixed (RTK description, MCP Tool Search removal, hook consolidation, command overlap resolution, Langfuse package name, VoltAgent correction, and 14 others)
- **Pass 2:** 14 additional issues found and fixed (MCP profile switching limitation, RTK existence verified, hook merge specification, Stop hook fallback, context budget revision, command location split, and 8 others)

Total: 34 corrections applied before this document was written.
