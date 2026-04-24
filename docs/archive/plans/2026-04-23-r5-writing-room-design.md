# R5 — The Writing Room (Floor 5) — Design

**Status:** design — self-approved under autopilot (scope:R5-only) within the Brief + Reference Library.
**Phase brief:** `docs/NEXT-ROADMAP.md` §9 R5 — The Writing Room (Floor 5).
**Partner constraints (autopilot header):**

1. **User approval gate must fire before any application is sent.** No single-click generate-and-send. Proof fails without the gate.
2. **Three tone variants must be demonstrably different on the same JD.** Assert output divergence in the proof test — NOT three runs of the same prompt at different temperatures.
3. **Base resume uploads go to PRIVATE Supabase Storage with signed URLs only.** If the bucket isn't provisioned, open a blocker. Never fall back to public URLs.
4. **R4's LinkedIn blocker (B1) is still open.** If an R5 task wants LinkedIn data, it waits. Not stubs.

---

## 1. Grounding — what already exists

R5 is not a greenfield floor. The Writing Room is scaffolded; R5 fills gaps and closes the resume tailoring absence.

| Piece | Location | State |
|---|---|---|
| Writing Room scene / client / ticker | `src/components/floor-5/*.tsx` | ✅ shipped |
| CMO character + dialogue panel + whiteboard | `src/components/floor-5/cmo-character/*` | ✅ shipped |
| DocumentList / DocumentEditor (tone badge, version selector, refine button) | `src/components/floor-5/crud/*` | ✅ shipped |
| `documents` table — `cover_letter \| resume_tailored \| prep_packet \| debrief` | `src/db/schema.ts:250-267` | ✅ shipped |
| CMO tools — `generateCoverLetter`, `generateTailoredResume`, `refineDraft`, `getExistingDrafts`, `getCompanyResearch`, `getApplicationContext` | `src/lib/agents/cmo/tools.ts` | ✅ shipped |
| Structured cover letter (LLM + Zod) — `CoverLetterSchema`, `generateStructuredCoverLetter` | `src/lib/ai/structured/cover-letter.ts` | ✅ shipped |
| Structured tailored resume | `src/lib/ai/structured/tailored-resume.ts` | ✅ shipped |
| `outreach_queue` — `cover_letter_send` enum, `pending_approval → approved → sent → rejected → expired` | `src/db/schema.ts:322-344` | ✅ shipped |
| Outreach sender cron (pulls `approved` → sends) | `src/app/api/cron/outreach-sender/route.ts` | ✅ handles cold_email/follow_up/thank_you/networking |
| Supabase admin client (service-role; signed URLs) | `src/lib/supabase/admin.ts` | ✅ shipped |
| `exports` bucket precedent (private, service-role-only, signed URLs) | `src/db/migrations/0009_exports_bucket.sql` | ✅ shipped — template for `resumes` bucket |

**R5 gaps to fill:**
- ❌ No base resume upload / parse / storage — `masterResume` is a string arg today, so the user has to paste.
- ❌ Three-tone parallel generation — CMO writes one tone at a time.
- ❌ Divergence proof — tone is currently a prompt knob with no test asserting three-way difference on same input.
- ❌ Live-compose UX — cover letters appear fully-formed; roadmap wants the pen-glow / streaming effect.
- ❌ User approval gate wired for cover-letter-send — the `cover_letter_send` enum value is never written today.
- ❌ Publication-quality PDF export — roadmap Proof.
- ❌ Resume Press mechanical object + Siken-on-the-wall sharpening detail.

---

## 2. Non-negotiables — the three hard guards

### 2.1 Private Supabase Storage (resumes bucket)

Pattern is copy-paste from `exports`: bucket `public=false`, service-role RLS policy, users read only via short-lived signed URL through `admin.storage.from('resumes').createSignedUrl(...)`.

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('resumes', 'resumes', false, 10485760)  -- 10 MB per PDF
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "resumes_service_role_all"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'resumes')
  WITH CHECK (bucket_id = 'resumes');
