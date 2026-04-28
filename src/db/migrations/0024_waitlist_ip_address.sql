-- 0024_waitlist_ip_address.sql
-- Security finding F-6: capture the originating IP on every waitlist signup
-- so an admin can spot abuse patterns after the fact. The Server Action also
-- now rate-limits by normalized email; this column is forensic, not gating.
--
-- Additive, idempotent. Existing rows get NULL, which is correct (we have no
-- IP for signups that predate this migration). Inet is the right type:
-- validates v4/v6 at write time, indexes cleanly, and avoids the inet/cidr
-- ambiguity of `cidr`.

alter table "waitlist_signups"
    add column if not exists "ip_address" inet;
