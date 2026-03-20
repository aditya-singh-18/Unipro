# ProTrack Tracker Enhancement API Documentation

This document describes the new API endpoints added for the ProTrack tracker enhancement feature.

## Base URL
All endpoints are prefixed with `/api/tracker`

## Authentication
All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

---

## Daily Logs

### Create Daily Log
**POST** `/api/tracker/projects/:projectId/daily-logs`

Creates or updates a daily log for a student. One log per student per project per day.

**Authorization:** STUDENT only

**URL Parameters:**
- `projectId` (string, required) - Project ID

**Request Body:**
```json
{
  "taskId": "123",                    // optional, BIGINT
  "weekId": "456",                    // optional, BIGINT
  "logDate": "2026-03-20",           // optional, defaults to today
  "whatIDid": "Completed authentication module",  // required, min 10 chars
  "whatIWillDo": "Start working on dashboard",     // required
  "blockers": "Need API keys from mentor",         // optional
  "tag": "progress",                  // optional, default: progress
                                      // valid: progress, done, fix, review, blocker, meeting
  "commitCount": 3,                   // optional, default: 0
  "commitLink": "https://github.com/org/repo/commit/abc123",  // optional
  "hoursSpent": 5.5                   // optional, 0-24
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Daily log created successfully",
  "log": {
    "log_id": "uuid",
    "student_user_key": "STU001",
    "project_id": "proj-123",
    "task_id": 123,
    "week_id": 456,
    "log_date": "2026-03-20",
    "what_i_did": "Completed authentication module",
    "what_i_will_do": "Start working on dashboard",
    "blockers": "Need API keys from mentor",
    "tag": "progress",
    "commit_count": 3,
    "commit_link": "https://github.com/org/repo/commit/abc123",
    "hours_spent": 5.5,
    "is_late": false,
    "ai_summary": null,
    "created_at": "2026-03-20T10:30:00Z"
  }
}
```

---

### Get Daily Logs
**GET** `/api/tracker/projects/:projectId/daily-logs`

Retrieves daily logs for a project.

**Authorization:** STUDENT, MENTOR, ADMIN

**URL Parameters:**
- `projectId` (string, required) - Project ID

