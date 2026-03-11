# Tracker Phase 0 - Workflow State Definitions

Date: 2026-03-11
Owner: Project Team
Module: Weekly Tracker Engine

## 1) Design Principle
Project lifecycle and tracker week lifecycle are different:
- Project lifecycle controls overall project approval and activation
- Tracker week lifecycle controls weekly execution and review

This document defines tracker-specific states only.

## 2) Week Lifecycle States
Controlled enum for each project week:
- pending
- submitted
- under_review
- approved
- rejected
- missed
- locked

## 3) State Meaning
- pending: week started but no submission done yet
- submitted: student has submitted weekly update
- under_review: mentor has opened review process
- approved: mentor accepted submission for this week
- rejected: mentor rejected; resubmission is allowed before lock
- missed: deadline passed without valid submission
- locked: week no longer editable

## 4) Allowed State Transitions
Allowed transitions only:
- pending -> submitted
- pending -> missed
- submitted -> under_review
- submitted -> approved
- submitted -> rejected
- under_review -> approved
- under_review -> rejected
- rejected -> submitted
- approved -> locked
- missed -> locked
- rejected -> locked

Blocked transitions examples:
- approved -> pending
- locked -> any other state
- missed -> approved directly

## 5) Transition Triggers
- pending -> submitted: student submits before deadline
- pending -> missed: deadline job runs and no submission exists
- submitted -> under_review: mentor opens review (optional intermediate)
- submitted/under_review -> approved: mentor approves
- submitted/under_review -> rejected: mentor rejects with comment
- rejected -> submitted: student resubmits before lock
- approved/missed/rejected -> locked: lock job executes after cutoff

## 6) Deadline and Lock Policy
- Each week has a deadline_at timestamp
- Submission allowed until deadline_at
- Grace window optional (default 0 hours)
- After cutoff, editable actions blocked and week becomes locked
- Admin override unlock is optional and must be audited

## 7) Submission Rules
- Student can submit only for own project week
- One active submission record per week, with revision versions
- Every resubmission increments revision_no
- Submission fields:
  - summary_of_work
  - blockers
  - next_week_plan
  - optional github_link_snapshot

## 8) Mentor Review Rules
- Mentor can review only assigned project weeks
- Rejection requires review comment
- Approval stores reviewed_at and reviewer id
- Review actions create immutable timeline events

## 9) Task Board Workflow States
Controlled enum for tasks:
- todo
- in_progress
- review
- done
- blocked

Task transition guardrails:
- todo -> in_progress
- in_progress -> review
- review -> done
- in_progress -> blocked
- blocked -> in_progress
- done is terminal unless reopened by mentor/admin action

## 10) Risk Levels and Rules (Baseline)
Risk levels:
- low
- medium
- high

Baseline rule set:
- low: 1 missed week or low activity in 1 week
- medium: 2 missed weeks or 2 consecutive rejected reviews
- high: 3 or more missed weeks, or medium risk + milestone overdue

## 11) Health Score Definition (Baseline)
Score range: 0 to 100

Weighted formula:
- task_completion_rate: 35%
- deadline_adherence: 25%
- review_acceptance_rate: 20%
- activity_signal_score: 20%

Formula:
health_score = 0.35 * task_completion_rate + 0.25 * deadline_adherence + 0.20 * review_acceptance_rate + 0.20 * activity_signal_score

## 12) Required Timeline Events
Every tracker action must write timeline log:
- week_created
- submission_created
- submission_resubmitted
- review_approved
- review_rejected
- week_marked_missed
- week_locked
- task_created
- task_status_changed
- risk_level_changed
- health_score_recalculated

## 13) API-Level Validation Requirements
- Reject unknown state values
- Reject invalid transition pair
- Enforce role guard before transition
- Enforce project ownership/assignment checks
- Return consistent error structure for failed transitions

## 14) Phase 0 Exit Criteria
Workflow definition accepted when:
- enums and transitions are approved
- lock/deadline policy approved
- risk and health baseline approved
- timeline event set approved

Status: COMPLETE
