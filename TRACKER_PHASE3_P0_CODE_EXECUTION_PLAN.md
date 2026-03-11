# Tracker Phase 3 P0 Code Execution Plan

Date: 2026-03-11
Status: Implemented (smoke green)
Scope: P0 only (SLA escalation engine, status history API, admin escalation panel)

## 1) P0-1 SLA Escalation Scheduler

### Objective
Automatically escalate pending mentor reviews across SLA windows.

### Policy (configurable)
- SLA1: > 24h pending -> reminder escalation
- SLA2: > 48h pending -> admin escalation
- SLA3: > 72h pending -> critical escalation

### Backend File Targets
- Add: backend/src/repositories/trackerEscalation.repo.js
  - getReviewSlaCandidates()
  - registerEscalationDispatch()
  - getCurrentEscalationState()
- Add: backend/src/jobs/trackerEscalation.job.js
  - runTrackerEscalationJob()
  - startTrackerEscalationScheduler()
- Update: backend/src/server.js
  - wire escalation scheduler startup
- Update: backend/src/repositories/tracker.repo.js
  - timeline event helper reuse for escalation events

### Data Additions
Migration file:
- backend/migrations/20260311_tracker_phase3_escalation_log.sql

Suggested table:
- tracker_escalation_dispatch_log
  - escalation_id BIGSERIAL PK
  - dedupe_key VARCHAR UNIQUE NOT NULL
  - project_id VARCHAR NOT NULL
  - week_id BIGINT
  - escalation_level VARCHAR NOT NULL
  - recipient_user_key VARCHAR NOT NULL
  - dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### Env Config
- TRACKER_ESCALATION_ENABLED=true
- TRACKER_ESCALATION_INTERVAL_MIN=30
- TRACKER_ESCALATION_SLA1_HOURS=24
- TRACKER_ESCALATION_SLA2_HOURS=48
- TRACKER_ESCALATION_SLA3_HOURS=72

### Acceptance
- Same escalation level not emitted repeatedly in same window.
- Escalation transitions logged in timeline.
- Job rerun safe (idempotent).

## 2) P0-2 Project Status History API

### Objective
Expose full status transition history for admin oversight.

### API Contract
- Method: GET
- Path: /api/tracker/projects/:projectId/status-history
- Roles: ADMIN (initial), optionally MENTOR read-only
- Output:
  - history: [{ projectId, oldStatus, newStatus, changedBy, reason, createdAt }]

### Backend File Targets
- Update: backend/src/repositories/tracker.repo.js
  - getProjectStatusHistory(projectId)
- Update: backend/src/services/tracker.service.js
  - getProjectStatusHistoryService({projectId, role})
- Update: backend/src/controllers/tracker.controller.js
  - getProjectStatusHistory
- Update: backend/src/routes/tracker.routes.js
  - route wiring + role guard

### Source Strategy
- Primary: project_status_logs (if table exists)
- Fallback: admin_override_logs
- Keep non-blocking behavior if one table is unavailable.

### Acceptance
- Returns latest-first timeline with consistent schema.
- Role enforcement verified.

## 3) P0-3 Admin Escalation Panel (UI)

### Objective
Show escalated projects and status history in admin surfaces.

### Frontend File Targets
- Update: frontend/src/services/tracker.service.ts
  - getProjectStatusHistory(projectId)
  - extend compliance item with escalation metadata
- Update: frontend/src/app/admin/dashboard/page.tsx
  - add escalations panel and severity chips
- Update: frontend/src/app/admin/projects/page.tsx
  - add per-project status history drawer

### UX Requirements
- One-click project focus from escalations list.
- Show escalation level, age, and latest status reason.
- Clear empty-state when no escalations exist.

### Acceptance
- Admin can identify and open escalated projects quickly.
- Status history visible without leaving oversight flow.

## 4) Test Plan (P0)

### Smoke
- Add: backend/scripts/runTrackerPhase3P0Smoke.mjs
  - escalation job one-shot
  - status history API checks
  - compliance payload includes escalation fields

### Security
- status-history endpoint:
  - ADMIN token PASS
  - STUDENT token 403

### Reliability
- Run escalation job twice and verify no duplicate escalation dispatches.

## 5) Suggested Implementation Order

1. Migration for escalation dispatch log.
2. Escalation repository + job + server wiring.
3. Status history API (repo->service->controller->route).
4. Admin dashboard/projects UI escalations integration.
5. Smoke tests + docs + P0 closure note.

## 6) Exit Criteria for P0 Complete

- Escalation scheduler active and idempotent.
- Status history endpoint available and role-protected.
- Admin UI shows escalation and status history context.
- Phase 3 P0 smoke suite green.

## 7) Execution Notes (Completed)

- Added escalation scheduler:
  - backend/src/jobs/trackerEscalation.job.js
  - backend/src/server.js startup wiring
  - env knobs in backend/.env.smoke.example
- Added status history API:
  - GET /api/tracker/projects/:projectId/status-history
  - repo/service/controller/route chain implemented
  - includes fallback-safe merge with project_status_logs
- Added admin escalation board API:
  - GET /api/tracker/dashboard/admin/escalations
- Frontend integration:
  - dashboard escalation queue panel
  - project oversight status history section for focused project
- Smoke validation:
  - npm run smoke:tracker:phase3:p0
  - PASS=4 FAIL=0
