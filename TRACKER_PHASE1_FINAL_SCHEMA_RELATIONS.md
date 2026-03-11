# Tracker Phase 1 Final Schema and Relations

Date: 2026-03-11
Status: Finalized (Phase 1)
Migration Source: backend/migrations/20260311_tracker_phase1_schema.sql

## 1) Core Domain Tables

- project_weeks
  - Purpose: Per-project weekly tracking lifecycle.
  - Key fields: week_id, project_id, week_number, phase_name, status, deadline_at.
  - Constraints:
    - UNIQUE (project_id, week_number)
    - status IN (pending, submitted, under_review, approved, rejected, missed, locked)

- week_submissions
  - Purpose: Revisioned weekly submissions.
  - Key fields: submission_id, week_id, project_id, revision_no, submitted_by_user_key.
  - Constraints:
    - UNIQUE (week_id, revision_no)

- week_submission_files
  - Purpose: Attachment/version metadata per submission.
  - Key fields: file_id, submission_id, version_no, file_name, file_url.
  - Constraints:
    - UNIQUE (submission_id, version_no, file_name)

- week_reviews
  - Purpose: Mentor review actions for submissions.
  - Key fields: review_id, submission_id, week_id, project_id, reviewer_employee_id, action.
  - Constraints:
    - action IN (approve, reject)

- project_tasks
  - Purpose: Kanban-style tracker tasks.
  - Key fields: task_id, project_id, week_id, title, priority, status, assigned_to_user_key.
  - Constraints:
    - priority IN (low, medium, high, critical)
    - status IN (todo, in_progress, review, done, blocked)

- project_risk_snapshots
  - Purpose: Risk scoring snapshots by project.
  - Key fields: risk_snapshot_id, project_id, risk_level, risk_reasons.
  - Constraints:
    - risk_level IN (low, medium, high)

- project_health_snapshots
  - Purpose: Health score snapshots and factors.
  - Key fields: health_snapshot_id, project_id, health_score, derived rates.
  - Constraints:
    - health_score BETWEEN 0 and 100

- project_activity_timeline
  - Purpose: Immutable tracker event stream/audit log.
  - Key fields: timeline_id, project_id, week_id, event_type, actor_user_key, actor_role, meta.

## 2) Supporting Table

- project_milestones
  - Purpose: milestone checkpoints aligned to project weeks.
  - Included in migration for forward compatibility.

## 3) FK Relations

- project_weeks.project_id -> projects.project_id
- week_submissions.week_id -> project_weeks.week_id
- week_submissions.project_id -> projects.project_id
- week_submissions.submitted_by_user_key -> users.user_key
- week_submission_files.submission_id -> week_submissions.submission_id
- week_submission_files.uploaded_by_user_key -> users.user_key
- week_reviews.submission_id -> week_submissions.submission_id
- week_reviews.week_id -> project_weeks.week_id
- week_reviews.project_id -> projects.project_id
- week_reviews.reviewer_employee_id -> mentor_profiles.employee_id
- project_tasks.project_id -> projects.project_id
- project_tasks.week_id -> project_weeks.week_id
- project_tasks.assigned_to_user_key -> users.user_key
- project_tasks.created_by_user_key -> users.user_key
- project_risk_snapshots.project_id -> projects.project_id
- project_health_snapshots.project_id -> projects.project_id
- project_activity_timeline.project_id -> projects.project_id
- project_activity_timeline.week_id -> project_weeks.week_id
- project_activity_timeline.actor_user_key -> users.user_key
- project_milestones.project_id -> projects.project_id

## 4) Lifecycle Mapping

Phase 1 lifecycle baseline:
- pending -> submitted -> reviewed -> approved/rejected -> locked/missed

Implementation mapping:
- reviewed is represented as under_review state in DB/API runtime.

Resubmission rule:
- allowed only from rejected state, until week becomes locked/missed.

## 5) Notifications Coverage

Notification persistence is handled by existing notifications table and service.
Tracker emits notifications on review decisions (approve/reject) to student members.

## 6) Indexing Notes

Phase 1 schema includes indexes for:
- project and week lookups
- task status/assignee filters
- submission/review chronology
- timeline pagination and filtering
- risk/health recency lookups

This is sufficient for MVP traffic and analytics cards in dashboards.
