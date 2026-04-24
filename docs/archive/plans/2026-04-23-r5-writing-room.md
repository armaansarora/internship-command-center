# R5 — Writing Room — Execution Plan

**Design doc:** `docs/plans/2026-04-23-r5-writing-room-design.md`
**Brief:** `docs/NEXT-ROADMAP.md` §9 R5
**Commit tag prefix:** `[R5/5.n]`

All tasks follow TDD: write failing test → implement → verify. All commits are atomic per task.

---

## Wave 1 — Foundations (parallel)

### R5.1 — `base_resumes` table + `resumes` storage bucket

**Goal.** Schema + bucket exist so R5.2 can upload to private storage.

**Failing test first.** `src/db/__tests__/base-resumes-schema.test.ts`:
- Assert `base_resumes` drizzle table definition exists with the seven fields from the design.
- Assert `user_id` has cascade on delete, `is_active` defaults true.

**Implementation.**
1. `src/db/migrations/0014_r5_writing_room.sql` — bucket INSERT + policy + table + RLS + index, following the 0009 template exactly. Header comments explain operator-run provenance (drizzle-kit push applies the table; the bucket is manually `psql`-applied just like 0009).
2. Add `baseResumes` table to `src/db/schema.ts`.
3. Add `src/lib/db/queries/base-resumes-rest.ts` — REST-only CRUD:
   - `listBaseResumes(userId)`
   - `getActiveBaseResume(userId)`
   - `insertBaseResume({ userId, storagePath, filename, fileSizeBytes, parsedText, pageCount })`
   - `setActiveBaseResume(userId, id)` — atomic flip, others to `is_active=false`
   - `deleteBaseResume(userId, id)` (hard delete plus storage removal — caller responsible for deleting the blob)

**Verification.** Tests green; schema compiles; `npx drizzle-kit generate` produces no new diff once migration is applied.

**Commit.** `[R5/5.1] feat(schema): base_resumes table + resumes bucket migration`

---

### R5.3 — Three-tone parallel cover-letter generation

**Goal.** New CMO tool returns three cover letters for one application with divergent tones, ready to persist as a tone group.

**Failing test first.** `src/lib/ai/structured/__tests__/three-tone-cover-letters.test.ts`:
- Mocks the LLM to return three distinct outputs keyed on tone system prompt (the system prompt must include the tone label verbatim for the mock to differentiate).
- Asserts `Promise.all` fires all three concurrently (measure elapsed < 2× single call).
- Asserts each letter's `tone_notes` contains its tone label.

**Proof test.** `src/lib/ai/structured/__tests__/three-tone-divergence.proof.test.ts` — runs against a deterministic fake LLM harness that produces tone-specific outputs by inspecting the system prompt (so the test runs in CI without external calls). Asserts the five divergence checks:
- Jaccard(word-set) < 0.70 for all three pairs.
- formal contractions count = 0; conversational contractions count ≥ 2.
- formal exclamations = 0.
- First 40 chars of `opening` all differ.
- Each `tone_notes` contains the tone label and a culture-anchor keyword.

**Implementation.**
1. Extract tone-specific system-prompt builders in `src/lib/ai/structured/cover-letter.ts`:
   - `buildToneSystem(tone): string` — three genuinely distinct system prompts, not a parameterized one.
2. Add `generateThreeToneCoverLetters(input): Promise<{ formal, conversational, bold }>` — `Promise.all` of three `generateStructuredCoverLetter` calls (or inline three generateText calls sharing the parse).
3. Add a new CMO tool `makeGenerateThreeToneCoverLettersTool(userId)`:
   - First: create a "group parent" `documents` row (`is_active: false`, `content: 'tone-group'`).
   - Then: three inserts, each with `parent_id = groupId`, type `cover_letter`, title suffix `(Formal)` / `(Conversational)` / `(Bold)`.
   - Returns `{ toneGroupId, variants: [{ id, tone, version, content }, ...], applicationId }`.
4. Register the new tool in `buildCMOTools`.

**Verification.** Unit test + proof test green.

**Commit.** `[R5/5.3] feat(cmo): three-tone parallel cover-letter generation with divergence proof`

---

### R5.7 — `@react-pdf/renderer` PDF export

**Goal.** Any `documents` row (cover_letter or resume_tailored) renders to a publication-quality PDF on GET.

**Failing test first.** `src/app/api/documents/[id]/pdf/__tests__/route.test.ts`:
- Seeds a cover_letter document.
- GETs `/api/documents/<id>/pdf`.
- Asserts `Content-Type: application/pdf`, `Content-Disposition: attachment; filename=*.pdf`, body length > 1KB, body starts with `%PDF-`.

