-- 0017_r7_situation_room.sql
-- R7 — The Situation Room (Floor 4).
-- Adds: real-undo window on outreach_queue, quiet-hours queueing on notifications,
-- quiet-hours preference on user_profiles, deadline tracking + 3-beat dedupe on applications.

-- ---------------------------------------------------------------------------
-- outreach_queue — REAL undo window
-- ---------------------------------------------------------------------------
-- send_after: earliest moment the cron sender may pick up this row. Set to
-- now()+30s by /api/outreach/approve. Cron filter is `send_after <= now()`;
-- undo filter is `send_after > now()`. Mutual exclusion is enforced by the
-- database, not the UI.
--
-- cancelled_at: audit trail stamped by /api/outreach/undo on successful revert.
ALTER TABLE outreach_queue
  ADD COLUMN send_after   timestamptz,
  ADD COLUMN cancelled_at timestamptz;

-- Cron pickup predicate needs an index to avoid a table scan as outreach_queue grows.
-- Partial index scoped to the exact predicate cron uses.
CREATE INDEX idx_outreach_cron_pickup
  ON outreach_queue (send_after)
  WHERE status = 'approved' AND sent_at IS NULL;

-- Backfill legacy approved rows so the cron predicate doesn't exclude them.
-- Before this migration, cron picked up status='approved' regardless of send_after;
-- after this migration, cron requires send_after <= now(). Stamping send_after
-- to approved_at preserves legacy behavior for rows already in flight.
UPDATE outreach_queue
   SET send_after = approved_at
 WHERE status = 'approved' AND send_after IS NULL;

-- ---------------------------------------------------------------------------
-- notifications — pneumatic-tube quiet-hours queueing
-- ---------------------------------------------------------------------------
-- deliver_after: earliest moment the client tube subscriber may render this
-- notification. Computed at insert time from user's quiet_hours + timezone.
-- Null (for legacy rows) means "deliver immediately."
--
-- delivered_at: stamped atomically by the first client session that claims
-- the row; ensures no double-tube for the same notification across tabs/devices.
ALTER TABLE notifications
  ADD COLUMN deliver_after timestamptz,
  ADD COLUMN delivered_at  timestamptz;

CREATE INDEX idx_notif_user_deliver
  ON notifications (user_id, deliver_after)
  WHERE is_dismissed = false AND delivered_at IS NULL;

-- ---------------------------------------------------------------------------
-- user_profiles — quiet-hours preference
-- ---------------------------------------------------------------------------
-- Shape: {"start":"HH:MM","end":"HH:MM"} or null (always deliver immediately).
-- Wrap-around is allowed (e.g. start="22:00", end="07:00" = overnight quiet).
-- Timezone is taken from the existing user_profiles.timezone column.
ALTER TABLE user_profiles
  ADD COLUMN quiet_hours jsonb;

-- ---------------------------------------------------------------------------
-- applications — deadline tracking + 3-beat alert dedupe
-- ---------------------------------------------------------------------------
-- deadline_at: optional hard deadline. Feeds the Floor-4 Final Countdown
-- section and the 3-beat cron (t_24h, t_4h, t_0).
--
-- deadline_alerts_sent: per-app record of which beats have already fired.
-- Shape: {"t_24h":"ISO","t_4h":"ISO","t_0":"ISO"} — each key optional, value
-- is the timestamp the beat was fired. Presence of a key = that beat already
-- fired and must not fire again.
ALTER TABLE applications
  ADD COLUMN deadline_at          timestamptz,
  ADD COLUMN deadline_alerts_sent jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_apps_user_deadline
  ON applications (user_id, deadline_at)
  WHERE deadline_at IS NOT NULL;
