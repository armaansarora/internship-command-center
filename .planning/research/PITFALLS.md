# Pitfalls Research

**Domain:** Personal internship command center / job application tracker with AI cover letter engine
**Researched:** 2026-03-06
**Confidence:** HIGH (informed by prior failed attempt on this exact project plus verified patterns)

---

## Critical Pitfalls

### Pitfall 1: The Cluttered Dashboard — Showing Everything Instead of What Matters

**What goes wrong:**
The dashboard tries to be a "complete overview" of 100+ applications, showing all statuses, all tiers, all stages, all dates simultaneously. The result is a wall of data with no visual hierarchy. The user opens the app and has to work to figure out what needs attention — which defeats the entire purpose.

This was the explicit failure mode of the previous attempt on this project.

**Why it happens:**
Developers build what they can measure, not what users need to act on. It's easy to surface all data. It's hard to determine the *right* data. The dashboard becomes a report card instead of a control panel. Developers also conflate "comprehensive" with "useful."

**How to avoid:**
Design the dashboard around a single question: "What do I need to do today?" Every element on the homepage must answer that question or be removed.

Concrete rules:
- Maximum 3-5 "attention items" surfaced at the top (pending interviews, warm leads going cold, overdue follow-ups)
- Everything else is in the tracker list view, not the dashboard
- No pie charts, no pipeline velocity metrics, no conversion rates (Armaan explicitly hated these)
- Status counts are secondary, not primary
- Use progressive disclosure — show the urgent summary, let the user drill down

**Warning signs:**
- The dashboard has more than 5 distinct information regions
- You find yourself adding a "filter" or "sort" to the dashboard view
- The page requires scrolling to see all the "important" information
- You're reaching for a chart library during dashboard implementation

**Phase to address:**
Foundation/Core phase — the dashboard layout must be locked to "attention-first" from day one. Do not add dashboard elements during feature phases without explicitly questioning if they answer "what do I need to do today?"

---

### Pitfall 2: Cover Letter Engine That Fabricates Facts

**What goes wrong:**
The AI generates a cover letter that mentions a metric, initiative, or experience that Armaan never had. Examples from the previous failed attempt: fabricated accomplishments, inflated numbers, claimed skills not on the resume. The letter sounds great but is factually wrong. If a recruiter cross-checks against LinkedIn or asks about it in an interview, the application is toast.

This is the single highest-stakes failure mode in this project. The previous attempt failed here.

**Why it happens:**
LLMs are trained to produce plausible, impressive-sounding output. When the prompt is underspecified, the model fills gaps with hallucinated details. Vague prompts like "write a cover letter for a finance role" give the model too much latitude. Without strict grounding in real resume data, the model invents.

**How to avoid:**
The system prompt must explicitly prohibit fabrication and establish a closed-world assumption: the AI can ONLY reference facts in the provided context documents.

Implementation rules:
1. Pass Armaan's exact resume data as structured context in every cover letter request — education, GPA, experience bullets, coursework, leadership roles. Hard-coded, not summarized.
2. Pass Tavily research results as the ONLY source of company facts
3. System prompt must include: "Use ONLY facts from the provided resume context and company research. If you cannot find a fact, omit it. Do not invent metrics, titles, certifications, or accomplishments."
4. Instruct the model to write about Armaan's 5 actual experiences: National Lecithin internship, AI modernization initiative, SREG mentorship, relevant coursework, and NYU Schack enrollment
5. After generation, implement a simple self-check prompt: ask Claude to list every factual claim in the letter and verify each against the provided context

RAG reduces hallucinations by 42-68% when implemented correctly (per research). The structured context + explicit grounding instruction is non-negotiable.

**Warning signs:**
- The cover letter mentions a statistic not in the resume or Tavily results
- The letter claims a skill or certification not in the provided context
- The first paragraph sounds like a marketing brochure
- The letter doesn't mention National Lecithin or SREG specifically
- You're testing with "write a cover letter for X" without passing the full resume context first

