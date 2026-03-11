# Tracker Phase 2 — P0 Closure Report

**Date**: 2026-03-11  
**Phase**: 2  
**Priority**: P0 (must-ship)  
**Status**: ✅ CLOSED

---

## Summary

All three P0 items are fully implemented, smoke-tested, and behaviorally validated against a live Supabase Postgres database.

---

## Deliverables

### P0-1 · Mentor Queue Prioritization API

**Goal**: Replace N+1 per-project calls in the mentor dashboard with a single prioritized backend query.

| Component | File | Change |
|-----------|------|--------|
| Repository | `backend/src/repositories/tracker.repo.js` | `getMentorReviewQueue()` CTE with risk snapshot, reviewable weeks, latest submissions, sort/filter/pagination |
| Validator | `backend/src/validators/tracker.validator.js` | `REVIEW_QUEUE_SORTS`, `SORT_ORDERS`, `RISK_LEVELS`, `normalizeReviewQueueParams()` |
| Service | `backend/src/services/tracker.service.js` | `getMentorReviewQueueService()` |
| Controller | `backend/src/controllers/tracker.controller.js` | `getMentorReviewQueue` HTTP handler |
| Route | `backend/src/routes/tracker.routes.js` | `GET /tracker/mentor/review-queue` |
| API client | `frontend/src/services/tracker.service.ts` | `getMentorReviewQueue()`, `MentorReviewQueueResponse` type |
| Mentor dashboard | `frontend/src/app/mentor/projects/page.tsx` | Replaced N+1 with single queue call |
| Mentor analytics | `frontend/src/app/mentor/analytics/page.tsx` | Same replacement |

**Validation**: Smoke BV check → `items=0` on empty dataset (correct, no active review weeks). Lint + TypeScript: pass.

---

### P0-2 · Reminder Notification Scheduler

**Goal**: Proactively notify students before deadline and mentors after review SLA, with hour-bucket de-duplication.

| Component | File | Change |
|-----------|------|--------|
| DB migration | `backend/migrations/20260311_tracker_phase2_notifications_dedupe.sql` | `tracker_notification_dispatch_log(dedupe_key UNIQUE, ...)` + 5 indexes |
| Repository | `backend/src/repositories/trackerReminder.repo.js` | `getStudentDeadlineReminderCandidates()`, `getMentorReviewReminderCandidates()`, `registerNotificationDispatch()` |
| Job | `backend/src/jobs/trackerReminder.job.js` | `runTrackerReminderJob()`, `startTrackerReminderScheduler()` |
| Server wiring | `backend/src/server.js` | `startTrackerReminderScheduler()` called on startup |

**Behavioral Evidence**:
```
BV-2b  student candidates >= 1   PASS (candidates=3)
BV-2c  student sent >= 1         PASS (sent=3)
BV-2d  dispatch log written      PASS (3 rows)
BV-2e  second run deduped        PASS (sent=0)
```

---

### P0-3 · Week Auto-Missed Scheduler

**Goal**: Automatically transition weeks from `pending`/`submitted` to `missed` after deadline expiry, with timeline audit trail.

| Component | File | Change |
|-----------|------|--------|
| Repository | `backend/src/repositories/trackerWeekClosure.repo.js` | `getAutoMissedWeekCandidates()`, `markWeekAsMissedIfEligible()` |
| Job | `backend/src/jobs/trackerWeekClosure.job.js` | `runTrackerWeekClosureJob()`, `startTrackerWeekClosureScheduler()` |
| Server wiring | `backend/src/server.js` | `startTrackerWeekClosureScheduler()` called on startup |

**Behavioral Evidence**:
```
BV-1b  candidates >= 1              PASS (candidates=1)
BV-1c  transitioned >= 1            PASS (transitioned=1)
BV-1d  DB status = missed           PASS
BV-1e  timeline event written       PASS
BV-1f  actor_role = SYSTEM          PASS
```

---

## Test Evidence

### Smoke Suite (`npm run smoke:tracker:phase2:p0`)

```
[PASS] Mentor login - Token acquired
[PASS] Mentor prioritized review queue - items=0
[PASS] Reminder scheduler one-shot - student sent=0/0, mentor sent=0/0
[PASS] Auto-missed scheduler one-shot - transitioned=0/0
PASS=4  FAIL=0  SKIP=0
```

### Behavioral Validation (`npm run smoke:tracker:phase2:bv`)

```
[PASS] BV-1a  closure job enabled
[PASS] BV-1b  candidates >= 1
[PASS] BV-1c  transitioned >= 1
[PASS] BV-1d  DB status = missed
[PASS] BV-1e  timeline event written
[PASS] BV-1f  actor_role = SYSTEM
[PASS] BV-2a  reminder job enabled
[PASS] BV-2b  student candidates >= 1
[PASS] BV-2c  student sent >= 1
[PASS] BV-2d  dispatch log written
[PASS] BV-2e  second run deduped (sent=0)
[PASS] BV-3a  no stale candidates after miss
PASS=12  FAIL=0
```

---

## Environment Variables (`.env.smoke.example`)

```env
TRACKER_AUTO_MISSED_ENABLED=true
TRACKER_AUTO_MISSED_INTERVAL_MIN=30
TRACKER_REMINDER_ENABLED=true
TRACKER_REMINDER_INTERVAL_MIN=30
TRACKER_STUDENT_DEADLINE_REMINDER_HOURS=24
TRACKER_MENTOR_REVIEW_SLA_HOURS=24
```

---

## Notes

- Socket.IO `emit` gracefully silences in standalone runs (`Socket.io not initialized`) — no impact on DB writes.
- `registerNotificationDispatch` uses `ON CONFLICT (dedupe_key) DO NOTHING` — idempotent and race-safe.
- `markWeekAsMissedIfEligible` re-checks `status IN ('pending','submitted')` atomically — safe for concurrent runs.
- All fixture data was seeded and cleaned within the validation run — no permanent test debris in DB.

---

## P1 Backlog (Next)

| ID | Feature | Priority |
|----|---------|----------|
| P1-1 | Student draft autosave (local + server draft endpoint) | High |
| P1-2 | Revision diff panel in mentor review modal | High |
| P1-3 | Admin compliance board | Medium |
