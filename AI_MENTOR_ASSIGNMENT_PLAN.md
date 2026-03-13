# AI Mentor Assignment Plan

## Objective

Build an intelligent mentor assignment system that assigns the best mentor to a newly submitted student project based on:

- project track
- submitted tech stack
- mentor primary and secondary tracks
- mentor declared skills
- mentor proficiency
- mentor current workload
- admin-controlled assignment mode

The system must support two modes:

1. Auto Assign Mode
   New project is submitted and the system directly assigns the best mentor.
2. Recommendation Mode
   New project is submitted, the system generates ranked mentor recommendations, and admin approves the final assignment.

## Important Product Decision

For v1, this should not be an LLM-first system.

Use a deterministic scoring engine first. It will be faster, cheaper, easier to debug, and easier to trust in admin workflows. If needed later, an AI or ML layer can be added for ranking refinement, conflict detection, or better matching from project descriptions.

Recommended approach:

- v1: rule-based scoring engine
- v2: hybrid AI ranking using historical assignment outcomes

## Current Reusable System Pieces

The current codebase already has the foundations needed for this feature:

- student project submission flow exists in `backend/src/services/project.service.js`
- manual mentor assignment exists through `/project/admin/assign-mentor`
- mentor profile and mentor skills already exist in `backend/src/services/mentor.service.js`
- track to tech-stack taxonomy already exists in `frontend/src/constants/track-tech.ts`
- admin settings pattern already exists in `frontend/src/app/admin/settings/page.tsx`

This means the new system should be built on top of the current assignment flow, not as a separate module.

## Functional Requirements

### 1. Assignment Modes

Admin must be able to choose one of these modes:

- `manual_only`
- `recommendation_required`
- `auto_assign`

Behavior:

- `manual_only`: current system continues unchanged
- `recommendation_required`: recommendations are generated automatically, admin approves one mentor
- `auto_assign`: system automatically assigns the top-ranked mentor if confidence is above threshold

### 2. Recommendation Output

For every submitted project, the system should generate:

- ranked mentor list
- recommendation score
- explanation for ranking
- workload snapshot at time of recommendation
- assignment decision source

Decision source values:

- `manual`
- `recommended_admin_approved`
- `auto_assigned`
- `fallback_manual`

### 3. Admin Controls

Admin should be able to:

- turn auto mode on or off
- configure minimum score threshold for auto assignment
- configure maximum active projects per mentor
- exclude a mentor from auto assignment temporarily
- view recommendation reasons before approval
- override any system recommendation

### 4. Safety Rules

System must never auto-assign if:

- no active mentor is available
- top score is below threshold
- mentor already crossed max workload
- mentor is inactive
- project data is incomplete
- project already has a mentor

In these cases, system should fall back to recommendation queue for admin review.

## Data Required

### Project Side

Already mostly available:

- project_id
- title
- description
- track
- tech_stack
- status
- created_at

Useful optional additions for later:

- normalized_tech_stack
- project_complexity
- team_size

### Mentor Side

Already available or partially available:

- employee_id
- is_active
- primary_track
- secondary_tracks
- mentor_skills
- proficiency_level
- assigned project count

Recommended new fields:

- `available_for_assignment boolean default true`
- `max_active_projects integer default 5`
- `assignment_priority integer default 100`
- `last_assigned_at timestamp null`

### System Settings

Recommended new settings:

- `mentor_assignment_mode`
- `mentor_auto_assign_threshold`
- `mentor_default_max_active_projects`
- `mentor_recommendation_top_n`
- `mentor_load_balance_enabled`

## Recommended Database Changes

### 1. Extend Mentor Profile Table

Add fields to mentor profile or a companion table:

- `available_for_assignment`
- `max_active_projects`
- `assignment_priority`
- `last_assigned_at`

### 2. Create Assignment Settings Storage

Store these in the same admin settings mechanism or policy table pattern already used by tracker settings.

Keys to add:

- `mentor_assignment_mode`
- `mentor_auto_assign_threshold`
- `mentor_recommendation_top_n`
- `mentor_default_max_active_projects`
- `mentor_load_balance_enabled`

