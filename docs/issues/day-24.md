# Day 24: Enforce per-workspace access

## Task
Scope datasets, runs and cases to explicit workspace membership.

## Acceptance criteria
- [ ] Cross-workspace IDs cannot expose records.
- [ ] Document observed limits and assumptions.

## Verification
Run negative IDOR authorization tests.

## Suggested commit
`feat: isolate workspace data access`

## Concept learned
Authorization and data isolation. Explain the implementation aloud before closing the issue.
