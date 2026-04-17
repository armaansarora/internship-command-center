-- Phase 3: aggregate pipeline stats in the database (single RPC round-trip).
-- Apply once in Supabase: Dashboard → SQL → New query → paste this file → Run.
-- (Not wired into drizzle-kit journal — avoids snapshot drift; safe to run manually.)
CREATE OR REPLACE FUNCTION public.pipeline_stats_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  by_status jsonb;
  total_active int;
  stale_c int;
  warm_c int;
  weekly int;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_object_agg(status, n), '{}'::jsonb)
  INTO by_status
  FROM (
    SELECT COALESCE(status, 'discovered') AS status, count(*)::int AS n
    FROM applications
    WHERE user_id = p_user_id
    GROUP BY COALESCE(status, 'discovered')
  ) s;

  SELECT
    count(*) FILTER (WHERE COALESCE(status, '') NOT IN ('accepted', 'rejected', 'withdrawn'))::int,
    count(*) FILTER (WHERE COALESCE(last_activity_at, created_at) < now() - interval '14 days')::int,
    count(*) FILTER (WHERE COALESCE(last_activity_at, created_at) < now() - interval '7 days'
      AND COALESCE(last_activity_at, created_at) >= now() - interval '14 days')::int,
    count(*) FILTER (WHERE COALESCE(last_activity_at, created_at) >= now() - interval '7 days')::int
  INTO total_active, stale_c, warm_c, weekly
  FROM applications
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'byStatus', by_status,
    'totalActive', total_active,
    'staleCount', stale_c,
    'warmCount', warm_c,
    'weeklyActivity', weekly
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pipeline_stats_for_user(uuid) TO authenticated;