```

**Provisioning blocker rule.** The upload route probes the bucket via a `head`-style signed-URL call on a sentinel path. If the call returns "Bucket not found", it returns **503 + bucket_unprovisioned** and the UI surfaces "Storage not ready — operator must apply migration 0014." We **never** substitute a public URL. Autopilot opens a blocker and moves on if the operator hasn't applied the migration when we get to the Proof stage.

**Signed URL TTL.** 3600s (1 hour) — same as the exports precedent feels reasonable for "user clicks preview". The reference to the stored file never leaves the server; the URL is minted on demand per UI render.

### 2.2 Three-tone divergence (NOT temperature variance)

**The trap we're avoiding.** `generateText({ temperature: 0.9 })` called three times will produce three different strings but from the same prompt — they'll all feel like the same author's formal voice with different adjectives. That's not "demonstrably different tones." That's noise.

**How we actually produce three tones.** Three concurrent calls to `generateStructuredCoverLetter` with three **distinct tone-specific system prompts** (the CMO inhabits a different character per tone):

- **formal** — "Goldman/Blackstone culture: zero contractions, precise vocabulary, authoritative voice. No exclamations. Lead with institutional fit."
- **conversational** — "CBRE/JLL/Hines culture: warm professional, ≥2 contractions, first-person natural. Open with a human observation, not a thesis."
- **bold** — "Boutique/startup culture: direct and personality-forward. Declarative opening statement (not a question). ≥1 imperative-voice sentence. Specific contrarian claim permitted."

Promise.all fires all three at once (shared JD / role / companyResearch context), outputs are persisted as three `documents` rows sharing a `parentId` (new "tone_group" parent — see §3 schema additions), linked to one `applicationId`.

**The divergence proof test** asserts measurable differences on the same JD:

1. **Word-set Jaccard similarity** — pairwise Jaccard over lowercased word tokens < 0.70 for all three pairs. (Random noise at the same prompt typically yields 0.85–0.95; distinct tones drop it meaningfully.)
2. **Contraction count** — formal has 0 contractions (regex `\b\w+'[a-z]+\b` negatives); conversational has ≥ 2.
3. **Exclamation count** — formal has 0; bold may have ≥ 1 (not required, so: `formal.exclamations === 0`).
4. **Opening fingerprint** — the first 40 characters of `opening` differ across all three tones.
5. **Tone-notes metadata** — each `CoverLetter.tone_notes` contains the tone label and a concrete culture anchor.

All five checks must pass. If any fails, the test fails; we don't soften thresholds.

### 2.3 User approval gate

**Where the gate lives.** The existing `outreach_queue` state machine is exactly this gate. Flow:

1. CMO `generateThreeToneCoverLetters` tool runs → persists three `documents` rows (type `cover_letter`, tones `formal/conversational/bold`, shared `parent_id` pointing to a "tone group" parent doc we insert first) + one `documents` row (type `resume_tailored`) for the linked application.
2. The tool **also** inserts one `outreach_queue` row: `type='cover_letter_send'`, `status='pending_approval'`, `body` = placeholder, `subject` = email subject line, `metadata` → `{ toneGroupId, selectedCoverLetterId: null, resumeTailoredId, applicationId }`. Nothing gets sent yet.
3. UI surface: a "Ready-to-Send" panel on the Writing Room. Shows the three tone variants side-by-side, the tailored resume PDF preview, and **three** actions:
   - **Review PDF** — opens preview modal.
   - **Choose this tone** — sets `metadata.selectedCoverLetterId` and `body` = rendered cover letter. Still `pending_approval`.
   - **Approve & send** — the gate. Transitions `pending_approval → approved`. Separate, deliberate click after a tone has been chosen. Disabled until a tone is chosen. This is the **only** path that writes `approved`.
4. Cron `outreach-sender` picks up `approved` and sends. (Already wired for cold_email etc.; we extend to `cover_letter_send`.)

**Why this is genuinely a gate.** Three mouse events separated by UI state, not one wizard click. The separation between "pick a variant" and "approve to send" is surfaced both in code (state machine) and UX (two different buttons in two different visual positions). **The approval-gate proof test** asserts:

- Generating 3 tones creates `outreach_queue` row with `status='pending_approval'`.
- Attempting to mark `approved` without `metadata.selectedCoverLetterId` is rejected server-side (400).
- The send cron **refuses** `pending_approval` rows (only picks `approved`).
- UI-side: the Approve button is disabled (attribute present in rendered markup) until a tone is chosen in component state.

---

## 3. Schema additions

Migration 0014 (single transaction where possible):

```sql
-- 1. resumes bucket (copy-paste from 0009 pattern, different ID + smaller limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('resumes', 'resumes', false, 10485760)  -- 10 MB
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "resumes_service_role_all"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'resumes')
  WITH CHECK (bucket_id = 'resumes');

-- 2. base_resumes table
CREATE TABLE IF NOT EXISTS base_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,        -- e.g. 'u/<userId>/base-<uuid>.pdf'
  original_filename text NOT NULL,
  file_size_bytes integer NOT NULL,
  parsed_text text NOT NULL,         -- PDF → plain text, cached for tailoring
  page_count integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE base_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "base_resumes_isolation" ON base_resumes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_base_resumes_user_active ON base_resumes(user_id, is_active);
```

**Why `parsed_text` is in the row and not re-derived per tailor.** Signed-URL → re-download → re-parse on every tailor call would add ~200-500ms per generation for nothing. Storage gives us the source of truth (user can re-download the original PDF); `parsed_text` is a cache for the tailoring pipeline.