**Implementation.**
1. `npm install @react-pdf/renderer` (production dep).
2. `public/fonts/pdf/` — ship `PlayfairDisplay-Regular.ttf`, `PlayfairDisplay-Bold.ttf`, `JetBrainsMono-Regular.ttf`. (Already-web-loaded; we copy the TTFs so pdf-renderer embeds them server-side.) If licensing complicates this, fall back to the built-in `Helvetica` family and note the downgrade in the commit.
3. `src/lib/pdf/cover-letter-pdf.tsx` — `<CoverLetterPDF doc={...}>` component using `<Document><Page>` primitives. Playfair for greeting/close, Satoshi/Helvetica for body, 72ch column.
4. `src/lib/pdf/resume-pdf.tsx` — similar for resume.
5. Route: `src/app/api/documents/[id]/pdf/route.ts` — auth + RLS ownership check + `renderToBuffer(<CoverLetterPDF/>)` + `new Response`.

**Verification.** Buffer is valid PDF, parse-back smoke test (optional: can ship without parse-back verify if unit test confirms `%PDF-` header).

**Commit.** `[R5/5.7] feat(pdf): @react-pdf/renderer export for cover letters + resumes`

---

### R5.8 — Resume Press mechanical object

**Goal.** When a resume tailoring is actively generating, a physical-press overlay animates in the Writing Room scene. Shown only during active tailoring.

**Failing test first.** `src/components/floor-5/resume-press/ResumePress.test.tsx`:
- Renders `<ResumePress active={false} />` — press is idle, no animation class.
- Renders `<ResumePress active={true} />` — press has `data-phase="stamping"` attribute.
- Renders with `prefers-reduced-motion` → asserts no GSAP timeline runs (we expose a `useGsap` hook mock).

**Implementation.**
1. `src/components/floor-5/resume-press/ResumePress.tsx` — SVG press composition, GSAP timeline scoped via `gsap.context`, tears down on unmount.
2. `WritingRoomScene.tsx` integration — hidden by default, wired to a "tailoring in progress" signal that the DocumentEditor or CMO hook raises (initial wire: a prop; later wire to a real signal).
3. CSS: pen/ink color tokens consistent with the room palette.

**Verification.** Test green; visible in `npm run dev` flow on Floor 5 when resume tailoring runs.

**Commit.** `[R5/5.8] feat(writing-room): Resume Press mechanical animation`

---

### R5.9 — Siken wall sharpening detail

**Goal.** A small gold-foil wall inscription on the Writing Room scene.

**Failing test first.** `src/components/floor-5/WritingRoomScene.test.tsx` (extend if exists):
- Renders the scene → asserts wall inscription text present, attribution present, `aria-hidden="true"` on the pure-decorative element plus an SR-only attribution so assistive tech gets it.

**Implementation.**
1. `src/components/floor-5/wall-inscription/SikenWall.tsx` — small SVG-on-text element with 200ms crossfade, attribution beneath in JetBrains Mono at ~9px.
2. Mount in `WritingRoomScene.tsx` at the desk's right edge.

**Verification.** Test green. Licensing note added to the component header (one line; attribution visible).

**Commit.** `[R5/5.9] feat(writing-room): Siken wall inscription sharpening detail`

---

## Wave 2 — Upload + stream + tailor (parallel, after their Wave 1 deps)

### R5.2 — Base resume upload API + PDF parse

**Depends on:** R5.1.

**Goal.** User uploads a PDF → parsed → stored privately → row in `base_resumes`.

**Failing test first.** `src/app/api/resumes/upload/__tests__/route.test.ts`:
- Valid PDF (fixture) → 200 with `{ id, filename, pageCount, parsedTextSample }` + row exists with `is_active=true`.
- Non-PDF (text file) → 400 `invalid_file_type`.
- Oversized (>10 MB) → 413 `file_too_large`.
- Missing `authorization` → 401.
- Bucket unprovisioned simulated (mock admin.storage to throw "Bucket not found") → 503 `bucket_unprovisioned` (this is the hard partner constraint — surface the blocker, never fall back to public).

**Implementation.**
1. `npm install pdfjs-dist` — ES-module-friendly, Node-compatible, no native deps. (Prefer over `pdf-parse` which has CJS import headaches in Next.js 16.)
2. `src/lib/resumes/parse.ts` — `parseResumePdf(buffer): Promise<{ text: string; pageCount: number }>`:
   - Cap at 50 pages; cap parsed text at 500KB → trim if over.
   - **ReDoS guard.** Strip ` `, normalize whitespace, reject any contiguous sequence > 10k chars without a whitespace break (indicative of malformed input). Reject if >50 consecutive backslashes (arms a regex-DoS vector).
