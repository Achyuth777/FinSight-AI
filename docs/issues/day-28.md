# Day 28: Optimize large-dataset interaction

## Task
Add server pagination and indexed search with bounded payloads.

## Acceptance criteria
- [ ] 20,000 rows remain usable without shipping all rows per navigation.
- [ ] Document observed limits and assumptions.

## Verification
Measure payload size and filter parity across page boundaries.

## Suggested commit
`perf: paginate transaction queries on the server`

## Concept learned
API pagination and query planning. Explain the implementation aloud before closing the issue.