**Why one `is_active` flag vs a new column on user_profiles.** User may upload multiple resume drafts over time; they pick one as "the master". `is_active` flips between them. Soft-delete via `is_active=false`.

**Tone group parent row.** Rather than a new table, we reuse `documents.parent_id`. Insert one "group" document first (`type='cover_letter'`, `title='Three-tone group for {application}'`, `content='group'`, `is_active=false`), then the three tone variants reference it via `parent_id`. Grouping stays inside the existing documents table and RLS.

No other schema changes. Outreach queue already supports `cover_letter_send`.

---

## 4. PDF pick — `@react-pdf/renderer`

Three options considered:

| Option | Pro | Con | Verdict |
|---|---|---|---|
| `@react-pdf/renderer` | Pure JSX → PDF in Node, no Chrome/Puppeteer, streams to response, typography control, small footprint | Less polished than Chrome for tricky CSS | ✅ pick |
| Puppeteer / Playwright | Perfect fidelity with web fonts | Heavy (~250MB chromium), hostile on Vercel Fluid Compute cold-starts | reject |
| Motion + scroll-snap | No PDF at all | Proof requires **PDF export** | reject |
| Remotion | Overkill | Video renderer — wrong tool | reject (roadmap said "not novelty") |

Picked based on **deployment footprint** per the brief's explicit instruction, not novelty.

**Typography.** Playfair Display (serif headings) + JetBrains Mono (metadata) + Satoshi fallback to Helvetica for body. Embed two TTFs in `public/fonts/pdf/` so the renderer can ship them without web-font fetch. 72ch column width. 11pt body.

**Route.** `GET /api/documents/[id]/pdf` — auth, confirm ownership via RLS, render via `<Document>` JSX, `return new Response(pdfBuffer, { headers: { 'Content-Type': 'application/pdf' } })`.

---

## 5. Live-compose streaming

**Vercel AI SDK v6 `streamText`** (not `generateText`) — streams tokens as an `ai-sdk-data-stream` response. The DocumentEditor consumes via a new hook `useCoverLetterCompose`, appends each chunk to a ref, paints the just-appended span with a CSS gradient sweep class (`.pen-glow-ink`) that fades to matte in 800ms.

**Scope guard.** Streaming is polish; the three-tone parallel path is the core. If streaming adds risk to the phase timeline, it can run only against the chosen (after-approve) variant and the three parallel drafts can appear as completed-fade-in blocks. Document in the plan as R5.4 and flag as "defer if any upstream task slips".

**Reduced motion.** Respect `prefers-reduced-motion` — tokens appear with no glow, final layout identical.

---

## 6. Resume Press mechanical object + Siken wall (sharpening)

**Resume Press.** Pure SVG + CSS + GSAP timeline. Lever pulls down 20px in 150ms → 3px shake for 100ms → embossed version chip slides in from right → paper slides out the slot in 400ms. Sound is opt-in (we already have SoundProvider). Rendered as an overlay pinned to the desk in `WritingRoomScene`, shown only during active resume tailoring.

**Siken on the wall.** "A wound is also an opening." — a Richard Siken line (one line of poetry, attributed, with his name, in the HTML — standard fair-use framing). Rendered as a small gold-foil wall inscription to the side of the desk, 60% opacity, 200ms crossfade on scene mount. Writing-Room-only. If copyright risk is flagged, swap to a public-domain stand-in (Frost "Out, out — " or Keats).

Both are small SVG/CSS adds. No new deps. Full motion budget ≈50ms of GSAP timeline per event — well inside the site's existing animation envelope.

---

## 7. LinkedIn deferral (B1 carryover)

The roadmap lists "LinkedIn sync path" as a research demand. We **do not** touch it in R5. The blocker filed in R4 remains open. When the user supplies `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`, a future phase (or amendment to R4) can unblock.

No R5 task reads LinkedIn. If later we find the base-resume-parse produces a parsed_text user would prefer to hydrate from LinkedIn instead of uploading a PDF, that's a post-R5 improvement, not a blocker.

---

## 8. Task map (R5.1 through R5.10)

