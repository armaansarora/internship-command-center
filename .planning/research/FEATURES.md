# Feature Research

**Domain:** Job application tracker / personal career CRM with AI cover letter engine
**Researched:** 2026-03-06
**Confidence:** HIGH (based on direct analysis of Huntr, Teal, Simplify, JobHero, Careerflow + community patterns)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that every job tracker user assumes exist. Missing these makes the product feel broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Application list with sortable/filterable table | Core of any tracker — users need to find applications fast across 100+ entries | LOW | Sort by date, status, company, tier. Filter by status, sector. |
| Status tracking with defined stages | Every job tracker has status stages. Without this it's just a list. | LOW | Stages: Applied, In Progress, Interview, Under Review, Rejected, Offer. Match Armaan's existing mental model. |
| Quick-add new application | Users are adding jobs constantly. A slow add workflow kills the tool. | LOW | Company name + role + tier as minimum. Smart defaults for date. |
| Per-application notes field | Users need to store recruiter names, interview feedback, referral context | LOW | Rich text preferred. Tied to application record. |
| Date applied tracking | Without this, users can't calculate follow-up timing or judge staleness | LOW | Auto-set on creation, overridable. |
| Status update (drag or click) | Changing status must be immediate and frictionless | LOW | Inline edit or click-to-change. Not a full form. |
| Contact storage per application | Users need to store recruiter names, hiring manager, referral contact | LOW | Name, role, email at minimum. |
| Visual differentiation of statuses | Users need to scan status at a glance across many rows | LOW | Color-coded status pills/badges. |
| Search / text filter | 100+ applications: users must be able to find by company name instantly | LOW | Real-time search on company name and role title. |
| Attention-first dashboard | Users open the app to see what needs action — not to navigate menus | MEDIUM | Surface urgent items: pending interviews, stale warm leads, overdue follow-ups. |
| Follow-up date tracking | Without a follow-up date, applications go cold and users forget to check back | LOW | Auto-suggested based on tier + status. Overridable. |

### Differentiators (Competitive Advantage)

Features that make this tool worth using over a spreadsheet or generic tracker. These align with Armaan's core value: "open the app and instantly know what needs attention."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI cover letter engine with real company research | Every other tool generates generic letters. This one researches the actual company via Tavily then writes in Armaan's verified voice — no fabrication, no buzzwords. | HIGH | Uses Tavily for live research + Claude API for generation. Grounded in resume data only. Five-paragraph structure. |
| Priority tier system (T1/T2/T3/T4) | Generic trackers treat all applications equally. Armaan needs to know that a JPM HireVue is more urgent than a T4 application. | LOW | T1: RE Finance, T2: Real Estate, T3: Finance, T4: Other. Influences follow-up timelines and dashboard ordering. |
| Stale lead detection | Applications go cold without awareness. Surface warm leads that haven't been touched in tier-appropriate timeframes. | MEDIUM | T1 warm lead = flag after 5 days. T3/T4 = flag after 10-14 days. Uses last_contacted and status to compute. |
| Rich company detail view | Competitors show basic job info. This pulls live research (Tavily) + cached intel on major firms to give full context before applying or interviewing. | MEDIUM | Cached data for JPM, Blackstone, Goldman, Brookfield etc. Live scrape for others. Shown on application detail page. |
| Follow-up suggestion engine | Auto-suggests whether and when to follow up based on tier, days since application, and current status. Removes decision fatigue. | MEDIUM | Rule-based logic: if T1 + Applied + 7 days → suggest follow-up. Display as actionable card on dashboard. |
| Pre-seeded database with existing applications | Starting from zero is demoralizing. Armaan has 71 real applications — seeding them means the tool is useful on day 1. | LOW | One-time seed script. Not a user-facing feature, but critical for adoption. |
| Voice-consistent cover letter output | Most AI cover letters sound like corporate buzzwords. This one matches Armaan's honest, grounded, specific tone (verifiable from Beam Living letter). | HIGH | Prompt engineering with style examples. No fabrication guarantee. Claude refuses to invent facts. |
| Overdue follow-up alerts on dashboard | Proactively surfaces the 3-5 things that need attention today. Not a passive list — an active push. | MEDIUM | Dashboard card showing: X overdue follow-ups, Y warm leads going cold, Z interviews pending. |
| Interview pending indicator | A HireVue or phone screen sitting incomplete is the highest-urgency item. Surface it immediately. | LOW | Special status badge + dashboard priority. |

### Anti-Features (Commonly Requested, Often Problematic)

