# Tracker Phase 1 Smoke Tests

Base URL: http://localhost:5000/api/tracker
Auth: Bearer token required for all endpoints

## Automated Runner (Recommended)
From `backend` folder:

`npm run smoke:tracker:phase1`

Windows one-command helper (auto-loads `.env.smoke` and creates it from example if missing):

`npm run smoke:tracker:phase1:ps`

You can also create `backend/.env.smoke`; the Node runner auto-loads it.

Required env vars:
- SMOKE_PROJECT_ID
- SMOKE_ADMIN_IDENTIFIER
- SMOKE_ADMIN_PASSWORD
- SMOKE_STUDENT_IDENTIFIER
- SMOKE_STUDENT_PASSWORD
- SMOKE_MENTOR_IDENTIFIER
- SMOKE_MENTOR_PASSWORD

Optional env vars:
- SMOKE_BASE_API (default: http://localhost:5000/api)
- SMOKE_TOTAL_WEEKS (default: 20)
- SMOKE_START_DATE (default: 2026-03-17)
- SMOKE_ASSIGN_TO (task assignee user key)

Generated report:
- TRACKER_PHASE1_SMOKE_TEST_REPORT.md

Runner preflight checks:
- validates all required SMOKE_* env vars
- validates API reachability before login and test execution

## 1) Admin - Bootstrap weeks
POST /projects/:projectId/weeks/bootstrap

Body:
{
  "totalWeeks": 20,
  "startDate": "2026-03-17",
  "phasePlan": [
    { "phase_name": "Ideation", "start_week": 1, "end_week": 2 },
    { "phase_name": "Development", "start_week": 3, "end_week": 15 },
    { "phase_name": "Testing", "start_week": 16, "end_week": 18 },
    { "phase_name": "Final", "start_week": 19, "end_week": 20 }
  ]
}

## 2) Student/Mentor/Admin - List weeks
GET /projects/:projectId/weeks

## 2.1) Admin - Week status override
PATCH /weeks/:weekId/status

Body:
{
  "status": "locked",
  "reason": "Week closed after mentor/admin review cycle"
}

## 3) Student - Create submission
POST /weeks/:weekId/submissions

Body:
{
  "summaryOfWork": "Implemented auth APIs and fixed dashboard issue",
  "blockers": "Pending integration with analytics service",
  "nextWeekPlan": "Complete integration and write tests",
  "githubLinkSnapshot": "https://github.com/org/repo/pull/123"
}

## 3.1) Submission files metadata
Upload file metadata:
POST /submissions/:submissionId/files

Body:
{
  "fileName": "week-3-demo.mp4",
  "fileUrl": "https://storage.example.com/week-3-demo.mp4",
  "mimeType": "video/mp4",
  "fileSizeBytes": 24576000
}

List submission files:
GET /submissions/:submissionId/files

## 4) Mentor - Review submission
POST /submissions/:submissionId/review

Runtime note:
- During mentor review flow, week may pass through `under_review` state before final `approved/rejected`.

Body (approve):
{
  "action": "approve",
  "reviewComment": "Good progress"
}

Body (reject):
{
  "action": "reject",
  "reviewComment": "Testing evidence missing"
}

## 5) Student - Resubmit rejected week
POST /weeks/:weekId/submissions/resubmit

Body:
{
  "summaryOfWork": "Added test report and fixed QA comments",
  "blockers": "None",
  "nextWeekPlan": "Start milestone 2 tasks",
  "githubLinkSnapshot": "https://github.com/org/repo/pull/127"
}

## 6) Task flow
Create task:
POST /projects/:projectId/tasks

Body:
{
  "title": "Implement week dashboard",
  "description": "Build project week cards and progress chips",
  "priority": "high",
  "assignedToUserKey": "STU2026001",
  "dueDate": "2026-03-25"
}

List tasks:
GET /projects/:projectId/tasks?status=in_progress

Update task status:
PATCH /tasks/:taskId/status

Body:
{
  "status": "review"
}

## 7) Timeline and snapshots
GET /projects/:projectId/timeline?page=1&pageSize=20
GET /projects/:projectId/risk/current
POST /projects/:projectId/risk/recalculate
GET /projects/:projectId/health/current
POST /projects/:projectId/health/recalculate

## 8) Dashboard endpoints
Student dashboard:
GET /dashboard/student

Mentor dashboard:
GET /dashboard/mentor

Admin dashboard:
GET /dashboard/admin

## 9) Negative scenarios (automated)
- Unauthorized role check:
  - Mentor token calling `/tracker/dashboard/student` must return 403.
- Invalid task transition check:
  - `todo -> done` direct move must return 409.
