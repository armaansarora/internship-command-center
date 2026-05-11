-- 0038_waitlist_status.sql
-- GTM InviteCron — add an explicit lifecycle status to waitlist_signups so the
-- rolling-invites cron has a single canonical predicate to query against
-- ("waiting") and a single transition target ("invited"). Prior to this the
-- inferred state lived in the nullability of `invited_at` alone, which is fine
-- for a one-shot check but reads awkwardly when joined with the cron's
-- per-row try/catch and audit trail.
--
-- Additive + idempotent. Existing rows are backfilled in a single statement
-- using the same predicate the cron will query against:
--   • invited_at IS NULL → 'waiting'
--   • invited_at IS NOT NULL → 'invited'
-- A row stays 'invited' once stamped; the user-claim step in beta-gate.ts is
-- the implicit final transition (no separate status string needed — the row's
-- `invited_user_id` is the join key for that handshake).
--
-- The `check` constraint pins the universe of valid statuses so a typo at the
-- application layer fails loudly at insert time instead of silently breaking
-- the cron's query.

alter table public.waitlist_signups
    add column if not exists status text not null default 'waiting';

-- Backfill rows that were stamped before this migration shipped. Idempotent —
-- re-running this on a fresh DB is a no-op because the column already
-- defaults to 'waiting' and no rows will have a non-null invited_at yet.
update public.waitlist_signups
    set status = 'invited'
    where invited_at is not null
      and status = 'waiting';

-- Whitelist the legal values. 'waiting' and 'invited' cover the cron path;
-- 'declined' is reserved for a future opt-out flow (e.g., reply-to-decline
-- mailing rule) and intentionally accepted up front so the constraint does
-- not need to be relaxed later.
do $$
begin
    if not exists (
        select 1
        from information_schema.table_constraints
        where table_schema = 'public'
          and table_name = 'waitlist_signups'
          and constraint_name = 'waitlist_signups_status_check'
    ) then
        alter table public.waitlist_signups
            add constraint waitlist_signups_status_check
            check (status in ('waiting', 'invited', 'declined'));
    end if;
end$$;

-- Composite index on the cron's exact predicate. The cron pulls
-- (status='waiting' AND invited_at IS NULL) ordered by created_at, so an index
-- on (status, created_at) lets PostgREST pick rows directly without scanning
-- the full table. Partial index because we only ever read the 'waiting'
-- subset.
create index if not exists waitlist_signups_waiting_by_created_idx
    on public.waitlist_signups (status, created_at)
    where status = 'waiting' and invited_at is null;
