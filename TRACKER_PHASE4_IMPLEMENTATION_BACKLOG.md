# Tracker Phase 4: Implementation Backlog

## P0: Mentor Effectiveness Metrics

### Backend
- [ ] Create `backend/src/repositories/mentorEffectiveness.repo.js`
  - Query: `getReviewTurnaroundStats(mentorId?, days=14)` — avg/median/p95 review completion time
  - Query: `getFeedbackDepthStats(mentorId?, days=14)` — avg comment length, rich feedback ratio
  - Query: `getMentorWorkloadBand(mentorId)` — current project count vs capacity band
  - Query: `getAdminMentorEffectivenessGrid()` — all mentors + aggregate metrics

- [ ] Create `backend/src/services/mentorEffectiveness.service.js`
  - Service: `getMentorEffectivenessGridService()` → dashboard data
  - Service: `getMentorEffectivenessDetailService(mentorId)` → drill-down
  - Service: `exportMentorEffectivenessService(format)` → CSV/JSON

- [ ] Update `backend/src/controllers/tracker.controller.js`
  - Route guard: `allowRoles: ['admin']`
  - Endpoint: `GET /tracker/dashboard/admin/mentor-effectiveness`
  - Response shape: `{ items: [{mentorId, mentorName, ..., turnaroundMs: {avg, median, p95}, feedbackDepth: {...}, workloadBand}, ...], summary: {...} }`

- [ ] Migration (if needed for schema inspection)

### Frontend
- [ ] Update `frontend/src/services/tracker.service.ts`
  - Type: `MentorEffectivenessItem`
  - Type: `MentorEffectivenessResponse`
  - Helper: `getAdminMentorEffectiveness()`
  - Helper: `exportMentorEffectivenessReport(format)`

- [ ] Update `frontend/src/app/admin/analytics/page.tsx`
  - Add section: "Mentor Effectiveness Overview"
  - Grid: mentors, turnaround time distribution, feedback depth, workload band
  - Drill-down: click mentor → detail modal with review history

- [ ] Create `frontend/src/components/modals/MentorEffectivenessDetailModal.tsx`
  - Render: recent reviews, feedback samples, turnaround timeline chart
  - Export button: download mentor's review transcript

### Validation
- [ ] Create `backend/scripts/runTrackerPhase4P0Smoke.mjs`
  - Test: turnaround stats calculation (dates, null safety)
  - Test: feedback depth aggregation
  - Test: workload band assignment accuracy
  - Test: export format correctness (CSV, JSON)

---

## P1: Student Learning Trajectory

### Backend
- [ ] Create `backend/src/repositories/studentLearning.repo.js`
  - Query: `getStudentLearningSnapshot(projectId, studentEnrollmentId?)` — weekly submission quality trend
  - Query: `getSubmissionQualityScore(weekId)` — rubric-based score (completeness, clarity, adherence)
  - Query: `getRevisionPattern(projectId, studentKey)` — revision count, time-to-resubmit
  - Query: `getAcceptanceRate(projectId, studentKey)` — % accepted on first submission
  - Query: `getCommentSentiment(projectId, studentKey)` — feedback tone distribution
  - Query: `getStudentLearningRoster()` — all students + learning velocity

- [ ] Create `backend/src/services/studentLearning.service.js`
  - Service: `getStudentLearningRosterService()` → learning progression grid
  - Service: `getStudentLearningDetailService(projectId, enrollmentId)` → deep dive
  - Service: `exportStudentLearningService(format)` → CSV/JSON
  - Helper: `calculateSubmissionQualityScore(submission, rubric)` — scoring logic

- [ ] Update `backend/src/controllers/tracker.controller.js`
  - Route guard: `allowRoles: ['admin']`
  - Endpoint: `GET /tracker/dashboard/admin/student-learning`
  - Response shape: `{ items: [{studentName, projectId, qualityScore: [...], revisionCount, acceptanceRate, sentimentTrend: [...], learningVelocity}, ...] }`

### Frontend
- [ ] Update `frontend/src/services/tracker.service.ts`
  - Type: `StudentLearningItem`
  - Type: `SubmissionQualityScore`
  - Type: `StudentLearningResponse`
  - Helper: `getAdminStudentLearning()`
  - Helper: `exportStudentLearningReport(format)`

