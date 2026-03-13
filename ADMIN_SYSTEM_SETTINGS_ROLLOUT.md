# Admin System Settings Rollout Checklist

## Scope
This rollout enables centralized admin controls for:
- login access (student/mentor)
- team/project creation policy
- timeline and weekly submission policy
- project cycle management

## Pre-Deployment
1. Ensure backend branch includes:
   - `backend/migrations/20260313_admin_system_settings.sql`
   - new settings services/routes/controllers/repositories
   - frontend settings UI updates
2. Verify Supabase backup snapshot exists before migration.
3. Confirm production `.env` points to correct Supabase DB.

## Database Migration
1. Run migration:
   - `backend/migrations/20260313_admin_system_settings.sql`
2. Validate:
   - `SELECT * FROM admin_system_settings WHERE id = 1;`
   - `SELECT cycle_name, is_active FROM project_cycles ORDER BY is_active DESC, created_at DESC;`
   - `SELECT COUNT(*) FROM admin_system_settings_audit_log;`

## Backend Validation
1. Restart backend service after deploy.
2. Run smoke checks:
   - `npm run smoke:tracker:policy`
   - `npm run smoke:system-settings`
3. Confirm both commands return `FAIL=0`.

## Frontend Validation
1. Open Admin -> System Settings page.
2. Toggle `Allow Team Creation` OFF and save.
3. Verify student team create screen shows disabled state and warning.
4. Toggle `Allow Project Creation` OFF and save.
5. Verify student project create CTA and form are disabled with warning.
6. Toggle `Allow Student Login` OFF and verify student role appears disabled on login page.
7. Re-enable toggles after checks.

## Production Rollback Plan
If critical issue occurs:
1. Keep DB schema as-is (non-breaking additive migration).
2. Roll back app version (backend + frontend) to last stable release.
3. In DB, set permissive defaults so old/new versions stay usable:
   - `allow_student_login = true`
   - `allow_mentor_login = true`
   - `allow_team_creation = true`
   - `allow_project_creation = true`
   - `enable_weekly_submissions = true`
4. Re-run smoke scripts once stable version is back.

## Post-Deployment Monitoring (24h)
1. Monitor login error rates for role-block messages.
2. Monitor team/project create failure responses.
3. Check `admin_system_settings_audit_log` entries for expected admin updates.
4. Review support tickets for unexpected policy blocks.
