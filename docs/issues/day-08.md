# Day 08: Learn causal velocity features

## Task
Derive rolling transaction velocity from prior events only.

## Acceptance criteria
- [ ] No event sees later rows or its own transaction.
- [ ] Document observed limits and assumptions.

## Verification
Add time-boundary and ordering leakage tests.

## Suggested commit
`feat: derive past-only velocity features`

## Concept learned
Point-in-time feature engineering. Explain the implementation aloud before closing the issue.
