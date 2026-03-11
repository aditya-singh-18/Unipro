# Tracker Phase 0 - Scope Freeze

Date: 2026-03-11
Owner: Project Team
Module: University Agile Project Tracker

## 1) Objective
Phase 0 ka goal tracker development ke liye clear boundary define karna hai, taaki implementation me scope creep na ho.

## 2) Current Baseline (Already Built)
The following capabilities are already available in current system:
- Authentication and role checks
- Project creation by student teams
- Mentor assignment by admin
- Mentor review states for project lifecycle (assigned, rejected, approved, active)

Note:
- Existing project lifecycle statuses remain as-is.
- Tracker week lifecycle statuses are separate and will be added without breaking current project flow.

## 3) In Scope for Tracker Development
The following features are approved for tracker module:
- Weekly tracker generation per project duration
- Week state lifecycle and deadline lock
- Week submission (summary, blockers, next plan)
- Submission file attachments with version entries
- Mentor review on weekly submissions (approve/reject/comment)
- Resubmission flow for rejected weekly submissions
- Task management with Kanban statuses
- Milestone mapping to weeks
- Risk detection rules (missed weeks, repeated rejection, low activity signal)
- Project health score (weighted)
- Activity timeline for tracker events
- Role-based tracker dashboards (student, mentor, admin)
- Notification center for tracker events
- CSV/PDF export for progress snapshots

## 4) Out of Scope (Deferred)
The following are explicitly deferred to post-MVP phases:
- AI prediction engine for completion date
- Task dependency graph and critical path engine
- Full real-time collaboration threads and mentions at scale
- Complex cross-project portfolio forecasting
- Advanced peer-review workflow

## 5) MVP Boundary (Must Ship First)
Phase-1 tracker MVP must include:
- Week creation and status transitions
- Student weekly submission
- Mentor approve/reject/review comment
- Basic task board (todo, in_progress, review, done, blocked)
- Basic risk and health calculation
- Basic role dashboards

Anything outside this MVP boundary requires explicit change approval.

## 6) Non-Functional Targets
- Correctness: invalid state transitions must be blocked
- Security: role-based access on every tracker action
- Performance: project tracker page load target under 2 seconds for normal team size
- Auditability: every review action and status transition logged
- Maintainability: tracker logic in separate service modules

## 7) Governance Rules
- Change requests will be reviewed once per sprint
- No new feature enters current sprint without approval
- API contract changes require backward compatibility notes
- Status names are controlled vocabulary and cannot be changed ad hoc

## 8) Acceptance Criteria for Phase 0 Completion
Phase 0 is complete when:
- Scope is frozen (this document)
- Tracker workflow states are defined (see TRACKER_PHASE0_WORKFLOW_STATE_DEFINITIONS.md)
- MVP and deferred items are agreed by team

Status: COMPLETE
