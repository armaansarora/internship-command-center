-- R3.1: Add agent_dispatches table — the dispatch tree per bell-ring.
-- Tracks parallel CEO→subagent fan-out: status transitions, tokens, timing.
-- depends_on uuid[] is populated (defaults to '{}') so future 2-level dispatch
-- can schedule dependent subagents without another migration.

CREATE TABLE IF NOT EXISTS "agent_dispatches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
  "request_id" text NOT NULL,
  "parent_dispatch_id" uuid,
  "agent" text NOT NULL,
  "depends_on" uuid[] NOT NULL DEFAULT '{}'::uuid[],
  "task" text NOT NULL,
  "status" text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  "summary" text,
  "tokens_used" integer DEFAULT 0,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "agent_dispatches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_dispatches_user_isolation" ON "agent_dispatches"
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS "idx_dispatches_user_request"
  ON "agent_dispatches" ("user_id", "request_id");

CREATE INDEX IF NOT EXISTS "idx_dispatches_request_status"
  ON "agent_dispatches" ("request_id", "status");

-- R3.2: Cross-agent shared-knowledge bridge on user_profiles.
-- Two-level jsonb map: { [agentKey]: { [entryKey]: { value, writtenAt, writtenBy } } }.
-- Writes are agent-scoped (an agent can only write under its own key via the
-- REST helper); reads can be filtered to see only peers' entries, not self-echo.

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "shared_knowledge" jsonb NOT NULL DEFAULT '{}'::jsonb;