3. `src/app/api/resumes/upload/route.ts`:
   - `POST` multipart/form-data.
   - Auth via `@/lib/supabase/server`.
   - Verify MIME = `application/pdf`, size ≤ 10MB.
   - Probe bucket: `admin.storage.from('resumes').list('', { limit: 1 })`. If thrown with "Bucket not found", return 503.
   - Upload with path `u/${userId}/base-${crypto.randomUUID()}.pdf`.
   - Parse → store parsed text + pageCount via `insertBaseResume`.
   - Mark prior rows inactive via `setActiveBaseResume`.
   - Return `{ id, filename, pageCount, parsedTextSample: text.slice(0, 240) }`.
4. `src/app/api/resumes/signed-url/[id]/route.ts` — returns a fresh 1-hour signed URL (so clients don't hold a URL past expiry).

**Verification.** Tests green; manual dev-server probe of upload (optional but recommended before the commit).

**Commit.** `[R5/5.2] feat(resumes): upload + parse + private-storage gate`

---

### R5.4 — Live-compose streaming

**Depends on:** R5.3.

**Goal.** After a tone is chosen (or during initial generation), the chosen draft renders as tokens arrive, with a pen-glow sweep on the newest span.

**Failing test first.** `src/hooks/__tests__/useCoverLetterCompose.test.tsx`:
- Mocks a streamed response with three chunks.
- Asserts the hook's `text` ref accumulates all three chunks.
- Asserts `lastChunkStart` / `lastChunkEnd` indexes advance so the UI can paint the newest span.

**Implementation.**
1. `src/app/api/cmo/compose-stream/route.ts` — accepts `{ applicationId, tone }`, loads company research + target profile context, calls `streamText` with the tone-specific system prompt, returns `toDataStreamResponse()`.
2. `src/hooks/useCoverLetterCompose.ts` — consumes stream via `useChat`-style shape (we're not using `useChat` itself; this is a narrower hook). Tracks current-chunk indices.
3. `src/components/floor-5/crud/DocumentEditor.tsx` extension: when a draft is in "composing" state, replace the static content block with a streaming renderer that colors the current span with `.pen-glow-ink`.
4. CSS `@keyframes pen-glow-ink { … }` — 800ms gold-to-matte fade, respects `prefers-reduced-motion` (no glow when reduced).

**Verification.** Hook test + visual dev-server verification.

**Commit.** `[R5/5.4] feat(writing-room): live-compose streaming + pen-glow`

---

### R5.5 — Resume tailoring reads from base_resumes

**Depends on:** R5.2.

**Goal.** The existing `generateTailoredResume` tool no longer requires a string `masterResume` arg — it fetches the active base resume's parsed text. If none exists, it returns a friendly "upload your resume first" result (not an error).

**Failing test first.** `src/lib/agents/cmo/__tests__/tailor-from-base.test.ts`:
- No active base resume → tool returns `{ success: false, reason: 'no_base_resume' }` with a user-facing message.
- Base resume present → tool fetches parsed_text and passes it to `generateStructuredTailoredResume`.
- `masterResume` override parameter still works for backward compatibility (CRO may still pass one).

**Implementation.**
1. Modify `makeGenerateTailoredResumeTool` in `src/lib/agents/cmo/tools.ts`:
   - `masterResume` becomes optional in the zod schema.
   - If omitted, call `getActiveBaseResume(userId)` and use `parsed_text`.
   - If no base resume exists, return early with `success: false` and `reason: 'no_base_resume'` + a message instructing the user to upload.

**Verification.** Unit test green.

**Commit.** `[R5/5.5] feat(cmo): resume tailoring reads active base_resumes by default`

---

## Wave 3 — Approval gate (serial, after R5.3 + R5.5)

### R5.6 — Approval-gate UI + outreach_queue wiring + cron extension

**Depends on:** R5.3, R5.5.

**Goal.** Three tones generated + resume tailored → `outreach_queue` row with `status='pending_approval'`. User picks a tone (metadata mutation, still pending). User clicks Approve → transition to `approved`. Send cron picks up and sends. No path from generation to send without two distinct clicks.

**Failing tests (proof-class):**

1. `src/app/api/writing-room/approve/__tests__/route.test.ts`:
   - Generate a tone group → queue row in `pending_approval`, `metadata.selectedCoverLetterId = null`.
   - POST approve with no selection → 400 `no_tone_chosen`.
   - POST `choose-tone` → metadata updated, still `pending_approval`.
   - POST approve after choose → `approved`, `approvedAt` set.
   - Send cron run (existing harness) on `pending_approval` → untouched; on `approved` → transitions to `sent`.

2. `src/components/floor-5/ready-to-send/ReadyToSendPanel.test.tsx`:
   - Renders three tone variant cards + PDF preview + "Choose this tone" on each + disabled Approve button by default.
   - After clicking "Choose this tone" on one → Approve is enabled; other two cards dimmed.
   - Clicking Approve fires the approve action.
   - `aria-disabled` is correct for the Approve button until a selection exists.

**Implementation.**

1. API routes:
   - `POST /api/writing-room/tone-group` — the CMO tool above calls this internally, or directly writes the outreach_queue row.
   - `POST /api/writing-room/choose-tone` — updates `outreach_queue.body` with the selected letter content and `metadata.selectedCoverLetterId`, still `pending_approval`.
   - `POST /api/writing-room/approve` — validates `metadata.selectedCoverLetterId` is set, sets `status='approved'`, `approvedAt=now()`.

2. `src/components/floor-5/ready-to-send/ReadyToSendPanel.tsx`:
   - Three tone-variant cards (grid or stacked on mobile).
   - Each card: tone badge, first-paragraph preview, "Choose this tone" button.
   - Below cards: resume PDF preview link (GET the PDF endpoint), shown only when a tone is chosen.
   - Approve button is the only path to send; disabled until a tone is chosen. Focus-ring + `aria-disabled`.
   - Optimistic UI for choose/approve; revert on error.

3. `WritingRoomClient.tsx` — mounts `ReadyToSendPanel` when there's a `pending_approval` outreach_queue row for the current application.

4. **Cron extension.** `src/app/api/cron/outreach-sender/route.ts` — extend the `type='cover_letter_send'` branch. Current cron handles four types; add the fifth branch that:
   - Reads the chosen cover letter content (already in `outreach_queue.body`).
   - Pulls hiring-contact email from the linked `application` (falls back to the user's outreach contacts).
   - Sends via existing email sender.
   - Transitions to `sent`, timestamp + `resendMessageId`.

**Verification.** All three tests green. Manual: on dev server, generate three tones → see panel → pick one → Approve → watch outreach_queue state shift.

**Commit.** `[R5/5.6] feat(writing-room): approval gate + cover_letter_send cron extension`

---

## Wave 4 — Proof (serial, final)

### R5.10 — End-to-end Proof

**Depends on:** everything.

**Goal.** One test that exercises the entire R5 flow against the local test harness.

**Test.** `src/app/__tests__/r5-writing-room.proof.test.ts`:

1. Seed user + application.
2. POST `/api/resumes/upload` with a fixture PDF → 200 → `base_resumes` row exists, `is_active=true`, parsed_text non-empty.
3. Invoke CMO's `generateThreeToneCoverLetters` tool → three `documents` rows share `parent_id`, three distinct contents, outreach_queue row exists in `pending_approval`.
4. Assert divergence on the three letters (re-run the five checks from §2.2).
5. Invoke `generateTailoredResume` tool (no masterResume arg) → pulls from base → `resume_tailored` document exists.
6. GET `/api/documents/<resumeId>/pdf` → application/pdf, `%PDF-` header, length > 1KB.
7. POST `/api/writing-room/approve` without selection → 400.
8. POST `/api/writing-room/choose-tone` → metadata updated.
9. POST `/api/writing-room/approve` → status=`approved`.
10. Run the send cron handler → status=`sent`, `sentAt` set. (Use the already-wired cron harness.)

If any step fails, the proof fails.

**Commit.** `[R5/5.10] test(r5): end-to-end Writing Room proof — upload → 3 tones → approval → PDF → send`

---

## Ledger state per task

Each task:

1. `npm run t start R5.N` — acquires phase lock.
2. TDD loop — fail → impl → green.
3. `npm run t done R5.N` — records HEAD sha.

Phase completion:

1. Four verification gates: `npm test` / `npx tsc --noEmit` / `npm run build` / `npm run lint`.
2. Flip R5 `acceptance.met=true` in `.ledger/R5-the-writing-room-floor-5.yml`.
3. `npm run t handoff --stdin` with session summary.
4. Push.

---

## Decision log (to ledger at end)

- Three tones (not two) because the Proof text mandates three variants demonstrably different. Overrides the roadmap's parenthetical "two tones in parallel".
- `@react-pdf/renderer` over Puppeteer because Fluid Compute footprint. The brief explicitly said footprint > novelty.
- `pdfjs-dist` over `pdf-parse` because ESM compatibility with Next.js 16.
- Outreach queue reused (not a new `application_submissions` table) because `cover_letter_send` is already in the enum and the state machine fits exactly.
- Tone divergence proved via Jaccard + contractions + exclamations + opening-fingerprint + tone-notes metadata — five measurable signals, not three retries of the same prompt.
- ATS optimizer deferred per roadmap's "I don't know yet"; not in the autopilot non-negotiables.
- LinkedIn sync deferred per B1 carryover; no R5 path depends on it.
