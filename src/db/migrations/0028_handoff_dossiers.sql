-- Migration 0028 — PR 3 Handoff Dossiers + Council Table.
--
-- Additive-only. No column drops. Safe to re-run (IF NOT EXISTS everywhere,
-- policy wrapped in DO $$ BEGIN / IF NOT EXISTS in pg_policies, trigger
-- guarded by DROP TRIGGER IF EXISTS). Pairs with the `handoffDossiers`
-- Drizzle schema entry in src/db/schema.ts (§10a).
--
-- A handoff dossier is the durable product object a sibling agent produces
-- when the CEO orchestrator fans a single bell-ring request out across the
-- C-suite. `agent_dispatches.summary` records raw model output; the dossier
-- records the *structured* recommendation a user actually decides on
-- (proposed action, cited evidence, confidence, permission needed, optional
-- disagreement note). Rows sharing a `request_id` form one Council Table.
--
-- RLS isolates every row by `auth.uid() = user_id` on all four CRUD verbs;
-- service-role writers (the CEO orchestrator fire-and-forget path) bypass
-- RLS as usual.

-- 1. handoff_dossiers ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handoff_dossiers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  -- Joins to agent_dispatches.request_id so a Council Table can fetch every
  -- dossier emitted in a single bell-ring turn.
  request_id          text        NOT NULL,
  -- Optional join to the specific dispatch that produced this dossier. Null
  -- when the dossier was synthesised post-hoc by the CEO from peer intel
  -- rather than a single named dispatch.
  dispatch_id         uuid,
  -- Who owns this dossier (the agent making the recommendation).
  owner               text        NOT NULL,
  -- Who asked for the work (usually "ceo"; can be another agent in a
  -- peer-to-peer handoff).
  requesting_agent    text        NOT NULL DEFAULT 'ceo',
  task                text        NOT NULL,
  -- Evidence the dossier cites — array of { kind, id, summary } objects.
  -- Kept as jsonb so the shape can evolve without a migration.
  evidence            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  open_questions      text[]      NOT NULL DEFAULT '{}'::text[],
  -- 0–100; nullable when the agent declines to estimate.
  confidence          integer,
  -- Optional disagreement note when the owner disagrees with a peer's
  -- implicit recommendation in the same request.
  disagreement        jsonb,
  proposed_action     text        NOT NULL,
  -- What's needed for the user to grant the action.
  permission_needed   text        NOT NULL DEFAULT 'none'
                                  CHECK (permission_needed IN ('none', 'draft', 'send')),
  deadline            timestamptz,
  -- Single user-facing sentence in the owner agent's voice.
  recommendation      text        NOT NULL,
  status              text        NOT NULL DEFAULT 'ready'
                                  CHECK (status IN ('draft', 'ready', 'approved', 'rejected', 'executed', 'expired')),
  -- Set when the user makes a decision; service-role writers stamp these.
  decided_at          timestamptz,
  executed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE handoff_dossiers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'handoff_dossiers'
      AND policyname = 'handoff_dossiers_user_isolation'
  ) THEN
    CREATE POLICY handoff_dossiers_user_isolation ON handoff_dossiers
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Indexes mirror src/db/schema.ts §10a:
--   * (user_id, request_id) — Council Table fetch for one bell-ring.
--   * (user_id, status, created_at) — "recent ready/approved for this user".
--   * (owner, user_id) — owner-scoped scans for agent-side analytics.
CREATE INDEX IF NOT EXISTS idx_dossiers_user_request
  ON handoff_dossiers (user_id, request_id);

CREATE INDEX IF NOT EXISTS idx_dossiers_user_status_created
  ON handoff_dossiers (user_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_dossiers_owner
  ON handoff_dossiers (owner, user_id);

-- 2. updated_at trigger ───────────────────────────────────────────────────
-- Matches the per-table trigger pattern used by 0020 (offers). A shared
-- `update_updated_at_column()` helper does not exist in this repo, so we
-- declare a table-local one here. CREATE OR REPLACE keeps the migration
-- idempotent.
CREATE OR REPLACE FUNCTION set_handoff_dossiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handoff_dossiers_updated_at ON handoff_dossiers;
CREATE TRIGGER handoff_dossiers_updated_at BEFORE UPDATE ON handoff_dossiers
  FOR EACH ROW EXECUTE FUNCTION set_handoff_dossiers_updated_at();
