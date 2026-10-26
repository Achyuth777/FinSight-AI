# Day 21: Add case event concurrency control

## Task
Version cases and reject stale edits.

## Acceptance criteria
- [ ] Concurrent note saves do not overwrite one another.
- [ ] Document observed limits and assumptions.

## Verification
Test two clients updating the same case revision.

## Suggested commit
`fix: protect investigation updates from lost writes`

## Concept learned
Optimistic locking. Explain the implementation aloud before closing the issue.
