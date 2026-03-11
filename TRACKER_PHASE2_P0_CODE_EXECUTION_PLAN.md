# Tracker Phase 2 P0 Code Execution Plan

Date: 2026-03-11
Status: Ready for implementation
Scope: P0 only (queue prioritization, reminders, auto-missed)

## 1) P0-1 Mentor Queue Prioritization API

### Objective
Replace frontend-composed mentor queue with backend-first prioritized queue.

### API Contract
- Method: GET
- Path: /api/tracker/mentor/review-queue
- Roles: MENTOR
- Query:
  - sortBy: pending_age | risk | deadline
  - order: asc | desc
  - page, pageSize
  - riskLevel: low | medium | high (optional filter)
- Output:
  - queue: [{ projectId, weekId, weekNumber, submissionId, revisionNo, submittedAt, pendingHours, riskLevel, deadlineAt, phaseName, summaryOfWork }]
  - pagination: { page, pageSize, total }

### Backend File Targets
- Update: backend/src/routes/tracker.routes.js
  - add route handler for mentor queue endpoint.
- Update: backend/src/controllers/tracker.controller.js
  - add getMentorReviewQueue handler.
- Update: backend/src/services/tracker.service.js
  - add getMentorReviewQueueService with role checks and pagination validation.
- Update: backend/src/repositories/tracker.repo.js
  - add SQL query:
    - latest submission per week
    - latest risk snapshot per project
    - pending duration and deadline projection
    - filter + sort + pagination.
- Update: backend/src/validators/tracker.validator.js
  - add enum guard for queue sort params.

### Frontend File Targets
- Update: frontend/src/services/tracker.service.ts
  - add getMentorReviewQueue API client and response type.
- Update: frontend/src/app/mentor/projects/page.tsx
  - remove per-project fanout calls for queue.
  - call new backend queue endpoint once.
  - add queue sort/filter controls in UI.

### Acceptance
- Queue order deterministic for same input.
- One backend call for queue instead of N+1 calls.
- p95 response for queue endpoint under target for expected dataset.

## 2) P0-2 Reminder Notification Scheduler

### Objective
Auto-send reminders with de-duplication:
- student deadline reminder
- mentor pending review reminder

### Data Model Additions
Add new table to prevent duplicate reminders in time window.

Suggested migration file:
- backend/migrations/20260311_tracker_phase2_notifications_dedupe.sql

Table:
- tracker_notification_dispatch_log
  - dispatch_id BIGSERIAL PK
  - dedupe_key VARCHAR NOT NULL UNIQUE
  - project_id VARCHAR NOT NULL
  - week_id BIGINT
  - recipient_user_key VARCHAR NOT NULL
  - notification_type VARCHAR NOT NULL
  - dispatched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

### Backend File Targets
- Add: backend/src/jobs/trackerReminder.job.js
  - runStudentDeadlineReminders()
  - runMentorReviewReminders()
- Add: backend/src/repositories/trackerReminder.repo.js
  - candidate selection queries
  - dispatch log insert/check queries
- Update: backend/src/services/notification.service.js
  - keep existing pushNotification; reuse for sends.
- Update: backend/src/server.js
  - schedule reminder job via setInterval (e.g. every 30 min).

### Reminder Rules
- Student reminder:
  - week pending and deadline within configured window (e.g. <= 24h).
- Mentor reminder:
  - week submitted/under_review and pending review beyond SLA (e.g. > 24h).
- De-duplication:
  - dedupe key format example:
    - student_deadline:{weekId}:{userKey}:{YYYYMMDDHH-window}
    - mentor_review_pending:{weekId}:{mentorUserKey}:{YYYYMMDD}

### Env Config (new)
- TRACKER_REMINDER_ENABLED=true
- TRACKER_REMINDER_INTERVAL_MIN=30
- TRACKER_STUDENT_DEADLINE_REMINDER_HOURS=24
- TRACKER_MENTOR_REVIEW_SLA_HOURS=24

### Acceptance
- Same reminder not sent repeatedly inside dedupe window.
- Job is safe to rerun (idempotent behavior).
- Timeline/notification records show expected events.

## 3) P0-3 Week Auto-Missed Scheduler

### Objective
Auto-close overdue weeks to missed according to policy.

### Policy (P0)
- Eligible when:
  - deadline_at < now
  - status IN ('pending', 'submitted')
- Action:
  - status -> missed
  - timeline event week_marked_missed
  - notify team students + assigned mentor

### Backend File Targets
- Add: backend/src/jobs/trackerWeekClosure.job.js
  - runAutoMarkMissedWeeks()
- Add: backend/src/repositories/trackerWeekClosure.repo.js
  - fetch eligible weeks in batch
  - atomic status update guard by current status
- Update: backend/src/services/tracker.service.js
  - optional reusable helper for week close transitions.
- Update: backend/src/server.js
  - schedule closure job (e.g. every 30 min).

### Env Config (new)
- TRACKER_AUTO_MISSED_ENABLED=true
- TRACKER_AUTO_MISSED_INTERVAL_MIN=30

### Acceptance
- No duplicate missed transitions for same week.
- If week already locked/approved/rejected/missed, skip safely.
- Timeline has one authoritative week_marked_missed event.

## 4) Scheduler Wiring Pattern

Preferred structure:
- backend/src/jobs/index.js
  - startTrackerJobs()
  - returns cleanup handlers (optional)

Server wiring:
- Update backend/src/server.js:
  - call startTrackerJobs() after server/socket initialization.
  - remove inline tracker-specific setInterval clutter from server.js.

## 5) Test Plan (P0)

### Automated smoke extensions
- Update: backend/scripts/runTrackerPhase1Smoke.mjs
  - add checks for new mentor queue endpoint.
- Add: backend/scripts/runTrackerPhase2P0Smoke.mjs (optional split)
  - force-run scheduler paths via test mode env.

### API + Security checks
- Mentor queue:
  - mentor token PASS
  - student/admin token 403
- Reminder/closure jobs:
  - dry-run mode output for CI
  - idempotency check via two sequential executions.

### Documentation updates
- Update: TRACKER_PHASE2_IMPLEMENTATION_BACKLOG.md
  - mark each P0 item in-progress/done.
- Add: TRACKER_PHASE2_P0_SMOKE_TESTS.md
  - step-by-step validation commands.

## 6) Suggested Implementation Order

1. DB migration for dedupe log.
2. Mentor queue API (repo -> service -> controller -> route).
3. Frontend mentor queue integration.
4. Reminder job + repo + env toggles.
5. Auto-missed job + repo + env toggles.
6. Smoke tests + docs + closure note.

## 7) Exit Criteria for P0 Complete

- Mentor queue endpoint live and used by UI.
- Reminder scheduler sends correct notifications without duplicates.
- Auto-missed scheduler transitions eligible weeks correctly.
- Smoke suite passes for P0 paths.
- P0 completion report added with evidence.
