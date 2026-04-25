-- 0023_launch_prep.sql
-- Launch-Ready Prep — three additive tables.
--
-- 1. waitlist_signups   — public-facing form rows (email + UTM/referrer).
-- 2. cron_runs          — every Vercel Cron invocation logs here for
--                         self-hosted cron health monitoring (cheaper than
--                         Sentry Cron, scoped to our 13 jobs).
-- 3. ai_call_quotas     — per-user-per-UTC-day AI call counter so we can
--                         enforce LAUNCH_CONFIG.costCaps without re-reading
--                         every prior call.
--
-- All three are additive. No existing-row backfills. Safe to apply on a live DB.

-- ─────────────────────────── waitlist_signups ────────────────────────
create table if not exists public.waitlist_signups (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    referrer text,
    utm text,
    invited_at timestamptz,
    invited_user_id uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create unique index if not exists waitlist_signups_email_uniq
    on public.waitlist_signups (lower(email));

create index if not exists waitlist_signups_invited_at_idx
    on public.waitlist_signups (invited_at);

alter table public.waitlist_signups enable row level security;

-- No public read/write — service role only. The form's server action uses
-- the admin client; users never see the table directly.
create policy waitlist_signups_no_anon
    on public.waitlist_signups
    for all
    to anon, authenticated
    using (false)
    with check (false);

-- ─────────────────────────── cron_runs ───────────────────────────────
create table if not exists public.cron_runs (
    id uuid primary key default gen_random_uuid(),
    job_name text not null,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    success boolean,
    error_message text,
    duration_ms integer,
    metadata jsonb
);

create index if not exists cron_runs_job_name_started_idx
    on public.cron_runs (job_name, started_at desc);

create index if not exists cron_runs_started_idx
    on public.cron_runs (started_at desc);

alter table public.cron_runs enable row level security;

-- Owner-only read — only the user whose id matches OWNER_USER_ID can see
-- cron health. Everyone else gets nothing. Service role bypasses RLS as
-- always.
create policy cron_runs_owner_read
    on public.cron_runs
    for select
    to authenticated
    using (
        auth.uid()::text = current_setting('app.owner_user_id', true)
    );

create policy cron_runs_no_writes_via_rls
    on public.cron_runs
    for insert
    to authenticated
    with check (false);

-- ─────────────────────────── ai_call_quotas ──────────────────────────
create table if not exists public.ai_call_quotas (
    user_id uuid not null references auth.users(id) on delete cascade,
    quota_date date not null,
    calls_used integer not null default 0,
    last_call_at timestamptz,
    primary key (user_id, quota_date)
);

create index if not exists ai_call_quotas_date_idx
    on public.ai_call_quotas (quota_date);

alter table public.ai_call_quotas enable row level security;

-- Owner of the row reads their own daily count.
create policy ai_call_quotas_self_read
    on public.ai_call_quotas
    for select
    to authenticated
    using (auth.uid() = user_id);

-- Inserts/updates must be service-role; the RPC below enforces fail-closed
-- semantics and is the only path that should ever mutate this table.
create policy ai_call_quotas_no_writes_via_rls
    on public.ai_call_quotas
    for insert
    to authenticated
    with check (false);

create policy ai_call_quotas_no_updates_via_rls
    on public.ai_call_quotas
    for update
    to authenticated
    using (false)
    with check (false);

-- Atomic increment + cap-check RPC. Returns the new count if under cap,
-- raises 'ai_quota_exceeded' if over. Service-role only.
create or replace function public.consume_ai_call_quota(
    p_user_id uuid,
    p_cap integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_new_count integer;
    v_today date := (now() at time zone 'UTC')::date;
begin
    insert into public.ai_call_quotas as q (user_id, quota_date, calls_used, last_call_at)
        values (p_user_id, v_today, 1, now())
        on conflict (user_id, quota_date) do update
            set calls_used = q.calls_used + 1,
                last_call_at = now()
        returning calls_used into v_new_count;

    if v_new_count > p_cap then
        raise exception 'ai_quota_exceeded' using errcode = 'P0001';
    end if;

    return v_new_count;
end;
$$;

revoke all on function public.consume_ai_call_quota(uuid, integer) from public;
grant execute on function public.consume_ai_call_quota(uuid, integer) to service_role;