**Phase to address:**
AI/Cover Letter phase — specifically in the prompt design step before any UI is built around it. The grounding constraint is architectural, not cosmetic.

---

### Pitfall 3: Generic AI Output That Sounds Like Every Other Cover Letter

**What goes wrong:**
Even when the cover letter is factually accurate, it's full of corporate buzzwords: "results-oriented professional," "proven track record," "synergistic approach," "detail-oriented team player." Recruiters have read 200 of these this week. The letter fails not because it's wrong, but because it's indistinguishable from every other AI-generated letter.

**Why it happens:**
LLMs default to the most common patterns in their training data. Generic prompts produce generic output. Without explicit voice and tone constraints, the model writes "AI cover letter voice," not Armaan's actual voice.

**How to avoid:**
The prompt must include Armaan's actual writing samples as style anchors. The Beam Living cover letter is the canonical reference — honest, grounded, specific, five-paragraph structure connecting real experiences to the role.

Implementation rules:
1. Include the Beam Living cover letter (or key excerpts) in the system prompt as a style example with the instruction: "Write in this voice and structure"
2. Explicitly ban specific phrases in the system prompt: no "results-oriented," no "proven track record," no "passionate about," no "I am excited to apply"
3. Require the letter to name specific company research (what Armaan actually found about the firm, not generic "your company is a leader in...")
4. Require the letter to connect ONE specific Armaan experience to ONE specific company attribute per paragraph
5. Test against the "20-second test" — a recruiter should be able to identify this as coming from a specific person within 20 seconds of reading

**Warning signs:**
- The letter's first sentence begins with "I am excited to apply for the position of..."
- The letter contains "results-oriented" or "team player"
- Every letter for different companies reads almost identically
- The letter doesn't mention National Lecithin by name
- You could swap the company name in and out without changing anything else

**Phase to address:**
AI/Cover Letter phase — specifically in system prompt design. The style constraints must be hardcoded into the system prompt, not left to the user to configure.

---

### Pitfall 4: Dashboard Kanban Board Abstraction Mismatch

**What goes wrong:**
The job tracker gets implemented as a Kanban board (swimlanes: Applied → Interview → Offer → Rejected). This is the most common job tracker UI pattern and it's wrong for 100+ applications. Kanban works for 10-20 items you're actively moving. At 100+ applications, the board is unscrollable chaos, columns are uneven, and filtering becomes mandatory just to see anything useful.

**Why it happens:**
Kanban is the default mental model for "things moving through stages" in developer thinking. It's what every project management tool uses, so it's what developers reach for.

**How to avoid:**
Use a sortable/filterable table as the primary tracker interface. Tables scale to 100+ rows. They support multi-column sort (tier + status + date). They support text search. They're scannable. A Kanban board does none of these things at this scale.

The Kanban-like mental model should only appear in a single status badge or colored indicator on each table row, not as the layout itself.

**Warning signs:**
- You're building column-based layout for applications
- You're thinking about how to handle columns that have 40+ cards
- You're adding horizontal scroll to the main tracker view
- You're building a "collapse column" feature

**Phase to address:**
Core Tracker phase — the table layout must be the initial design decision. Do not prototype a Kanban and then "fix it later."

---

### Pitfall 5: Tavily API Rate Limit Burning During Cover Letter Generation

**What goes wrong:**
The cover letter engine calls Tavily for every company every time a letter is generated. Armaan has 100+ companies. The free tier is 1,000 searches/month. Multiple cover letter iterations for the same company exhaust the monthly quota in days. The engine breaks mid-job-hunt when Armaan needs it most.

**Why it happens:**
Research is called on-demand without caching. Developers think of API calls as cheap during development. The real usage pattern (regenerating a letter 3 times while tweaking the prompt) burns quota fast.

**How to avoid:**
Cache Tavily results aggressively in SQLite. The cache schema should store:
- `company_name` (unique)
- `research_json` (full Tavily response)
- `researched_at` (timestamp)
- `ttl` (time-to-live, suggest 7 days for company intel)

