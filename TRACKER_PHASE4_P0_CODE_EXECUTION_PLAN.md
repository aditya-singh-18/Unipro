# Tracker Phase 4, P0: Mentor Effectiveness Metrics — Code Execution Plan

## Change Overview
Add mentor effectiveness analytics: review turnaround time, feedback depth, workload capacity. Enable admin to identify high-performing mentors and those needing support.

## Files to Create
1. `backend/src/repositories/mentorEffectiveness.repo.js` — query layer
2. `backend/src/services/mentorEffectiveness.service.js` — business logic
3. `backend/scripts/runTrackerPhase4P0Smoke.mjs` — validation
4. `frontend/src/components/modals/MentorEffectivenessDetailModal.tsx` — detail view
5. Update `frontend/src/services/tracker.service.ts` — types + helpers

## Files to Modify
1. `backend/src/controllers/tracker.controller.js` — add GET /tracker/dashboard/admin/mentor-effectiveness endpoint
2. `frontend/src/app/admin/analytics/page.tsx` — add mentor effectiveness section

## Data Queries
**Review turnaround time:**
- Source: week_reviews (created_at as review start, reviewed_at as completion)
- Filter: last 14 days, only approved/rejected reviews
- Calc: reviewed_at - submitted_at (from week_submissions to week_reviews)
- Aggregate: avg, median, p95

**Feedback depth:**
- Source: week_reviews.review_comment (character length)
- Filter: last 14 days, non-null comments
- Calc: length(review_comment), categorize as "rich" (>200 chars) vs "minimal" (<200 chars)
- Aggregate: avg length, rich % ratio

**Workload band:**
- Source: projects (mentor_employee_id), project_weeks (status)
- Count: active projects per mentor (where status not in 'locked', 'missed', 'approved')
- Band: healthy (<5), warning (5-10), critical (>10) — adjustable

**Aggregation level:** per mentor, or aggregate for admin dashboard summary

## Expected Output Shape (API Response)
```
{
  summary: {
    totalMentors: 15,
    avgReviewTurnaroundMs: 86400000,  // 24 hours in ms
    avgFeedbackDepthChars: 320,
    overloadedCount: 2,
    healthyCount: 13
  },
  items: [
    {
      mentorId: "EMP001",
      mentorName: "Alice",
      reviewCount: 12,
      avgTurnaroundMs: 72000000,  // 20 hours
      medianTurnaroundMs: 68000000,
      p95TurnaroundMs: 120000000,  // 33.3 hours
      avgFeedbackDepthChars: 420,
      richFeedbackRatio: 0.83,
      activeProjectCount: 3,
      workloadBand: "healthy",
      recentReviewedCount: 5  // last 7 days
    },
    ...
  ]
}
```

## Execution Steps
1. Implement backend repository queries (turnaround, depth, workload)
2. Implement backend service aggregation
3. Implement controller endpoint with role guard
4. Update frontend types and service helpers
5. Add mentor effectiveness section to analytics page
6. Run smoke test to verify query correctness and API shape
7. Test UI rendering and interactions

## Success Criteria
- Query returns correct turnaround stats (verified by smoke)
- Feedback depth calculation matches manual check on sample data
- Workload band classification aligns with visual project count
- API response completes in <500ms for 50 mentors
- Export (CSV/JSON) produces valid output
- Firebase/email notification tests (if applicable) pass
- Smoke: PASS >= 5, FAIL = 0