Features to explicitly NOT build. These are scope traps that create complexity without proportional value for Armaan's use case.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Heavy analytics dashboard (pie charts, conversion rates, application velocity) | Seems useful for optimizing job search strategy | Armaan explicitly hates this. Analytics on a job search feel like dashboarding for its own sake — rarely actionable when you're actively applying. Creates UI clutter. | Surface only the two numbers that matter: applications this week, interview rate (plain text, not charts). |
| Gmail / email sync | Automatically track replies and recruiter emails | Fragile OAuth flow, Google API terms, scoped access complexity, high maintenance. V1 blocker if included. | Phase 2. Manual status updates are fast enough for a personal tool. |
| Auto-apply / bulk apply | Apply to jobs automatically | Produces low-quality applications, hurts Armaan's brand with target companies. Cover letters become meaningless if auto-sent. | Never build. Defeats the purpose of tailored outreach. |
| LinkedIn / Handshake scraping | Auto-import job listings | Scraping is brittle, violates ToS, and breaks constantly. | Manual quick-add is 10 seconds and more reliable. |
| User authentication / multi-user | Seems like good practice | Single-user personal tool. Auth adds complexity with zero benefit. | Single-user, no login. Local-first. |
| Real-time collaboration | Team feature for shared job search | No team. Adds complexity. | Not relevant. |
| Mobile app | Access tracker on phone | Desktop-first tool. Armaan is applying from laptop. Responsive web is sufficient. | Responsive layout only. |
| ATS keyword optimization scoring | Optimize resume for applicant tracking systems | Armaan is applying to real estate / finance firms — relationship-driven industries where ATS keyword gaming is less relevant than tailored letters and referrals. | Cover letter engine focuses on substance and voice, not keyword stuffing. |
| Salary tracking / compensation analysis | Market rate comparisons | Internship comp is largely standardized ($25-40/hr at target firms). Not useful at this stage. | One optional notes field is enough. |
| Job board integration (pull listings automatically) | Saves time finding jobs | Adds API dependencies, scope, and maintenance. Armaan already has 71 applications and sources jobs manually. | Manual add remains friction-light with quick-add form. |
| Application templates / saved responses | Pre-fill answers for common application questions | Each cover letter is generated fresh. Templates for form responses create generic quality. | AI cover letter engine generates fresh, tailored content each time. |

---

## Feature Dependencies

```
Application Record (core data model)
    └──requires──> Status Tracking
    └──requires──> Company / Role fields
    └──requires──> Date Applied
    └──requires──> Priority Tier assignment

Follow-Up Suggestion Engine
    └──requires──> Application Record
    └──requires──> Date Applied
    └──requires──> Status Tracking
    └──requires──> Priority Tier assignment

Stale Lead Detection
    └──requires──> Application Record
    └──requires──> Last Contacted Date
    └──requires──> Priority Tier assignment

Attention-First Dashboard
    └──requires──> Follow-Up Suggestion Engine
    └──requires──> Stale Lead Detection
    └──requires──> Status Tracking (interview pending, overdue)
    └──requires──> Priority Tier assignment

AI Cover Letter Engine
    └──requires──> Application Record (company name, role title, tier)
    └──requires──> Tavily API integration (company research)
    └──requires──> Claude API integration (generation)
    └──requires──> Resume data (stored/embedded in system)
    └──requires──> Style examples (Beam Living letter)

Company Detail View
    └──requires──> Application Record
    └──requires──> Tavily API integration OR cached company intel
    └──enhances──> AI Cover Letter Engine (research reuse)

Contact Storage
    └──requires──> Application Record
    └──enhances──> Follow-Up Suggestion Engine (contact-specific follow-ups)

Pre-seeded Database
    └──requires──> Application Record schema (must exist first)
    └──requires──> All core fields defined before seeding
```

### Dependency Notes

- **Dashboard requires follow-up logic before it can display actionable items.** Build status tracking + tier system + date fields first, then layer the follow-up engine, then build the dashboard.
- **AI cover letter engine requires Tavily API wired up** before it can produce researched letters. Can stub with cached data for early phases.
- **Company detail view and cover letter engine can share Tavily research results** — cache the response so the same API call populates both.
- **Pre-seeded database requires the full schema to exist** — do not seed until all fields are defined. Premature seeding causes migration pain.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what Armaan needs to use this as a daily driver on day 1.

- [ ] Application list with sort, filter, search — primary interface
- [ ] Status tracking with visual stages (Applied, In Progress, Interview, Under Review, Rejected, Offer)
- [ ] Priority tier system (T1/T2/T3/T4) — influences display order and urgency
- [ ] Quick-add form (company, role, tier, date — smart defaults)
- [ ] Attention-first dashboard — shows interviews pending, stale warm leads, overdue follow-ups
- [ ] Per-application detail view with notes field, contact storage, dates
- [ ] Follow-up date calculation (auto-suggested by tier + status, overridable)
- [ ] Pre-seeded database with Armaan's 71 existing applications
- [ ] AI cover letter engine — company name in, tailored letter out (Tavily + Claude)
- [ ] Company research view per application (Tavily live + cached major firms)

### Add After Validation (v1.x)

Features to add once core workflow is proving useful daily.

- [ ] Stale lead detection with configurable thresholds — trigger: Armaan says "I'm missing warm leads going cold"
- [ ] Follow-up email draft generation (quick AI-generated outreach for warm leads)
- [ ] Cover letter history / saved outputs per application — trigger: Armaan generates 10+ letters and wants to reference past ones
- [ ] Company intel cache refresh (re-run Tavily research on demand) — trigger: research feels stale

