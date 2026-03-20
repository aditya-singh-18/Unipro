# Tracker Phase 3 Security Smoke Report

Generated At: 2026-03-20T10:23:56.259Z
Base API: http://localhost:5000/api
Project ID: CSE000009

Summary: PASS=8, FAIL=0, SKIP=0

| Step | Status | Details |
|---|---|---|
| Admin login | PASS | Token acquired |
| Student login | PASS | Token acquired |
| Admin status-history access | PASS | HTTP 200 |
| Student status-history blocked | PASS | HTTP 403 |
| Admin governance export access | PASS | HTTP 200 |
| Student governance export blocked | PASS | HTTP 403 |
| Admin mentor-load access | PASS | HTTP 200 |
| Student mentor-load blocked | PASS | HTTP 403 |
