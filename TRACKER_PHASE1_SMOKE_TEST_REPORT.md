# Tracker Phase 1 Smoke Test Report

Generated At: 2026-03-20T10:26:08.150Z
Base API: http://localhost:5000/api
Project ID: CSE000009

Summary: PASS=28, FAIL=0, SKIP=0

| Step | Status | Details |
|---|---|---|
| Preflight API reachability | PASS | API reachable at http://localhost:5000/api |
| Admin login | PASS | Token acquired |
| Student login | PASS | Token acquired |
| Mentor login | PASS | Token acquired |
| Admin bootstrap weeks | PASS | count=20 |
| Student list weeks | PASS | count=20 |
| Student create submission | PASS | Submitted/already submitted |
| Mentor list submissions | PASS | count=1 |
| Submission file upload metadata | PASS | file_id=10 |
| Submission file list | PASS | count=1 |
| Mentor reject submission | PASS | Rejected/already non-reviewable |
| Student resubmit week | PASS | Resubmitted |
| Resubmission file upload metadata | PASS | file_id=11 |
| Mentor approve submission | PASS | Approved |
| Create task | PASS | task_id=17 |
| Move task status | PASS | todo->in_progress |
| List project tasks | PASS | count=16 |
| Get project timeline | PASS | count=20 |
| Get current risk | PASS | Risk fetched |
| Recalculate risk snapshot | PASS | risk=medium |
| Get current health | PASS | Health fetched |
| Recalculate health snapshot | PASS | score=60.97 |
| Admin week status override | PASS | Week locked/transition-guard verified |
| Student dashboard | PASS | Fetched |
| Mentor dashboard | PASS | Fetched |
| Negative: unauthorized role returns 403 | PASS | HTTP 403 - Access denied |
| Negative: invalid transition returns 409 | PASS | HTTP 409 - Invalid task transition from todo to done |
| Admin dashboard | PASS | Fetched |

## Required Env Vars
- SMOKE_PROJECT_ID
- SMOKE_ADMIN_IDENTIFIER / SMOKE_ADMIN_PASSWORD
- SMOKE_STUDENT_IDENTIFIER / SMOKE_STUDENT_PASSWORD
- SMOKE_MENTOR_IDENTIFIER / SMOKE_MENTOR_PASSWORD
- Optional: SMOKE_BASE_API, SMOKE_TOTAL_WEEKS, SMOKE_START_DATE