**Query Parameters:**
- `studentUserKey` (string, optional) - Filter by student (mentors/admins only)
- `startDate` (date, optional) - Filter from date (YYYY-MM-DD)
- `endDate` (date, optional) - Filter to date (YYYY-MM-DD)
- `limit` (number, optional) - Max results, default: 50

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "logs": [
    {
      "log_id": "uuid",
      "student_user_key": "STU001",
      "project_id": "proj-123",
      "log_date": "2026-03-20",
      "what_i_did": "Completed authentication module",
      "what_i_will_do": "Start working on dashboard",
      "tag": "progress",
      "hours_spent": 5.5,
      "created_at": "2026-03-20T10:30:00Z"
    }
  ]
}
```

---

### Delete Daily Log
**DELETE** `/api/tracker/daily-logs/:logId`

Deletes a daily log. Students can only delete their own logs.

**Authorization:** STUDENT, MENTOR, ADMIN

**URL Parameters:**
- `logId` (uuid, required) - Log ID

**Response (200):**
```json
{
  "success": true,
  "message": "Daily log deleted successfully"
}
```

---

## Progress Scores

### Calculate Progress Score
**POST** `/api/tracker/projects/:projectId/progress-scores/calculate`

Calculates and stores progress score for a student for a specific week.

**Authorization:** MENTOR, ADMIN only

**URL Parameters:**
- `projectId` (string, required) - Project ID

**Request Body:**
```json
{
  "studentUserKey": "STU001",  // required
  "weekNumber": 5              // required
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Progress score calculated successfully",
  "score": {
    "score_id": "uuid",
    "student_user_key": "STU001",
    "project_id": "proj-123",
    "week_number": 5,
    "git_score": 20,           // out of 30
    "task_score": 25,          // out of 35
    "submission_score": 20,    // out of 25
    "log_score": 8,            // out of 10
    "total_score": 73,         // out of 100
    "progress_pct": 73,        // 0-100
    "streak_days": 5,
    "risk_level": "low",       // low, medium, high, critical
    "days_since_commit": 1,
    "overdue_task_count": 0,
    "calculated_at": "2026-03-20T10:30:00Z"
  }
}
```

---

### Get Progress Scores
**GET** `/api/tracker/projects/:projectId/progress-scores`

Retrieves progress scores for a project.

**Authorization:** STUDENT, MENTOR, ADMIN

**URL Parameters:**
- `projectId` (string, required) - Project ID

**Query Parameters:**
- `studentUserKey` (string, optional) - Filter by student (mentors/admins only)
- `weekNumber` (number, optional) - Filter by week

**Response (200):**
```json
{
  "success": true,
  "count": 1,
  "scores": [
    {
      "score_id": "uuid",
      "student_user_key": "STU001",
      "project_id": "proj-123",
      "week_number": 5,
      "git_score": 20,
      "task_score": 25,
      "submission_score": 20,
      "log_score": 8,
      "total_score": 73,
      "progress_pct": 73,
      "risk_level": "low",
      "calculated_at": "2026-03-20T10:30:00Z"
    }
  ]
}
```

---

### Get Latest Progress Score
**GET** `/api/tracker/projects/:projectId/progress-scores/latest/:studentUserKey`

Retrieves the latest progress score for a specific student.

**Authorization:** STUDENT, MENTOR, ADMIN

**URL Parameters:**
- `projectId` (string, required) - Project ID
- `studentUserKey` (string, required) - Student user key

**Response (200):**
```json
{
  "success": true,
  "score": {
    "score_id": "uuid",
    "student_user_key": "STU001",
    "project_id": "proj-123",
    "week_number": 5,
    "total_score": 73,
    "progress_pct": 73,
    "risk_level": "low",
    "calculated_at": "2026-03-20T10:30:00Z"
  }
}
```

---

## GitHub Commits

### Create GitHub Commit
**POST** `/api/tracker/projects/:projectId/github-commits`

Records a GitHub commit for tracking. Duplicate SHA values are ignored.

**Authorization:** MENTOR, ADMIN only

**URL Parameters:**
- `projectId` (string, required) - Project ID

**Request Body:**
```json
{
  "studentUserKey": "STU001",           // optional, defaults to requester
  "sha": "abc123def456...",             // required, 40 hex chars
  "message": "Fix authentication bug",   // optional
  "committedAt": "2026-03-20T10:30:00Z", // required, ISO 8601
  "branch": "main",                      // optional
  "additions": 25,                       // optional, default: 0
  "deletions": 10,                       // optional, default: 0
  "isMergeCommit": false                 // optional, default: false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "GitHub commit created successfully",
  "commit": {
    "commit_id": "uuid",
    "student_user_key": "STU001",
    "project_id": "proj-123",
    "sha": "abc123def456...",
    "message": "Fix authentication bug",
    "committed_at": "2026-03-20T10:30:00Z",
    "branch": "main",
    "additions": 25,
    "deletions": 10,
    "is_merge_commit": false,
    "created_at": "2026-03-20T10:35:00Z"
  }
}
```

---

### Get GitHub Commits
**GET** `/api/tracker/projects/:projectId/github-commits`

Retrieves GitHub commits for a project.

**Authorization:** STUDENT, MENTOR, ADMIN

**URL Parameters:**
- `projectId` (string, required) - Project ID

**Query Parameters:**
- `studentUserKey` (string, optional) - Filter by student (mentors/admins only)
- `startDate` (datetime, optional) - Filter from date (ISO 8601)
- `endDate` (datetime, optional) - Filter to date (ISO 8601)
- `limit` (number, optional) - Max results, default: 100

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "commits": [
    {
      "commit_id": "uuid",
      "student_user_key": "STU001",
      "project_id": "proj-123",
      "sha": "abc123def456...",
      "message": "Fix authentication bug",
      "committed_at": "2026-03-20T10:30:00Z",
      "branch": "main",
      "additions": 25,
      "deletions": 10,
      "is_merge_commit": false
    }
  ]
}
```

