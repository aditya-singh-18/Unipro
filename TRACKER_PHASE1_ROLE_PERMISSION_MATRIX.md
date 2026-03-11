# Tracker Phase 1 Role Permission Matrix

Date: 2026-03-11
Status: Finalized (Phase 1)

## Scope
Roles covered:
- student
- mentor
- admin

Access is enforced at middleware and service layer.
Project ownership checks are mandatory for student and mentor operations.

## Permission Table

| Capability | Student | Mentor | Admin |
|---|---|---|---|
| List project weeks | Allowed for own project | Allowed for assigned project | Allowed for all |
| Bootstrap weeks | Not allowed | Not allowed | Allowed |
| Update week status (override) | Not allowed | Not allowed | Allowed |
| Create weekly submission | Allowed (own project, pending week) | Not allowed | Not allowed |
| Resubmit weekly submission | Allowed (own project, rejected and not locked/missed) | Not allowed | Not allowed |
| View week submissions | Allowed for own project | Allowed for assigned project | Allowed for all |
| Review submission (approve/reject) | Not allowed | Allowed for assigned project | Allowed |
| View week reviews | Allowed for own project | Allowed for assigned project | Allowed for all |
| Create task | Allowed for own project | Allowed for assigned project | Allowed for all |
| List tasks | Allowed for own project | Allowed for assigned project | Allowed for all |
| Move task status | Allowed with transition rules | Allowed with transition rules | Allowed |
| Reopen done task | Not allowed | Allowed | Allowed |
| View timeline | Allowed for own project | Allowed for assigned project | Allowed for all |
| View current risk snapshot | Allowed for own project | Allowed for assigned project | Allowed for all |
| View current health snapshot | Allowed for own project | Allowed for assigned project | Allowed for all |
| Student dashboard endpoint | Allowed | Not allowed | Not allowed |
| Mentor dashboard endpoint | Not allowed | Allowed | Not allowed |
| Admin dashboard endpoint | Not allowed | Not allowed | Allowed |
| Receive tracker decision notifications | Allowed | Optional | Optional |

## Guard Rules

- Student guard:
  - Must be a member of project team.

- Mentor guard:
  - Must be assigned as mentor for project.

- Admin guard:
  - Global access.

## Workflow Guard Summary

- Week submission:
  - only pending for first submit
  - only rejected for resubmit
  - disallow if locked/missed/deadline passed

- Review action:
  - action in approve/reject
  - reject requires review comment

- Task transitions:
  - todo -> in_progress
  - in_progress -> review or blocked
  - review -> done or in_progress
  - blocked -> in_progress
  - done -> reopen only mentor/admin

## Phase 1 Completion Criteria

- Role matrix documented and reviewed.
- Matrix enforced by backend service access checks.
- API contract and schema align with role matrix rules.
