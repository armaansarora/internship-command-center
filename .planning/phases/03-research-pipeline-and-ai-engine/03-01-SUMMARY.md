---
phase: 03-research-pipeline-and-ai-engine
plan: 01
status: complete
started: 2026-03-06
completed: 2026-03-06
commit: 656f11b, 37f4f0e
---

## One-Liner

Built Tavily research pipeline with SQLite caching, Claude cover letter engine calibrated to Armaan's real writing voice, and AI follow-up email drafts -- all verified with live APIs.

## What Was Built

**Research Pipeline (src/lib/research.ts)**
- Tavily API integration for company research (recent news, leadership, deal activity)
- SQLite caching via `companyResearch` table with 7-day TTL
- Pre-loaded fallback intelligence for JPMorgan, Goldman Sachs, Blackstone, Brookfield, KKR
- Graceful degradation when API key is unavailable

**Company Research Card (src/components/detail/company-research.tsx)**
- Live company research card rendered on application detail pages (`/applications/[id]`)
- Displays recent news, leadership info, and deals
- "Source: Tavily" or "Source: Cached" indicator
- Loading skeleton during data fetch

**Cover Letter Lab (src/app/cover-letters/page.tsx)**
- Full Cover Letter Lab page replacing the Phase 1 placeholder
- Company selection dropdown populated from applications database
- Progress indicator showing "Researching..." then "Writing..." stages
- Generated letter display with copy-to-clipboard button

**Cover Letter Engine (src/lib/cover-letter.ts)**
- Claude API integration using claude-sonnet-4-20250514 model, max_tokens 1200
- System prompt calibrated to Armaan's actual writing voice from his Beam Living cover letter
- 5-paragraph structure with factual grounding from Tavily research data
- Fallback template when Claude API is unavailable

**Cover Letter Server Actions (src/lib/cover-letter-actions.ts)**
- Server Actions wrapping the cover letter generation and research pipeline
- Orchestrates fetch-research -> generate-letter pipeline

**AI Follow-Up Email Drafts (src/components/follow-ups/draft-email.tsx)**
- Generate AI follow-up email from application detail page
- Shows application context (company, role, contact info)

**Follow-Up Email Server Actions (src/lib/follow-up-email-actions.ts)**
- Claude API for email generation with Armaan's voice rules
- Enriched with real resume data: shortName, degree, concentration, GPAs, coursework

**Real Resume and Voice Integration (src/lib/resume.ts)**
- Fully rewritten with real PDF resume data
- 4-semester NYU Stern transcript (all courses with grades)
- Writing style extracted from actual cover letter: keyPhrases, paragraphs, tone, avoids
- Used by both cover letter and email generation for voice calibration

**Tests (src/__tests__/resume.test.ts)**
- Expanded from 6 to 10 tests covering the new resume data structure

## Key Decisions

- **Combined 3 plans into 1**: Original roadmap estimated 3 separate plans for research, cover letters, and emails. Delivered as a single plan (two commits) since all AI features share the same Tavily + Claude infrastructure.
- **Voice calibration from real cover letter**: Analyzed Armaan's actual Beam Living cover letter to extract writing voice, structure, and key phrases rather than using generic prompts.
- **Pre-loaded fallback intel for top 5 targets**: JPMorgan, Goldman Sachs, Blackstone, Brookfield, and KKR have hardcoded research data so the app works without API keys.
- **Writing style as structured data**: Stored voice patterns in resume.ts as typed constants (keyPhrases, paragraphs, tone, avoids) rather than freeform text, enabling programmatic prompt construction.
- **max_tokens 1200**: Increased from default 1024 to ensure full 5-paragraph cover letters generate without truncation.
- **claude-sonnet-4-20250514 model**: Selected for quality/speed balance in generation tasks.
- **7-day cache TTL**: Company research cached for a week to balance freshness with API cost.

## Deviations from Plan

- **Original roadmap estimated 3 plans; delivered as 1 plan across two commits** since research, cover letters, and email drafts all share the same Tavily + Claude infrastructure. No benefit to splitting them.
- **Second commit (37f4f0e) added real resume/transcript/voice data** after user uploaded actual PDF resume and cover letter. This integration pass was not in the original plan but was essential for the system to produce authentic output.
- **Added writingStyle.keyPhrases to resume.ts** -- not in the original plan but required for accurate voice calibration in system prompts.
- **Resume test count increased from 6 to 10** to cover the expanded data structure (transcript semesters, writing style fields, key phrases array).
- **Added tavily npm dependency** (package.json updated) -- implicit in the plan but worth noting as a new external dependency.

## Test Results

21 tests passing (up from 17 after Phase 2):
- `src/__tests__/db.test.ts` -- database connection and WAL mode
- `src/__tests__/schema.test.ts` -- schema validation and table structure
- `src/__tests__/seed.test.ts` -- seed data insertion and counts
- `src/__tests__/resume.test.ts` -- 10 tests covering real resume data, transcript, writing style

Live API verification:
- Cover Letter Lab: Generated real Blackstone cover letter with live Tavily research data
- Company Research: Live Tavily data for JPMorgan Chase ($4.4T assets, Jamie Dimon details)
- Draft Follow-Up Email: AI-generated interview thank-you with real resume context

## Files Modified

- `internship-command-center/package.json` -- added tavily dependency
- `internship-command-center/src/app/cover-letters/page.tsx` -- Cover Letter Lab page (replaced placeholder)
- `internship-command-center/src/app/applications/[id]/page.tsx` -- added company research card to detail page
- `internship-command-center/src/components/cover-letters/cover-letter-generator.tsx` -- cover letter generation UI
- `internship-command-center/src/components/detail/company-research.tsx` -- live company research card
- `internship-command-center/src/components/follow-ups/draft-email.tsx` -- AI follow-up email draft component
- `internship-command-center/src/lib/research.ts` -- Tavily API integration with SQLite caching
- `internship-command-center/src/lib/cover-letter.ts` -- Claude cover letter generation with voice calibration
- `internship-command-center/src/lib/cover-letter-actions.ts` -- cover letter Server Actions
- `internship-command-center/src/lib/follow-up-email-actions.ts` -- follow-up email Server Actions
- `internship-command-center/src/lib/resume.ts` -- real resume, transcript, and writing voice data
- `internship-command-center/src/__tests__/resume.test.ts` -- expanded to 10 tests
- `internship-command-center/.env.local` -- live Claude and Tavily API keys (gitignored)
