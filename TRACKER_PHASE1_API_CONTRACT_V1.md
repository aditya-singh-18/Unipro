# Tracker Phase 1 API Contract v1

Date: 2026-03-11
Status: Draft for implementation

## 0) Workflow State Machine (Phase 1 Baseline)
- Canonical flow:
  - pending -> submitted -> reviewed -> approved/rejected -> locked/missed
- API/runtime mapping used in implementation:
  - reviewed is represented by `under_review` during processing.
  - final review outcome sets week to `approved` or `rejected`.
  - `locked` and `missed` are terminal week states.

## 0.1) Resubmission Rules (Phase 1)
- Resubmission is allowed only after reject.
- Allowed when:
  - week status is `rejected`
  - week is not `locked`
  - week is not `missed`
- Disallowed when:
  - week is closed by mentor/admin override and moved to `locked` or `missed`
  - deadline lock rule has already closed the week

## 1) Base Rules
- Auth required for all endpoints
- Role checks must be enforced in middleware + service layer
- Response shape:
  - success: boolean
  - message: string
  - data: object or array (optional)

## 2) Weekly Tracker APIs

### Create project weeks
- Method: POST
- Path: /tracker/projects/:projectId/weeks/bootstrap
- Roles: admin
- Body:
  - totalWeeks: number
  - startDate: string (ISO date)
  - phasePlan: array (optional)
- Output:
  - createdWeeks: number

### Get project weeks
- Method: GET
- Path: /tracker/projects/:projectId/weeks
- Roles: student, mentor, admin
- Output:
  - weeks: [{ week_id, week_number, status, deadline_at, phase_name }]

### Update week status (admin override)
- Method: PATCH
- Path: /tracker/weeks/:weekId/status
- Roles: admin
- Body:
  - status: pending|submitted|under_review|approved|rejected|missed|locked
  - reason: string

## 3) Submission APIs

### Create weekly submission
- Method: POST
- Path: /tracker/weeks/:weekId/submissions
- Roles: student
- Body:
  - summaryOfWork: string
  - blockers: string
  - nextWeekPlan: string
  - githubLinkSnapshot: string (optional)
- Output:
  - submission_id
  - revision_no
  - week_status

### Resubmit weekly submission
- Method: POST
- Path: /tracker/weeks/:weekId/submissions/resubmit
- Roles: student
- Body: same as create submission
- Rules:
  - Allowed only if week status = rejected and week is not locked

### Get submissions for week
- Method: GET
- Path: /tracker/weeks/:weekId/submissions
- Roles: student, mentor, admin
- Output:
  - submissions with revisions

## 4) File APIs

### Upload submission file
- Method: POST
- Path: /tracker/submissions/:submissionId/files
- Roles: student
- Body:
  - fileName
  - fileUrl
  - mimeType
  - fileSizeBytes
- Output:
  - file_id
  - version_no

### List submission files
- Method: GET
- Path: /tracker/submissions/:submissionId/files
- Roles: student, mentor, admin

## 5) Mentor Review APIs

### Review weekly submission
- Method: POST
- Path: /tracker/submissions/:submissionId/review
- Roles: mentor
- Body:
  - action: approve|reject
  - reviewComment: string
- Rules:
  - reject requires comment
  - mentor must be assigned to project

### Get review history for week
- Method: GET
- Path: /tracker/weeks/:weekId/reviews
- Roles: mentor, admin, student (read-only for own project)

## 6) Task and Kanban APIs

### Create task
- Method: POST
- Path: /tracker/projects/:projectId/tasks
- Roles: student, mentor, admin
- Body:
  - title
  - description
  - priority
  - assignedToUserKey
  - dueDate
  - weekId (optional)

### List project tasks
- Method: GET
- Path: /tracker/projects/:projectId/tasks
- Roles: student, mentor, admin
- Query:
  - status
  - assignedTo
  - weekId

### Update task status
- Method: PATCH
- Path: /tracker/tasks/:taskId/status
- Roles: student, mentor, admin
- Body:
  - status: todo|in_progress|review|done|blocked

## 7) Risk and Health APIs

### Get current project risk
- Method: GET
- Path: /tracker/projects/:projectId/risk/current
- Roles: student, mentor, admin

### Recalculate project risk (manual)
- Method: POST
- Path: /tracker/projects/:projectId/risk/recalculate
- Roles: mentor, admin
- Status: implemented in Phase 1 hardening pass

### Get current project health
- Method: GET
- Path: /tracker/projects/:projectId/health/current
- Roles: student, mentor, admin

### Recalculate health (manual)
- Method: POST
- Path: /tracker/projects/:projectId/health/recalculate
- Roles: mentor, admin
- Status: implemented in Phase 1 hardening pass

## 8) Timeline APIs

### Get project activity timeline
- Method: GET
- Path: /tracker/projects/:projectId/timeline
- Roles: student, mentor, admin
- Query:
  - page
  - pageSize
  - eventType

## 9) Dashboard APIs

### Student tracker dashboard
- Method: GET
- Path: /tracker/dashboard/student
- Roles: student

### Mentor tracker dashboard
- Method: GET
- Path: /tracker/dashboard/mentor
- Roles: mentor

### Admin tracker dashboard
- Method: GET
- Path: /tracker/dashboard/admin
- Roles: admin

## 9.1) Notification Domain Coverage (Phase 1)
- Weekly review decisions must trigger notifications for project students.
- Reused notification APIs:
  - GET /notification/my
  - GET /notification/unread-count
  - PATCH /notification/:notificationId/read
  - PATCH /notification/read-all
- Trigger points from tracker flow:
  - submission approved by mentor
  - submission rejected by mentor (with comment)

## 10) Validation and Error Codes
- 400: invalid payload or invalid state transition
- 401: unauthenticated
- 403: role/ownership violation
- 404: resource not found
- 409: transition conflict or lock conflict
- 500: unexpected server error

## 11) Required Timeline Events
The following events must be inserted in project_activity_timeline:
- week_created
- submission_created
- submission_resubmitted
- review_started
- review_approved
- review_rejected
- week_marked_missed
- week_locked
- task_created
- task_status_changed
- risk_level_changed
- health_score_recalculated
