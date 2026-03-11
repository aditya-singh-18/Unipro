# Backend Migration Guide (Supabase)

Run tracker migrations once, in chronological order.

## Required Order

1. `migrations/20260311_tracker_phase1_schema.sql`
2. `migrations/20260311_tracker_phase2_notifications_dedupe.sql`
3. `migrations/20260311_tracker_phase2_p1_week_drafts.sql`
4. `migrations/20260312_tracker_phase3_escalation_indexes.sql`
5. `migrations/20260312_tracker_phase4_policy_settings.sql`

Optional (only if bio feature is needed):

1. `migrations/add_bio_column.sql`

## Supabase SQL Editor

Open Supabase -> SQL Editor -> New Query and run files in the same order.

Notes:

- Most tracker migrations use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, so they are re-run safe.
- `add_bio_column.sql` is also idempotent via `information_schema` check.

## Node Script Runner

From `backend` folder:

```bash
node scripts/applyMigration.mjs migrations/20260311_tracker_phase1_schema.sql
node scripts/applyMigration.mjs migrations/20260311_tracker_phase2_notifications_dedupe.sql
node scripts/applyMigration.mjs migrations/20260311_tracker_phase2_p1_week_drafts.sql
node scripts/applyMigration.mjs migrations/20260312_tracker_phase3_escalation_indexes.sql
node scripts/applyMigration.mjs migrations/20260312_tracker_phase4_policy_settings.sql
```

Optional:

```bash
node scripts/applyMigration.mjs migrations/add_bio_column.sql
```

## Quick Verification

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
	AND tablename IN (
		'project_weeks',
		'week_submissions',
		'tracker_notification_dispatch_log',
		'project_week_drafts'
	)
ORDER BY tablename;
```