---

## Mentor Feedback

### Create Mentor Feedback
**POST** `/api/tracker/projects/:projectId/mentor-feedback`

Creates feedback from mentor to student.

**Authorization:** MENTOR only

**URL Parameters:**
- `projectId` (string, required) - Project ID

**Request Body:**
```json
{
  "studentUserKey": "STU001",            // required
  "referenceType": "submission",          // optional: submission, task, general
  "referenceId": "12345",                 // optional, reference to submission/task
  "message": "Great work on the authentication module!", // required, min 5 chars
  "rating": 4                             // optional, 1-5
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Mentor feedback created successfully",
  "feedback": {
    "feedback_id": "uuid",
    "mentor_employee_id": "EMP001",
    "student_user_key": "STU001",
    "project_id": "proj-123",
    "reference_type": "submission",
    "reference_id": "12345",
    "message": "Great work on the authentication module!",
    "rating": 4,
    "is_read": false,
    "student_reply": null,
    "created_at": "2026-03-20T10:30:00Z"
  }
}
```

---

### Get Mentor Feedback
**GET** `/api/tracker/projects/:projectId/mentor-feedback`

Retrieves mentor feedback for a project.

**Authorization:** STUDENT, MENTOR, ADMIN
- Students see only their own feedback
- Mentors see only feedback they created
- Admins see all feedback

**URL Parameters:**
- `projectId` (string, required) - Project ID

**Query Parameters:**
- `studentUserKey` (string, optional) - Filter by student (admins only)
- `mentorEmployeeId` (string, optional) - Filter by mentor (admins only)
- `limit` (number, optional) - Max results, default: 50

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "feedback": [
    {
      "feedback_id": "uuid",
      "mentor_employee_id": "EMP001",
      "student_user_key": "STU001",
      "project_id": "proj-123",
      "reference_type": "submission",
      "reference_id": "12345",
      "message": "Great work on the authentication module!",
      "rating": 4,
      "is_read": true,
      "student_reply": "Thank you for the feedback!",
      "created_at": "2026-03-20T10:30:00Z"
    }
  ]
}
```

---

### Mark Feedback as Read
**PATCH** `/api/tracker/mentor-feedback/:feedbackId/read`

Marks feedback as read by the student.

**Authorization:** STUDENT only (can only mark their own feedback)

**URL Parameters:**
- `feedbackId` (uuid, required) - Feedback ID

**Response (200):**
```json
{
  "success": true,
  "message": "Feedback marked as read",
  "feedback": {
    "feedback_id": "uuid",
    "is_read": true
  }
}
```

---

### Reply to Feedback
**PATCH** `/api/tracker/mentor-feedback/:feedbackId/reply`

Adds a student reply to mentor feedback.

**Authorization:** STUDENT only (can only reply to their own feedback)

**URL Parameters:**
- `feedbackId` (uuid, required) - Feedback ID

**Request Body:**
```json
{
  "studentReply": "Thank you for the feedback! I will work on improving."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Reply added successfully",
  "feedback": {
    "feedback_id": "uuid",
    "mentor_employee_id": "EMP001",
    "student_user_key": "STU001",
    "project_id": "proj-123",
    "message": "Great work on the authentication module!",
    "student_reply": "Thank you for the feedback! I will work on improving.",
    "is_read": true,
    "created_at": "2026-03-20T10:30:00Z"
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "whatIDid must be at least 10 characters long"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You are not authorized to access this project tracker"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Project not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Notes

1. **Authentication**: All endpoints require valid JWT token in Authorization header
2. **Authorization**: Access is role-based (STUDENT, MENTOR, ADMIN)
3. **Input Sanitization**: All string inputs are sanitized for XSS prevention
4. **URL Validation**: URLs are validated against a whitelist of allowed domains
5. **Unique Constraints**:
   - Daily logs: One per student per project per day
   - Progress scores: One per student per project per week
   - GitHub commits: Unique by SHA
6. **Cascade Deletion**: Deleting a project/user cascades to related records
7. **Timestamps**: All dates/times are in ISO 8601 format (UTC)