### 3. Create Recommendation Audit Table

Suggested table: `mentor_assignment_recommendations`

Columns:

- `id`
- `project_id`
- `mentor_employee_id`
- `rank_position`
- `score`
- `track_score`
- `tech_score`
- `proficiency_score`
- `workload_score`
- `reason_json`
- `created_at`
- `is_selected`

### 4. Create Assignment Audit Table

Suggested table: `mentor_assignment_audit`

Columns:

- `id`
- `project_id`
- `mentor_employee_id`
- `decision_source`
- `recommended_score`
- `approved_by`
- `auto_assigned`
- `notes`
- `created_at`

This is important for future analytics and model improvement.

## Matching Engine Design

### Input

- project track
- project tech stack array
- project description optional
- all active mentors with skills and workload

### Output

- sorted mentor recommendations
- confidence score
- human-readable reasons

### Suggested v1 Scoring Formula

Use a weighted score out of 100.

- Track match: 35
- Tech stack overlap: 35
- Proficiency level: 15
- Workload balance: 10
- Recency fairness bonus: 5

Example breakdown:

- exact primary track match: 35
- secondary track match: 25
- same track through skills only: 20
- exact tech stack overlap: proportional to overlap count up to 35
- proficiency:
  - expert: 15
  - advanced: 12
  - intermediate: 8
  - beginner: 4
- workload score:
  - lower active load gets higher points
- fairness bonus:
  - mentor not recently assigned gets small bonus

### Suggested Hard Filters Before Scoring

Exclude mentors when:

- `is_active = false`
- `available_for_assignment = false`
- workload >= max_active_projects
- no track match and no tech overlap

### Example Recommendation Reason

```json
{
  "trackMatch": "Primary track matches WEB",
  "techMatches": ["React", "Next.js", "TypeScript"],
  "proficiency": "ADVANCED",
  "currentLoad": 2,
  "fairnessNote": "Not assigned in last 5 days"
}
```

## Service Architecture

### New Backend Services

#### 1. `mentorAssignmentSettings.service.js`

Responsibilities:

- get settings
- update settings
- provide defaults with migration-safe fallbacks

#### 2. `mentorRecommendation.service.js`

Responsibilities:

- fetch candidate mentors
- normalize project tech stack
- compute score per mentor
- return ranked recommendations
- persist recommendation snapshot

#### 3. `mentorAssignmentOrchestrator.service.js`

Responsibilities:

- called after project create and resubmit
- read assignment mode
- if auto mode and score passes threshold, assign directly
- otherwise create recommendation entries
- create audit log
- trigger notifications

## API Plan

### Admin APIs

#### Get assignment settings

- `GET /admin/mentor-assignment/settings`

#### Update assignment settings

- `PUT /admin/mentor-assignment/settings`

#### Get recommendations for a project

- `GET /project/admin/:projectId/mentor-recommendations`

#### Approve recommendation

- `POST /project/admin/approve-recommended-mentor`

Payload:

```json
{
  "projectId": "TEAM001",
  "mentorEmployeeId": "EMP101"
}
```

### Project Submission Flow APIs

No new student-facing API is strictly required if orchestration is triggered inside existing create and resubmit services.

## Integration Points In Current Codebase

### 1. Project Creation Hook

Integrate after project creation in:

- `backend/src/services/project.service.js`

After `insertProject(...)`, call the orchestrator.

### 2. Resubmission Hook

Integrate in:

- `backend/src/services/project.service.js`

When a rejected project is resubmitted, the system should recompute mentor recommendation. This is important because tech stack or track may have changed.

### 3. Manual Assignment Reuse

Do not duplicate assignment logic.

Reuse the existing assignment function:

- `adminAssignMentorService`
- `assignMentorToProject`

Auto mode should internally call the same assignment path or a shared lower-level helper, so all notifications and status updates remain consistent.

## Frontend Plan

### 1. Admin Settings Page

Extend the existing settings page with a new section:

