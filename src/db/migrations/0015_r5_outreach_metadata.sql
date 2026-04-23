-- =============================================================================
-- R5.6 — outreach_queue.metadata JSONB for the cover-letter approval gate.
--
-- Tracks the tone-group flow: which cover letter the user selected, which
-- tailored resume to attach, which tone group the row belongs to. Each field
-- is optional; non cover_letter_send rows (cold_email, follow_up, etc.) may
-- leave this as the default '{}'.
--
-- Shape (application-enforced):
--   {
--     toneGroupId?: uuid,
--     selectedCoverLetterId?: uuid,
--     resumeTailoredId?: uuid,
--     selectedTone?: "formal" | "conversational" | "bold"
--   }
-- =============================================================================

ALTER TABLE outreach_queue
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
