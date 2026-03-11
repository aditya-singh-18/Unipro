# Tracker Phase 2 P0 Smoke Tests

Date: 2026-03-11
Status: Ready

## Preconditions

1. Phase 1 tracker migration already applied.
2. Phase 2 reminder dedupe migration applied:
   - backend/migrations/20260311_tracker_phase2_notifications_dedupe.sql
3. Backend server running.
4. backend/.env.smoke has mentor credentials.

## Command

From backend folder:

`npm run smoke:tracker:phase2:p0`

## What this checks

- Mentor prioritized queue endpoint responds.
- Reminder scheduler one-shot executes.
- Auto-missed scheduler one-shot executes.
- Report generated at:
  - TRACKER_PHASE2_P0_SMOKE_REPORT.md
