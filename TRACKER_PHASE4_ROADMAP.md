# Tracker Phase 4: Mentor Effectiveness & Student Growth Analytics

## Objective
Provide admin with mentor quality metrics and student learning trajectory insights to complete the mentoring feedback loop and enable data-driven mentorship improvements.

## Context
- Phase 3 delivered admin escalation board, predictive warnings, and department leaderboard.
- Post-phase enhancements covered admin policy settings, department oversight, and escalation batch actions.
- Next layer: mentor mentoring quality + student learning velocity.

## Scope

### P0: Mentor Effectiveness Metrics
**Admin analytics: mentor performance dashboard**

**Metrics:**
- Review turnaround time (avg, median, p95 for reviews completed in last 14 days)
- Feedback depth (avg character count of review comments, "rich" vs "minimal" feedback ratio)
- Guidance type distribution (code review, design critique, planning feedback, etc.)
- Review consistency (variance in turnaround times — uniform or erratic)
- Active mentees per mentor + capacity utilization band (healthy / over-loaded / under-utilized)

**Data sources:**
- `week_reviews` table (review timestamps, comment depth)
- `tracker_timeline` events (review submission/completion pattern)
- `projects` table (assigned projects, mentor workload)

**Output:**
- Backend API: `GET /tracker/dashboard/admin/mentor-effectiveness`
- Frontend page: `/admin/mentor-effectiveness` (grid with sortable columns, detail drill-down)
- Export: CSV/JSON mentor effectiveness roster

**Validation:**
- Mentor effectiveness smoke test (correctness of turnaround calc, feedback depth aggregation)
- UI rendering smoke (page load, sort, export)

---

### P1: Student Learning Trajectory
**Admin analytics: student submission quality progression**

**Metrics per student:**
- Submission quality score (rubric: completeness, clarity, adherence to brief)
- Revision count + time-to-resubmit pattern
- Acceptance rate (submissions accepted on first vs after revisions)
- Comment sentiment (feedback tone trend — supportive, critical, neutral)
- Learning velocity (trend of quality score week-over-week)
- Risk regression flag (if quality declining despite feedback)

**Data sources:**
- `week_submissions` table (revision history, submission content)
- `week_reviews` table (feedback comments, action - approve/reject)
- `tracker_timeline` events (submission→review→acceptance timings)

**Output:**
- Backend API: `GET /tracker/dashboard/admin/student-learning?projectId=...`
- Frontend page: `/admin/analytics/student-learning` (learner progression cards, heatmap)
- Export: student learning session transcript

**Validation:**
- Student learning trajectory smoke test (quality scoring consistency, trend calculation)
- UI rendering smoke

---

### P2: Escalation Follow-up & Resolution Tracking
**Admin workflow: close escalations, log resolutions**

**Enhancement:**
- Escalation detail modal now includes:
  - Current escalation state (acknowledged, in follow-up, resolved)
  - Follow-up notes editor (rich text, add/edit notes over time)
  - Resolution action picker (escalation resolved / re-escalate / defer)
  - Timeline of escalation + follow-up events

**Data sources:**
- Extend `project_escalation_log` with `resolution_state`, `resolved_at`
- Extend `tracker_timeline` with `escalation_follow_up` event type

**New routes:**
- `PATCH /tracker/escalations/:escalationId/follow-up` (update state, add note)
- `GET /tracker/escalations/:escalationId` (detail with full timeline)

**Validation:**
- Escalation detail fetch + state update smoke
- UI modal rendering + action application smoke

---

## Success Criteria
1. Mentor effectiveness metrics accurately reflects review behavior (no false positives in turnaround calc).
2. Student learning trajectory trends match visual intuition (e.g., declining quality visible in chart).
3. Escalation follow-up enables admin to mark escalations resolved without reopening same issue.
4. All exports are CSV/JSON compatible; no client-side errors on large datasets (>1000 records).
5. Smoke tests PASS=min 6 FAIL=0 per feature.

## Dependencies
- Phase 3 escalation schema already in place.
- Department leaderboard and mentor load APIs ready for integration.
- Escalation batch action workflow ready for follow-up action binding.

## Timeline Estimate
- P0 (mentor effectiveness): 2–3 smoke cycles
- P1 (student learning): 2–3 smoke cycles
- P2 (escalation follow-up): 1–2 smoke cycles
- Total: 5–8 cycles, assuming autonomous execution.

## Next Steps
1. Implement P0 mentor effectiveness backend + API + frontend.
2. Run mentor effectiveness smoke (query correctness, aggregation logic).
3. Expand analytics page with mentor effectiveness card.
4. Implement P1 student learning trajectory backend + API + frontend.
5. Run student learning smoke.
6. Expand analytics page with learning progression card.
7. Implement P2 escalation follow-up enhancement backend + API + modal UI.
8. Run escalation follow-up smoke.
9. Generate Phase 4 closure report with validation summary.
