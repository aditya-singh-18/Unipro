# Rejection History Feature - Implementation Summary

## Overview
Added a complete rejection history tracking system where all rejected projects are saved to the `project_rejection_history` table and displayed in the mentor's "Rejected" tab.

## Database Schema
### Table: `project_rejection_history`
- `rejection_id` (UUID primary key)
- `project_id` (foreign key to projects)
- `mentor_id` (varchar)
- `rejection_reason` (text)
- `mentor_feedback` (text)
- `rejected_at` (timestamp)
- `resubmitted` (boolean)
- `resubmitted_at` (timestamp)
- `created_at` (timestamp)

## Backend Changes

### 1. Repository Layer (`backend/src/repositories/project.repo.js`)

**New Functions:**
- `insertRejectionHistory()` - Saves rejection details to history table
- `markAsResubmitted()` - Updates resubmitted status when project is resubmitted
- `getRejectedProjectsFromHistory()` - Fetches all rejected projects for a mentor with JOIN

**Updated Functions:**
- `getProjectsAssignedToMentor()` - Now includes 'COMPLETED' status

### 2. Service Layer (`backend/src/services/project.service.js`)

**Updated: `mentorReviewProjectService()`**
- When action = 'REJECT':
  1. Saves to `project_rejection_history` table
  2. Updates project status to 'REJECTED'
  3. Sends notifications to team members

**Updated: `resubmitProjectService()`**
- Marks previous rejection as resubmitted in history table
- Sets `resubmitted = true` and `resubmitted_at = CURRENT_TIMESTAMP`

**Updated: `getMentorAssignedProjectsService()`**
- Fetches regular assigned projects (assigned, resubmitted, approved, completed)
- Fetches rejected projects from history table
- Combines both arrays and returns unified response

## API Endpoints

### GET `/project/mentor/assigned`
**Response includes:**
- Regular projects (ASSIGNED_TO_MENTOR, RESUBMITTED, APPROVED, COMPLETED)
- Rejected projects from history table with status = 'REJECTED'

**Rejected Project Format:**
```json
{
  "project_id": "CSE000009",
  "title": "Project Title",
  "description": "Project Description",
  "tech_stack": [...],
  "status": "REJECTED",
  "created_at": "2026-03-10T11:19:40",
  "approved_at": null,
  "rejection_reason": "MERI MARJI BHAI!",
  "mentor_feedback": "IMPROVE =KARO AI KA JAMANA HAI",
  "resubmitted": false,
  "resubmitted_at": null
}
```

## Frontend Integration

### Projects Page (`frontend/src/app/mentor/projects/page.tsx`)
Already configured to:
- Filter projects by status including 'REJECTED'
- Display rejected tab with count
- Show rejection details in table

The "Rejected" tab automatically displays projects from the rejection history.

## Flow Diagram

### 1. **Project Rejection Flow**
```
Mentor rejects project
    ↓
insertRejectionHistory() - saves to history table
    ↓
updateProjectStatusWithFeedback() - updates project status
    ↓
Notifications sent to team members
```

### 2. **Project Resubmission Flow**
```
Student resubmits rejected project
    ↓
markAsResubmitted() - updates history table
    ↓
resubmitProject() - updates project details and status
    ↓
Notifications sent based on mentor change request
```

### 3. **Display Rejected Projects Flow**
```
Mentor opens /mentor/projects
    ↓
getMentorAssignedProjectsService()
    ↓
getProjectsAssignedToMentor() + getRejectedProjectsFromHistory()
    ↓
Combined response sent to frontend
    ↓
Frontend filters by status and displays in "Rejected" tab
```

## Testing

### Test the API:
1. Login as mentor (MENTOR001)
2. Navigate to `/mentor/projects`
3. Click on "Rejected" tab
4. You should see the rejected project from history table

### Sample Data in DB:
```sql
-- Check rejection history
SELECT * FROM project_rejection_history WHERE mentor_id = 'MENTOR001';

-- Result:
-- project_id: CSE000009
-- rejection_reason: MERI MARJI BHAI!
-- mentor_feedback: IMPROVE =KARO AI KA JAMANA HAI  
-- rejected_at: 2026-03-10 11:19:40
-- resubmitted: false
```

## Key Features

✅ **Automatic History Tracking**: Every rejection is automatically saved to history table
✅ **Resubmission Tracking**: System knows which rejections were resubmitted
✅ **Unified API**: Single endpoint returns all project statuses including rejected
✅ **Frontend Ready**: UI already configured to display rejected projects
✅ **Preserves History**: Even if project is deleted, rejection history remains
✅ **Mentor-Specific**: Each mentor only sees their own rejections

## Benefits

1. **Complete Audit Trail**: Track all rejections with timestamps and feedback
2. **Resubmission Analytics**: Know which projects were resubmitted vs abandoned
3. **Mentor Performance**: Analyze rejection patterns and reasons
4. **Student Improvement**: Students can review past feedback even after resubmission
5. **Historical Data**: Maintain long-term rejection statistics

## Notes

- Rejection reason defaults to "No reason provided" if not specified
- Mentor feedback is optional but recommended
- Resubmitted status is automatically updated when student resubmits
- All existing resubmission logic remains unchanged
- History table grows over time - consider archiving old records periodically
