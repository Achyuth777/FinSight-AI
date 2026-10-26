# Day 04: Add dataset provenance

## Task
Store SHA-256, original filename, schema version and row count.

## Acceptance criteria
- [ ] Every dataset is traceable and identical file hashes are detected.
- [ ] Document observed limits and assumptions.

## Verification
Import identical bytes twice and verify dedup behavior.

## Suggested commit
`feat: track dataset provenance`

## Concept learned
Reproducible data lineage. Explain the implementation aloud before closing the issue.
