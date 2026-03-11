# Tracker Phase 3 Implementation Backlog

Date: 2026-03-11
Status: Complete

## P0 (Start First)

1. SLA escalation scheduler
- Job to detect review_pending windows and escalate by thresholds.
- Timeline events for each escalation stage.
- Notification fan-out to mentor/admin.
- Acceptance:
  - idempotent and de-duplicated escalations.
- Status: Completed (scheduler + dedupe + timeline integration)

2. Project status history API
- Unified endpoint to return status transitions with actor/reason/time.
- Include integration with project_status_logs when available.
- Acceptance:
  - admin can see latest and historical transitions per project.
- Status: Completed (timeline + project_status_logs unified endpoint)

3. Admin compliance board escalations panel
- Add escalated projects section with severity and age.
- Add quick-action links to approvals/oversight.
- Acceptance:
  - escalated items visible and actionable in < 2 clicks.
- Status: Completed (dashboard escalation queue + project focus links + status history section)

## P1 (High Value)

1. Predictive warning score
- Compute score and reasons per project.
- Include in compliance API payload.
- Acceptance:
  - score explains top drivers and priority.
- Status: Completed (score, reasons, priority in compliance payload + admin analytics UI)

2. Governance export
- CSV + JSON export for weekly governance meeting.
- Export should include risk, missed weeks, review lag, escalations.
- Acceptance:
  - download succeeds and data matches dashboard totals.
- Status: Completed (CSV/JSON export endpoint + admin analytics export actions)

3. Mentor load trend analytics
- Queue age and volume trend per mentor.
- Basic trend cards in admin analytics.
- Acceptance:
  - hotspot mentors identifiable quickly.
- Status: Completed (mentor-load API + admin analytics table)

## P2 (Enhancements)

1. Policy UI for SLA windows
- Admin-editable escalation windows and severity rules.

2. Department leaderboard
- Compliance/risk ranking by department.
- Status: Completed post-phase (admin department leaderboard page + API + smoke)

3. Batch action workflow
- Bulk escalation acknowledge / bulk follow-up notes.

## Testing Backlog

1. Escalation smoke tests
- threshold transitions
- dedupe verification
- timeline event checks
- Status: P0 smoke covered

2. API security tests
- role enforcement for audit/export endpoints
- Status: Completed (admin pass, student 403 regression covered)

3. Performance checks
- compliance + status history API p95 target
- Status: Completed (baseline p95 recorded under target)

## Definition of Done (Phase 3)

- Escalation engine live with observability.
- Status history endpoint and UI integrated.
- Predictive warning score delivered.
- Export workflow functional and role-secure.
- Phase 3 P1 smoke green.
- Smoke + regression suites green.
- Phase 3 closure report generated.
- Status: Completed