- [ ] Update `frontend/src/app/admin/analytics/page.tsx`
  - Add section: "Student Learning Progression"
  - Grid: students, quality score trend (sparkline), revision count, acceptance %, learning velocity
  - Color coding: green (improving), yellow (stable), red (declining)
  - Drill-down: click student → learning detail modal

- [ ] Create `frontend/src/components/modals/StudentLearningDetailModal.tsx`
  - Chart: submission quality week-over-week (line chart)
  - Table: recent submissions + review feedback
  - Risk flag: if learning degrading, highlight

### Validation
- [ ] Create `backend/scripts/runTrackerPhase4P1Smoke.mjs`
  - Test: quality score calculation consistency
  - Test: revision pattern correct calculation
  - Test: acceptance rate edge cases (0 submissions, all rejected, all accepted)
  - Test: sentiment aggregation
  - Test: learning velocity trend direction
  - Test: export correctness

---

## P2: Escalation Follow-up & Resolution Tracking

### Backend
- [ ] Migrate: add columns to `project_escalation_log`
  - `resolution_state` (enum: 'open', 'acknowledged', 'in_follow_up', 'resolved', 'deferred')
  - `resolved_at` (timestamp)
  - `resolution_notes` (text)

- [ ] Create `backend/src/repositories/escalationFollowUp.repo.js`
  - Query: `getEscalationDetail(escalationId)` — full escalation + timeline
  - Mutation: `updateEscalationFollowUp(escalationId, { resolutionState, resolutionNotes })`
  - Timeline insert: `admin_escalation_follow_up_state_changed` event

- [ ] Create `backend/src/services/escalationFollowUp.service.js`
  - Service: `getEscalationDetailService(escalationId)` → full timeline
  - Service: `updateEscalationFollowUpService(escalationId, payload, updatedBy)` → state + notes update

- [ ] Update `backend/src/controllers/tracker.controller.js`
  - Endpoint: `GET /tracker/escalations/:escalationId` (new)
  - Endpoint: `PATCH /tracker/escalations/:escalationId/follow-up` (new)
  - Route guard: `allowRoles: ['admin']`

### Frontend
- [ ] Update `frontend/src/services/tracker.service.ts`
  - Type: `EscalationDetail`
  - Type: `EscalationFollowUpPayload`
  - Helper: `getEscalationDetail(escalationId)`
  - Helper: `updateEscalationFollowUp(escalationId, payload)`

- [ ] Update `frontend/src/components/modals/EscalationDetailModal.tsx` (or create new)
  - Display: escalation reason, project, week, created_at
  - State picker: dropdown (open → acknowledged → in_follow_up → resolved / deferred)
  - Notes editor: rich text for follow-up notes, edit history
  - Timeline: show all events (escalation → acknowledged → follow_up → resolution)
  - Action button: "Mark Resolved" / "Re-escalate" / "Defer"

- [ ] Update `frontend/src/app/admin/analytics/page.tsx` or `/admin/escalations`
  - Link escalation items to detail modal
  - Show current resolution state as badge

### Validation
- [ ] Create `backend/scripts/runTrackerPhase4P2Smoke.mjs`
  - Test: escalation detail fetch correctness
  - Test: follow-up state update persistence
  - Test: timeline event creation on state change
  - Test: notes field persistence and retrieval
  - Test: resolution state transition rules (no invalid state jumps)

---

## P3: Integration & Cross-Feature Validation

- [ ] Run full tracker validation suite (all smoke scripts in sequence)
- [ ] Update analytics page: plug in mentor effectiveness, student learning, escalation follow-up
- [ ] Frontend type consistency across all new tracker types
- [ ] Export formats (CSV headers, JSON schema) consistency

---

## Execution Sequence (Autonomous)
1. Implement P0 mentor effectiveness backend + frontend
2. Run P0 smoke
3. Implement P1 student learning backend + frontend
4. Run P1 smoke
5. Implement P2 escalation follow-up backend + frontend
6. Run P2 smoke
7. Run full tracker validation
8. Generate Phase 4 closure report
