# Phase 4 Execution Checklist

## Objective
Complete Phase 4 in the next implementation cycle without scope drift.

## Phase 4 Scope (Locked)
- Student draft autosave (debounced, resilient, timestamped UX)
- Revision diff panel (submission-to-submission field diff)
- Admin compliance board completion (filter/sort/pagination/export parity)

## Entry Criteria
- Analytics server-side pagination/filter flow is merged and stable
- Frontend lint passes
- No blocking runtime errors in admin analytics page

## Work Plan
1. P1-1 Student draft autosave
   - Add/verify draft save API usage in student project flow
   - Implement debounced autosave (3-5s) on editable fields
   - Show "Saving..." and "Saved at HH:MM" state
   - Add retry-on-failure + non-blocking toast

2. P1-2 Revision diff panel
   - Add backend payload shape for previous vs current revision fields
   - Build UI panel with per-field change highlighting
   - Add empty-state for first revision

3. P1-3 Admin compliance board
   - Ensure filter/sort/page params sync with URL
   - Ensure export respects active filters
   - Validate totals/pagination consistency with backend responses

## Definition of Done
- All three scope items implemented
- Lint/type checks pass
- Basic regression validation for student, mentor, admin dashboards
- Release note/summary document updated

## Risk Controls
- Keep each item behind small, testable commits
- Do not change unrelated modules during Phase 4
- If API contract changes, update frontend types in same commit
