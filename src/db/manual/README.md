# Manual SQL migrations

Supabase-specific SQL that Drizzle Kit cannot generate (extensions, triggers,
RPC functions, RLS policies keyed on `auth.uid()`). Run **in numeric order**
via Supabase Dashboard → SQL Editor, after the Drizzle-generated migrations
in `../migrations/` are applied.

| Order | File                              | Purpose                                          |
| ----- | --------------------------------- | ------------------------------------------------ |
| 000   | `000_post_push.sql`               | pgvector, new-user profile trigger, `updated_at` triggers, billing guard |
| 001   | `001_vector_search.sql`           | Cosine-similarity RPCs (`match_company_embeddings`, `match_job_embeddings`) |
| 002   | `002_pipeline_stats_rpc.sql`      | Single-round-trip pipeline stats RPC             |
| 003   | `003_stripe_webhook_events.sql`   | Idempotency table for Stripe webhook             |
| 004   | `004_progression_milestones_unique.sql` | Unique milestone unlock per user (concurrency safety) |
| 005   | `005_interview_audio_bucket.sql`  | R6 private storage bucket + SELECT policy for interview audio |

Scripts are idempotent — they can be re-run safely.
