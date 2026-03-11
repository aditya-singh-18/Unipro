# Phase 2 P0 Behavioral Validation Report

**Date**: 2026-03-11T05:08:11.474Z
**Test Project**: CSE000005

## Results

| # | Test | Status |
|---|------|--------|
| 1 | BV-1a  closure job enabled | PASS  |
| 2 | BV-1b  candidates >= 1 | PASS  |
| 3 | BV-1c  transitioned >= 1 | PASS  |
| 4 | BV-1d  DB status = missed | PASS  |
| 5 | BV-1e  timeline event written | PASS  |
| 6 | BV-1f  actor_role = SYSTEM | PASS  |
| 7 | BV-2a  reminder job enabled | PASS  |
| 8 | BV-2b  student candidates >= 1 | PASS  |
| 9 | BV-2c  student sent >= 1 | PASS  |
| 10 | BV-2d  dispatch log written | PASS  |
| 11 | BV-2e  second run deduped (sent=0) | PASS  |
| 12 | BV-3a  no stale candidates after miss | PASS  |

**PASS=12  FAIL=0**

## Coverage

| Feature | Validated |
|---------|-----------|
| Auto-missed: candidates detected | ✅ |
| Auto-missed: DB status transition to `missed` | ✅ |
| Auto-missed: timeline event written (actor=SYSTEM) | ✅ |
| Reminder: candidates detected within window | ✅ |
| Reminder: notification dispatch written | ✅ |
| Reminder: de-duplication (same hour bucket) | ✅ |