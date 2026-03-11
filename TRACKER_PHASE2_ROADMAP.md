# Tracker Phase 2 Roadmap

Date: 2026-03-11
Status: Ready to Execute
Input Baseline: Phase 1 closed with full smoke pass

## 1) Phase 2 Goals

- Improve weekly tracking UX for faster student updates and mentor review throughput.
- Add proactive alerts and automation to reduce missed deadlines and review delays.
- Expand analytics from descriptive to actionable (trend + intervention).
- Keep strict role and audit guarantees from Phase 1.

## 2) Scope (Phase 2)

### A) Student Experience
- Draft autosave for weekly submission form.
- Rich revision diff view (summary, blockers, plan fields).
- Task card inline assignee change (if role permits).
- Week-level progress indicator tied to task completion.

### B) Mentor Experience
- Queue prioritization (oldest pending, high-risk first).
- Bulk review actions for low-risk approvals.
- Rejection templates for consistent feedback quality.
- One-click jump from review queue to project timeline context.

### C) Admin Controls
- Deadline policy presets (strict/flexible windows).
- Weekly compliance board (projects with stale activity, pending review SLA breaches).
- Controlled week-close automation with override logs.

### D) Automation and Notifications
- Scheduled auto-mark missed for expired pending weeks.
- Reminder notifications:
  - Student: deadline approaching
  - Mentor: review pending beyond SLA
- Escalation notifications for repeated rejection patterns.

### E) Analytics Expansion
- Trend lines: approval rate, resubmission rate, blocked task ratio.
- Mentor workload balance metrics.
- Early warning score (risk + low activity + overdue tasks).
- Export summary for admin review meetings.

## 3) Non-Functional Requirements

- API response p95 < 400ms on dashboard and queue endpoints.
- No unauthorized data exposure across projects.
- Full timeline coverage for all automation actions.
- Idempotent schedulers (safe re-run).
- Backward compatibility with Phase 1 contracts where possible.

## 4) Execution Plan (2-week suggestion)

### Sprint 1 (Week 1)
- Student draft autosave.
- Mentor queue prioritization + filters.
- Reminder notification jobs (deadline + review pending).
- Analytics: approval/resubmission trend widgets.

### Sprint 2 (Week 2)
- Admin compliance board.
- Week-close automation and override visibility.
- Escalation notification rules.
- Exportable analytics summary and QA hardening.

## 5) Deliverables

- Phase 2 API additions doc.
- Phase 2 UI flows and acceptance criteria.
- Scheduler job specs and retry/idempotency guarantees.
- Expanded smoke suite for automation paths.
- Phase 2 closure report with role-based validation evidence.
- Detailed engineering plan: TRACKER_PHASE2_P0_CODE_EXECUTION_PLAN.md

## 6) Acceptance Criteria

- Student can submit faster with lower abandonment (measurable from form completion rate).
- Mentor review turnaround improves with queue prioritization.
- Missed-week detection and notification automation runs reliably.
- Admin can detect and act on compliance outliers without manual querying.
- Smoke/regression suite passes for all new Phase 2 features.