Cover letter generation must check cache first. Only call Tavily if no cached result exists or the cache is older than TTL. The pre-existing intel on JPM, Blackstone, Goldman, Brookfield should be seeded as pre-populated cache entries.

Additionally, make the company detail view (which also shows research) a separate user-initiated action, not automatic on every row hover.

**Warning signs:**
- Tavily is called inside the cover letter generation function without a cache check
- Company research is fetched on every page view of an application detail
- You're calling Tavily during seed/import scripts
- No SQLite table exists for cached research

**Phase to address:**
AI/Cover Letter phase — the cache layer must be built before the cover letter engine, not after it. Treat cached research as the primary source, live Tavily as the fallback.

---

### Pitfall 6: SQLite File Corruption from Concurrent Writes Without WAL Mode

**What goes wrong:**
Multiple concurrent write operations (status update + cover letter save + follow-up logging happening simultaneously) cause `SQLITE_BUSY` errors or, in worst case, partial writes that corrupt the database file. The entire application state is stored in one local file — corruption means losing all 100+ application records.

**Why it happens:**
SQLite defaults to journal mode which uses exclusive locks. WAL (Write-Ahead Logging) mode is not enabled by default. Developers don't think about concurrency for a personal tool, but a web server handling multiple requests can absolutely hit this even with one user.

