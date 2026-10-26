# Day 06: Enforce concurrent case uniqueness

## Task
Add typed case table and unique run/transaction constraint.

## Acceptance criteria
- [ ] Concurrent create requests produce a single case.
- [ ] Document observed limits and assumptions.

## Verification
Run parallel create requests against PostgreSQL.

## Suggested commit
`fix: prevent duplicate concurrent investigations`

## Concept learned
Database constraints and race conditions. Explain the implementation aloud before closing the issue.
