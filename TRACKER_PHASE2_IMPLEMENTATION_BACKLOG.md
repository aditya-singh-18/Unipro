# Tracker Phase 2 Implementation Backlog

Date: 2026-03-11
Status: Prioritized

## P0 (Start First)

1. Mentor queue prioritization API
- Add sorting by:
  - pending age desc
  - project risk desc
  - week deadline proximity asc
- Add query params for filter and sort.
- Acceptance:
  - Queue order reproducible and testable.

2. Reminder notification scheduler
- Cron job 1: student deadline reminders.
- Cron job 2: mentor pending-review reminders.
- Add de-duplication window to avoid spam.
- Acceptance:
  - Same reminder not emitted repeatedly in same window.
- Status: Implemented (migration + repo + scheduler + env toggles wired)

3. Week auto-missed job
- Mark week as missed when deadline passes and still pending/submitted (as per policy).
- Emit timeline event and notification.
- Acceptance:
  - Idempotent run, no duplicate transitions.
- Status: Implemented (repo + scheduler + timeline + notifications + env toggles wired)

## P1 (High Value)

1. Student draft autosave
- Local draft + server draft endpoint optional.
- Restore draft on page refresh.
- Acceptance:
  - No content loss on accidental refresh.

2. Revision diff panel
- Compare latest vs previous for summary/blockers/plan.
- Field-level highlights.
- Acceptance:
  - Mentor can identify changes in under 10 seconds.

3. Admin compliance board
- Cards:
  - overdue reviews
  - stale activity projects
  - repeated rejected weeks
- Acceptance:
  - Board opens with actionable list and links.

## P2 (Enhancements)

1. Rejection comment templates
- Mentor-selectable structured feedback snippets.

2. Export analytics summary
- CSV or JSON export for weekly governance review.

3. Workload balance analytics
- Mentor queue load distribution and hotspot view.

## Testing Backlog

1. Add automation smoke cases
- scheduler triggers
- missed-week transition
- reminder de-duplication

2. Add role-security tests
- verify new APIs enforce student/mentor/admin matrix

3. Add performance checks
- dashboard and queue endpoints p95 target

## Definition of Done (Phase 2)

- API contract v2 documented.
- UI flows mapped and implemented for scoped items.
- Scheduler jobs observable and idempotent.
- Smoke + regression suites green.
- Phase 2 closure report generated.