**How to avoid:**
Enable WAL mode immediately on database initialization:
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
```

Additionally:
- Use `better-sqlite3` (synchronous API) rather than async sqlite3 for Node.js backends — it avoids event loop complexity and handles concurrency better
- All writes should go through a single db connection instance (no connection pooling for SQLite)
- Implement a regular backup: copy the `.db` file to a timestamped backup on startup

Checkpoint starvation: if the WAL file grows unboundedly (rare for this use case but worth knowing), call `db.checkpoint()` periodically.

**Warning signs:**
- WAL PRAGMA is not in the database initialization script
- Multiple database connections are being created
- The app uses an async SQLite library without connection queuing
- No `.db` backup strategy exists

**Phase to address:**
Foundation/Database phase — WAL mode and the single-connection pattern must be in the initial schema setup. Cannot be added later without risk.

---

### Pitfall 7: Feature Scope Explosion During "Just One More Thing" Phase

**What goes wrong:**
The core tracker works. The cover letter engine works. Then: "What if I add email draft export?" Then: "What if I add a notes markdown editor?" Then: "What if I connect to Handshake to auto-import?" Each addition is individually reasonable. Collectively, they stall the project and the app never reaches daily-driver status before the job hunt ends.

The previous attempt failed partially because of feature creep — it built broken features instead of shipping working ones.

**Why it happens:**
Personal tools have no external forcing function. No deadline, no customer, no product manager. The developer is also the user, which means every new idea feels personally important. The tool becomes about building the tool rather than about the job hunt.

**How to avoid:**
The out-of-scope list in PROJECT.md is a hard contract, not a suggestion:
- No Gmail API / email sync (Phase 2, not v1)
- No Google Calendar integration (Phase 2)
- No Handshake/LinkedIn scraping (explicitly ruled out)
- No mobile app
- No heavy analytics (pie charts, conversion rates, pipeline velocity)
- No user authentication

During development, any new feature idea gets written to a `FUTURE.md` file and deferred. The only question during active development is: "Does this make the tool more useful for Armaan's job hunt this week?"

**Warning signs:**
- You're building something that's not in PROJECT.md requirements
- You're adding a new API integration not already planned (Tavily, Claude)
- A phase is taking 3x longer than estimated
- The "working features" count is not increasing but the codebase is growing

**Phase to address:**
Every phase — but especially the AI phase where the temptation to add "smart" features is highest. Maintain a strict "not this sprint" list.

---

### Pitfall 8: Polish Before Function — Beautiful UI Over Working Core

**What goes wrong:**
The developer spends Phase 1 building a perfect dark mode color system, custom animation transitions, a bespoke component library, and pixel-perfect shadows. The tracker looks stunning in screenshots but the cover letter engine is still broken. The job hunt ends before the tool is useful.

**Why it happens:**
UI work has immediate visual feedback and feels productive. It's also less mentally demanding than debugging AI prompt behavior or SQLite schema design. Developers default to the satisfying work over the hard work.

**How to avoid:**
Establish a "function before form" rule with concrete checkpoints:
1. The tracker must display and update all 71 seed applications before any animation is added
2. The cover letter engine must produce a correct, non-hallucinated letter before any generation UI is refined
3. The follow-up system must calculate correct dates before any date-picker polish is done

Use a minimal styling approach early (shadcn defaults, standard Tailwind utilities) and restrict design polish to a dedicated phase after core function is verified. "Linear/Notion aesthetic" is a goal for the final phase, not the first commit.

**Warning signs:**
- You've spent more than 2 hours on any single UI component during the core phase
- You're building custom animations before the data layer works
- The app looks great in a screenshot but can't yet add an application
- You're reaching for Framer Motion or custom CSS transitions before CRUD is done

**Phase to address:**
Foundation/Core phase — enforce "ugly but working" as the acceptance criterion for early phases. Designate a specific "polish pass" phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode Armaan's resume data in the system prompt as a string | Fast to implement | Fragile if resume changes; no single source of truth | MVP only — must be moved to a config/data file before job hunt is active |
| No Tavily caching, always fresh requests | Simpler code | Exhausts free tier in days | Never — cache from day one |
| Skip WAL mode, use default SQLite journal mode | One fewer PRAGMA | Risk of SQLITE_BUSY errors and corruption | Never — WAL costs nothing |
| Render all 100+ applications in a single DOM list | Simpler render logic | Slow page load, scroll lag | Acceptable until 200+ rows; add pagination then |
| No cover letter version history | Simpler schema | Can't compare iterations, can't recover from bad generation | Acceptable for MVP — add in a later phase |
| Use any shadcn/Tailwind colors directly | Fast UI iteration | Inconsistent visual language | MVP only — consolidate to a palette before polish phase |
| Skip follow-up date logic, just show the date field | Avoid complex date math | User must manually think about follow-up timing | Never — the follow-up timeline IS the value, not a nice-to-have |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Tavily API | Calling per-request without caching; expecting full scraping of arbitrary URLs | Cache in SQLite with TTL; use Tavily for search/discovery, not as a scraper for specific known URLs |
| Tavily API | Using search results verbatim without validation; dead links in index | Validate Tavily URLs before passing to Claude; check HTTP status before extracting content |
| Claude API | Passing vague prompts without resume context attached | Always pass full structured resume data + company research as system context, not as user message |
| Claude API | One giant prompt trying to do research + writing in one call | Separate concerns: Tavily does research, Claude gets research results as grounded context for writing |
| SQLite (better-sqlite3) | Using async patterns or multiple connection instances | Single synchronous connection; WAL mode; one connection singleton across the app |
| SQLite (better-sqlite3) | Rebuilding native modules after Node.js version changes | Pin Node.js version in `.nvmrc`; document rebuild step in README |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unindexed queries on applications table | Slow filter/sort on the tracker list | Add indexes on `status`, `tier`, `created_at`, `company_name` at schema creation time | At ~500 rows; fine for 100 |
| Tavily calls on application detail page load | Page feels slow when opening any application | Load research lazily on user click, not on route render | Immediately — any network call on render hurts UX |
| Claude API call blocking the UI thread | Cover letter generation freezes the page | Show a loading state immediately; stream the response or poll for completion | Every generation without loading state |
| Full re-render of 100+ row table on every status change | Janky status update interactions | Update only the changed row in state, not the entire list | At 50+ rows with frequent updates |
| No request deduplication on cover letter generation | User clicks "generate" twice, two API calls fire, one result overwrites the other | Disable the generate button while a request is in flight | Every double-click |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Claude API key and Tavily API key in client-side code or `.env` committed to git | Key exposure; unauthorized API usage charges | Store in server-side `.env`; add `.env` to `.gitignore` immediately; use environment variables only on the API server layer |
| Exposing the full SQLite file via a static file server | All application data (contacts, salaries, personal notes) publicly readable | Never serve the `.db` file; it should only be accessible via the backend API layer |
| No input sanitization on company names before SQLite queries | SQL injection risk if company name contains quotes or special characters | Use parameterized queries exclusively (better-sqlite3 supports this natively) |
| Logging full Claude prompts (which contain resume data) to console | Resume data in log files | Sanitize logs in production; log only the letter length or generation status, not the full prompt |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Status dropdown requires 3 clicks to change | Updating 100 applications feels like data entry work | Inline status update with a single click (dropdown on the row itself, not in a detail modal) |
| Cover letter generation shows a blank page while generating | User doesn't know if the engine is working | Show skeleton loading with estimated time (Claude typically takes 5-15 seconds); consider streaming the output |
| No visual differentiation between tiers (T1/T2/T3/T4) | All applications look identical; can't quickly identify T1 priorities | Color-code tier in the left border or badge; T1 gets the most prominent treatment |
| Follow-up dates shown as raw timestamps (2026-03-15) | User must mentally calculate "how soon is that?" | Show relative time ("in 3 days", "overdue by 2 days") alongside the date |
| Quick-add application form requires too many fields | Reduces likelihood of logging new applications | Quick-add should require only company name + role + tier; all other fields have smart defaults |
| No confirmation before regenerating a cover letter | User accidentally overwrites a good letter | Confirm before overwriting; or auto-save previous versions |

---

## "Looks Done But Isn't" Checklist

- [ ] **Cover letter engine:** Verify the letter references Armaan's specific experiences (National Lecithin, SREG) and a specific company fact from Tavily research — not generic phrases. A letter that mentions "your firm's strong reputation" without specifics is NOT done.
- [ ] **Application tracker:** Verify sort works correctly with NULL values (applications with no follow-up date should sort predictably, not crash). Sorting is not done until NULLs are handled.
- [ ] **Dashboard attention view:** Verify the "warm leads going cold" logic actually fires — seed the database with a T1 application last contacted 14+ days ago and confirm it appears in the attention section. Logic is not done until this is verified with real data.
- [ ] **Follow-up system:** Verify the auto-suggested timeline respects tier (T1 gets 3-day follow-up, T3 gets 7-day, etc.) — not just a generic 5-day window for every application.
- [ ] **Tavily caching:** Verify that generating a cover letter for the same company twice in a row does NOT make two Tavily API calls. Check request logs.
- [ ] **SQLite WAL mode:** Verify WAL is active by running `PRAGMA journal_mode;` — it should return `wal`, not `delete`.
- [ ] **Seed data:** Verify all 71 applications are importable and display correctly, including applications with missing fields (some may lack notes, contact info, follow-up dates).
- [ ] **Status transitions:** Verify every status (Applied, In Progress, Interview, Under Review, Rejected, Offer) can be set and displays the correct visual state. Missing a status means some real applications can't be accurately tracked.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Dashboard overload | MEDIUM | Audit every element against "does this answer what I need to do today?"; remove ruthlessly; ship a stripped-down version |
| Cover letter hallucination discovered post-send | HIGH — application trust destroyed | Impossible to recover from a sent hallucinated letter; prevention is the only strategy |
| Tavily quota exhausted | LOW | Use cached results for existing companies; defer new company research; upgrade plan or wait for monthly reset |
| SQLite corruption | HIGH | Restore from backup (if backup strategy was implemented); or manually reconstruct from source data (71 apps exist in the original spec doc) |
| Feature creep stall | MEDIUM | Hard-cut the current phase; ship what works; defer all in-progress non-essential features to FUTURE.md |
| Generic cover letter output | LOW | Revise system prompt to add voice constraints + style examples; no code changes required, just prompt engineering |
| API key exposure | HIGH | Rotate keys immediately; audit git history for any committed secrets; verify no unauthorized usage charges |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cluttered dashboard / attention overload | Phase 1: Foundation & Dashboard | Open the app and count: can you identify the 3 most urgent actions in under 10 seconds? |
| Cover letter fabrication | Phase 2: AI Cover Letter Engine | Generate letters for 3 different companies; manually verify every factual claim against the resume context |
| Generic AI output | Phase 2: AI Cover Letter Engine | Have Armaan read a generated letter and confirm it "sounds like him" before phase is complete |
| Kanban abstraction mismatch | Phase 1: Core Tracker | Seed all 71 applications and confirm the list view is usable without horizontal scrolling or column collapse |
| Tavily quota burn | Phase 2: AI Cover Letter Engine | Verify cache table exists and is populated after first generation before writing any UI |
| SQLite concurrent write errors / WAL | Phase 1: Database Setup | Run `PRAGMA journal_mode;` in the first commit's database init; fail CI if it returns anything other than `wal` |
| Feature scope explosion | Every phase | Each phase begins with a review of PROJECT.md scope; any out-of-scope item is written to FUTURE.md |
| Polish before function | Phase 1 and 2 | Phases 1 and 2 are complete only when function is verified with real data — not when the UI looks good |
| Tavily dead links / stale data | Phase 2: AI Cover Letter Engine | Validate HTTP status of Tavily URLs before passing to Claude; log validation failures |
| Missing follow-up timeline logic | Phase 3: Follow-up System | Test with T1, T2, T3, T4 applications and verify each tier produces the correct suggested follow-up window |

---

## Sources

- [Is It Bad to Use AI for Your Cover Letter? 2026 Lab Results](https://www.liftmycv.com/blog/using-ai-for-cover-letter/) — detection rates, recruiter patterns
- [The hidden pitfalls of using AI to write your Cover Letter](https://www.wearetweak.com/knowledge-hub/why-ai-generated-cover-letters-could-be-hurting-your-job-search) — fabrication and generic output failure modes
- [Effective Dashboard Design Principles for 2025](https://www.uxpin.com/studio/blog/dashboard-design-principles/) — progressive disclosure, information hierarchy
- [The Post-Dashboard Era: Why Visualization is the Enemy of Execution](https://www.jtbd.one/p/the-post-dashboard-era-why-visualization) — dashboards as reports vs. control panels
- [SQLite Technical Gotchas (Official)](https://sqlite.org/wasm/doc/trunk/gotchas.md) — WAL mode, concurrent access limitations
- [Offline-first frontend apps in 2025: IndexedDB and SQLite](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) — SQLite in modern web apps
- [Write-Ahead Logging (Official SQLite Docs)](https://sqlite.org/wal.html) — WAL mode, checkpoint starvation
- [better-sqlite3 Performance Docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md) — synchronous API, concurrency approach
- [How to Prevent LLM Hallucinations: 5 Proven Strategies](https://www.voiceflow.com/blog/prevent-llm-hallucinations) — RAG, closed-world prompting
- [7 Prompt Engineering Tricks to Mitigate Hallucinations](https://machinelearningmastery.com/7-prompt-engineering-tricks-to-mitigate-hallucinations-in-llms/) — grounding strategies
- [Rethinking Tool Calling: Introducing Tavily Auto-Parameters](https://www.tavily.com/blog/rethinking-tool-calling-introducing-tavily-auto-parameters) — Tavily parameter pitfalls, 30-70% tool call failure rates
- [How to Beat AI Feature Creep](https://builtin.com/articles/beat-ai-feature-creep) — scope management for AI-powered tools
- [Prompting best practices — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — role/goal/constraints/output structure
- [Alert Fatigue — SuprSend](https://www.suprsend.com/post/alert-fatigue) — notification volume thresholds and user disengagement
- Project context: `.planning/PROJECT.md` — previous attempt failure modes (cluttered UI, fabricated cover letters, broken features)

---
*Pitfalls research for: Personal internship command center / job application tracker with AI cover letter engine*
*Researched: 2026-03-06*