### Future Consideration (v2+)

Defer until v1 is a proven daily driver.

- [ ] Gmail integration for auto-tracking replies — requires OAuth, significant complexity
- [ ] Google Calendar sync for interview scheduling
- [ ] Export to PDF / CSV for advisor meetings or personal records
- [ ] Mobile-responsive polish (beyond basic responsive layout)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Application list + status tracking | HIGH | LOW | P1 |
| Priority tier system | HIGH | LOW | P1 |
| Attention-first dashboard | HIGH | MEDIUM | P1 |
| Quick-add form | HIGH | LOW | P1 |
| Pre-seeded database | HIGH | LOW | P1 |
| Follow-up date tracking + suggestion | HIGH | MEDIUM | P1 |
| Per-application notes + contacts | HIGH | LOW | P1 |
| AI cover letter engine | HIGH | HIGH | P1 |
| Company research view | MEDIUM | MEDIUM | P1 |
| Stale lead detection | HIGH | MEDIUM | P2 |
| Follow-up email drafting | MEDIUM | MEDIUM | P2 |
| Cover letter history per application | MEDIUM | LOW | P2 |
| Analytics dashboard | LOW | MEDIUM | P3 (anti-feature) |
| Gmail integration | MEDIUM | HIGH | P3 (v2) |

**Priority key:**
- P1: Must have for launch (daily-driver viability)
- P2: Should have, add when core is stable
- P3: Nice to have or explicit deferral

---

## Competitor Feature Analysis

| Feature | Huntr | Teal | Simplify | Our Approach |
|---------|-------|------|----------|--------------|
| Application status stages | Kanban board, drag-and-drop | Status-grouped list, click to change | Auto-tracked on apply, manual status update | Click-to-change status pill in list view. No full Kanban (overkill for personal tool). |
| Priority / tier system | None | Star rating (excitement level) | None | T1/T2/T3/T4 by sector. Tier drives dashboard urgency and follow-up timing. |
| AI cover letter | Generic AI, resume + JD based | Generic AI, resume + JD based | Premium feature, generic | Research-grounded via Tavily. Armaan's voice. Five-paragraph structure. No fabrication. |
| Company research | None | None | None | Tavily live scrape + cached major firm intel (JPM, Blackstone, Goldman, etc.) |
| Follow-up reminders | Manual todo per application | Manual notes field | Generate follow-up email prompt | Auto-suggested by tier + days since applied. Dashboard surfaces overdue items. |
| Stale lead detection | None | None | None | Custom: flags warm leads going cold based on tier-specific thresholds. |
| Chrome extension / autofill | Yes (core feature) | Yes (40+ job boards) | Yes (100+ job boards) | Not building. Manual quick-add is sufficient for personal tool. |
| Analytics / reporting | KPI dashboard, conversion charts | Basic progress view | Basic | Minimal: counts only. No charts. Armaan explicitly does not want this. |
| Contact management | Yes (recruiters, contacts) | Yes (contact tracker) | Basic (recruiters only) | Per-application contacts (name, role, email, notes). No global CRM complexity. |
| Attention-first dashboard | No — generic board view | No — list view default | No | Core differentiator: open the app, see what needs attention today. |
| Pre-seeded with existing data | N/A | N/A | N/A | Seed script for 71 existing applications. Tool is useful day 1. |
| Data integrity guarantee | No hallucination prevention | No hallucination prevention | No | Cover letter engine explicitly refuses to fabricate. Only resume + verified research used. |

---

## Sources

- [Huntr Job Tracker Product Page](https://huntr.co/product/job-tracker) — feature inventory
- [Teal Job Tracker](https://www.tealhq.com/tools/job-tracker) — feature inventory
- [Teal Knowledge Base: Leveraging Job Tracker Tools](https://help.tealhq.com/en/articles/9525013-leveraging-your-job-tracker-tools) — detailed feature breakdown
- [Simplify Job Application Tracker](https://simplify.jobs/job-application-tracker) — autofill, auto-tracking, contact management
- [JobHero Features (SoftwareSuggest)](https://www.softwaresuggest.com/jobhero) — document management, reminders, dashboard
- [Careerflow Features](https://www.careerflow.ai/features) — AI cover letter generation approach
- [AI Cover Letter Quality / Hallucination Research (LiftMyCV)](https://www.liftmycv.com/blog/using-ai-for-cover-letter/) — fabrication risks
- [AI Is Killing the Cover Letter (Wharton)](https://knowledge.wharton.upenn.edu/article/ai-is-killing-the-cover-letter/) — recruiter detection, AI quality signals
- [Best Job Application Tracker Tools 2025 (Sprout)](https://www.usesprout.com/blog/best-job-application-trackers) — market overview
- [Eztrackr: Top 12 Job Application Trackers 2025](https://www.eztrackr.app/blog/job-application-tracker) — cross-tool feature comparison

---

*Feature research for: Internship Command Center — job application tracker with AI cover letter engine*
*Researched: 2026-03-06*
