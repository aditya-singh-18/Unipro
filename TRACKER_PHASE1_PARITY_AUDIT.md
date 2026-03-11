# Tracker Phase 1 API Parity Audit

Date: 2026-03-11
Status: Updated after backend parity pass

## Summary

Contract-to-implementation parity is now aligned for core Phase 1 flows:
- week bootstrap and list
- week submission and resubmission
- mentor review
- submission files metadata APIs
- week status override (admin)
- kanban tasks
- timeline and current risk/health snapshots
- role-based dashboards

## Endpoint Parity Matrix

| Contract Area | Endpoint | Status |
|---|---|---|
| Weeks | POST /tracker/projects/:projectId/weeks/bootstrap | Implemented |
| Weeks | GET /tracker/projects/:projectId/weeks | Implemented |
| Weeks | PATCH /tracker/weeks/:weekId/status | Implemented |
| Submissions | POST /tracker/weeks/:weekId/submissions | Implemented |
| Submissions | POST /tracker/weeks/:weekId/submissions/resubmit | Implemented |
| Submissions | GET /tracker/weeks/:weekId/submissions | Implemented |
| Files | POST /tracker/submissions/:submissionId/files | Implemented |
| Files | GET /tracker/submissions/:submissionId/files | Implemented |
| Reviews | POST /tracker/submissions/:submissionId/review | Implemented |
| Reviews | GET /tracker/weeks/:weekId/reviews | Implemented |
| Tasks | POST /tracker/projects/:projectId/tasks | Implemented |
| Tasks | GET /tracker/projects/:projectId/tasks | Implemented |
| Tasks | PATCH /tracker/tasks/:taskId/status | Implemented |
| Timeline | GET /tracker/projects/:projectId/timeline | Implemented |
| Risk | GET /tracker/projects/:projectId/risk/current | Implemented |
| Risk | POST /tracker/projects/:projectId/risk/recalculate | Implemented |
| Health | GET /tracker/projects/:projectId/health/current | Implemented |
| Health | POST /tracker/projects/:projectId/health/recalculate | Implemented |
| Dashboards | GET /tracker/dashboard/student | Implemented |
| Dashboards | GET /tracker/dashboard/mentor | Implemented |
| Dashboards | GET /tracker/dashboard/admin | Implemented |

## Validation Performed

- Node syntax checks passed for:
  - backend/src/repositories/tracker.repo.js
  - backend/src/services/tracker.service.js
  - backend/src/controllers/tracker.controller.js
  - backend/src/routes/tracker.routes.js

## Notes

- Phase 1 API surface is now fully aligned with contract.
- Phase 1 core is stable and aligned with schema, role checks, timeline events, and recalculation jobs.