| ID | Title | Depends on | Parallel? |
|---|---|---|---|
| R5.1 | `base_resumes` table + `resumes` bucket migration 0014 + REST queries | — | (foundation, serial) |
| R5.2 | Base resume upload API + PDF parse + ReDoS guard | R5.1 | serial after R5.1 |
| R5.3 | Three-tone parallel cover-letter generation (CMO tool + structured helper) with divergence proof test | — | **parallel with R5.1** (different subsystem) |
| R5.4 | Live-compose streaming route + `useCoverLetterCompose` hook + pen-glow CSS | R5.3 | after R5.3 |
| R5.5 | Resume-tailoring reads from `base_resumes` (not string arg), still emits `resume_tailored` document | R5.2 | after R5.2 |
| R5.6 | Approval-gate UI + outreach_queue cover_letter_send wiring + send cron extension + proof test | R5.3, R5.5 | after 5.3 & 5.5 |
| R5.7 | `@react-pdf/renderer` — cover letter + resume PDF + export route | R5.5 (shape) | **parallel with R5.4/R5.6** (different subsystem) |
| R5.8 | Resume Press SVG + GSAP actuation + scene wiring | — | **parallel with anything** |
| R5.9 | Siken wall inscription + attribution (sharpening detail) | — | **parallel with anything** |
| R5.10 | End-to-end Proof test — upload → 3 tones (divergence asserted) → tailor → approval gate → PDF | all | serial (final) |

**Subagent-driven parallelism waves:**

- **Wave 1 (parallel):** R5.1, R5.3, R5.7 (PDF can shell out early even without content shape — we'll patch shape once 5.3/5.5 land), R5.8, R5.9.
- **Wave 2 (parallel):** R5.2 (after 5.1), R5.4 (after 5.3), R5.5 (after 5.2).
- **Wave 3 (serial):** R5.6 (after 5.3 + 5.5).
- **Wave 4 (serial):** R5.10 (proof).

---

## 9. Test doctrine for R5

Every task lands with TDD — failing test first, impl, then verification.

**Critical proof tests (can never be weakened):**

- `r5-tone-divergence.proof.test.ts` — three tones on same JD pass all five divergence checks (§2.2).
- `r5-approval-gate.proof.test.ts` — generate → pending_approval; approve without selection → 400; cron send refuses pending; approve → approved → cron picks up.
- `r5-private-storage.proof.test.ts` — upload → row has storage_path, bucket is private; signed URL works; direct public URL is not generated anywhere in code.
- `r5-proof.test.ts` — end-to-end flow including PDF export producing non-empty `application/pdf` body.

Unit tests for every helper (redos scan, PDF render, streaming chunk consumer, tone-specific system prompts).

---

## 10. What I'm explicitly deferring

- **ATS keyword optimizer.** Roadmap's "I don't know yet" note. Not in the autopilot non-negotiables. Park to backlog.
- **LinkedIn sync.** B1 blocker. Do not touch.
- **A/B tone generation as two-way (vs three-way).** Roadmap says "two tones in parallel"; the Proof and the autopilot prompt say **three**. Three wins — the Proof is the load-bearing constraint.
- **Remotion.** Not justified here.
- **Voice-activated refinement (R6 territory).** Not for this floor.

---

## 11. Risk map

| Risk | Mitigation |
|---|---|
| Bucket not provisioned when Proof runs | Tests should seed the bucket via service-role client in setup. If production bucket isn't provisioned, escalate via blocker per partner constraint §3. |
| Three-tone concurrent LLM calls blow up token budget | Budget: 3 × ~800 tokens ≈ 2400 tokens per Ready-to-Send action. Acceptable. Cached prompts already in place (`getCachedSystem`). |
| Streaming route breaks on Vercel Fluid Compute | Fluid Compute handles Node streams fine; use the standard `toDataStreamResponse()` helper from AI SDK v6. |
| `@react-pdf/renderer` + Next.js 16 App Router interplay | Route renders via `await renderToBuffer(<Document>)` in a standard API route. No bundling issues expected. |
| Divergence test flakes on LLM output variation | The checks (Jaccard < 0.7, contraction count deltas, first-40-char difference) should be robust across LLM variance; if a test flakes, the first signal is that the prompts aren't actually divergent — tighten the prompts, not the thresholds. |
| Resume Press animation fires on reduced-motion | `matchMedia('(prefers-reduced-motion: reduce)').matches` gate before GSAP timeline runs; fall back to opacity crossfade. |

---

## 12. Exit criteria for R5

Acceptance flips to `met: true` only when all four verification gates pass:

1. `npm test` — all vitest suites green (existing 622 + new R5 suites).
2. `npx tsc --noEmit` — zero errors.
3. `npm run build` — Next.js production build succeeds (R0 lesson: both `middleware.ts` and `proxy.ts` class of regression — catch only at build step).
4. `npm run lint` — baseline respected (no *new* errors; pre-existing may remain).

Plus the four Proof tests named in §9 all green.

Plus the user can (manually, via dev server):

- Upload a PDF base resume → it's stored privately, parsed.
- Generate three tone cover letters for an application → sees three tone variants side-by-side that read demonstrably differently (not "the same letter with different adjectives").
- Tailored resume renders as publication-quality PDF on export.
- Ready-to-Send panel blocks approval until a tone is chosen; blocks send until approved.
- None of the sent applications happen without two explicit clicks ("choose" + "approve").
