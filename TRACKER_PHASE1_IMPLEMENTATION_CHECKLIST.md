# Tracker Phase 1 Implementation Checklist

Date: 2026-03-11
Status: In Progress

## A) DB Layer
- [x] Migration script drafted
- [x] Migration executed on dev database
- [x] Post-migration schema verification done

## B) Backend Modules to Create
- [x] tracker.routes.js
- [x] tracker.controller.js
- [x] tracker.service.js
- [x] tracker.repo.js
- [x] tracker.validator.js

## C) Priority Endpoint Order
1. Week bootstrap and list
2. Weekly submission create
3. Mentor review approve/reject
4. Task create/list/status update
5. Timeline fetch
6. Risk current and health current

## D) Rule Engine Order
1. Week status transition guard
2. Deadline lock guard
3. Submission revision logic
4. Review action guard
5. Task transition guard

## E) Test Scenarios (Minimum)
- [x] Student submits week before deadline
- [x] Student blocked after week lock
- [x] Mentor rejects with comment
- [x] Student resubmits rejected week
- [x] Mentor approves submission
- [x] Invalid transition returns 409
- [x] Unauthorized role returns 403

## F) Ready for Phase 2 UI Integration When
- [x] Week APIs stable
- [x] Submission/review flow stable
- [x] Task board APIs stable
- [x] Dashboard aggregate endpoint available

## G) Phase 1 Deliverables (Domain and Data Design)
- [x] Final schema and relations
- [x] API contract v1
- [x] Role permission matrix

## H) Contract Parity Hardening
- [x] Core API v1 parity audit completed
- [x] Missing core endpoints added (week status override, submission files)
- [x] Risk/health recalculate endpoints implemented and wired