- assignment mode selector
- auto assign threshold input
- top N recommendation size
- load balancing toggle

Suggested location:

- `frontend/src/app/admin/settings/page.tsx`

### 2. Admin Projects Page

For projects waiting on recommendation approval, show:

- top recommended mentor
- score badge
- why this mentor was recommended
- button to approve
- button to open full recommendation list

Suggested locations:

- `frontend/src/app/admin/projects/page.tsx`
- `frontend/src/components/modals/MentorSelectionModal.tsx`

The current mentor selection modal can be enhanced instead of replaced.

### 3. Student Experience

Student should see one of these statuses after submission:

- `Pending mentor assignment`
- `Mentor recommended, awaiting admin approval`
- `Mentor assigned`

This avoids confusion after project submission.

## Notifications Plan

### In Auto Assign Mode

- notify students that mentor has been assigned
- notify mentor about new assigned project
- notify admin optionally that auto assignment occurred

### In Recommendation Mode

- notify admin that a recommendation is pending approval
- notify students that project is under mentor matching review

## Rollout Plan

### Phase 1. Core Rule Engine

Build deterministic scoring engine and recommendation persistence.

Deliverables:

- scoring utility
- recommendation table
- audit table
- admin recommendation API

### Phase 2. Admin Recommendation Workflow

Build recommendation approval UI.

Deliverables:

- admin settings section
- project recommendation cards
- approve recommended mentor flow

### Phase 3. Auto Assign Mode

Enable direct auto assignment with threshold and safety fallback.

Deliverables:

- settings toggle
- orchestrator in create and resubmit flow
- notifications

### Phase 4. Analytics and Improvement

Track assignment quality.

Deliverables:

- acceptance rate of recommendations
- mentor workload distribution
- approval and rejection ratios
- average review completion time by mentor

## Recommended Timeline

### Week 1

- finalize requirements
- lock scoring formula
- define database changes

### Week 2

- backend recommendation engine
- settings service
- recommendation APIs

### Week 3

- admin UI for recommendations and settings
- audit logs
- notifications

### Week 4

- auto assign integration
- testing
- phased rollout

## Testing Strategy

### Unit Tests

- mentor scoring function
- track match logic
- tech stack overlap logic
- threshold fallback logic

### Integration Tests

- create project in `manual_only`
- create project in `recommendation_required`
- create project in `auto_assign`
- resubmit project and verify recommendation refresh
- inactive mentor exclusion
- overloaded mentor exclusion

### UAT Scenarios

- exact track and exact stack match
- same track but partial tech stack match
- no valid mentor found
- admin overrides recommendation
- auto mode fallback because score too low

## Risks

### 1. Dirty Mentor Skill Data

If mentor skills are incomplete or inconsistent, recommendations will be weak.

Mitigation:

- enforce normalized tech stack values where possible
- require mentors to maintain profile and skills

### 2. Overloading Good Mentors

Best mentors may receive all assignments.

Mitigation:

- workload cap
- fairness score
- admin-configurable balancing

### 3. Wrong Auto Assignment

If threshold is too low, poor assignments may happen.

Mitigation:

- keep v1 threshold conservative
- fallback to admin approval when confidence is low

## Best Technical Recommendation

Do not start with a machine learning model.

Start with a recommendation engine that uses:

- exact track mapping
- exact and fuzzy tech stack overlap
- mentor proficiency
- mentor availability
- current workload

After 3 to 6 months of assignment history, use the stored audit and review outcome data to train or refine a smarter ranking model.

## Minimum Build Scope

If you want the fastest useful version, build only this first:

1. admin setting for assignment mode
2. recommendation score engine
3. recommendation list on project submission
4. admin approval flow
5. auto assign only when score is above threshold

This will deliver real business value without overengineering.

## Suggested Build Order In This Repo

1. Add backend settings keys and safe defaults
2. Add mentor recommendation tables and migrations
3. Build recommendation service
4. Hook orchestrator into project creation and resubmission
5. Extend admin settings UI
6. Extend admin projects page and mentor modal
7. Add audit and analytics views
