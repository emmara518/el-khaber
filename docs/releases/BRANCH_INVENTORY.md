# Branch inventory and archive candidates

Read-only review, 2026-10-20. **No branch was deleted or archived.**

- Local `main` (`bfa29a5`) is an ancestor of the release; it is 7 commits ahead
  of `origin/main` (`ae7055a`).
- `release/v2.1.0-uat` (`fc987e3` at the time of writing) contains the
  preserved worktree plus all V2.1 task commits.
- Every remote `origin/review/*` branch is an **ancestor** of the release
  branch (`git branch -r --merged release/v2.1.0-uat`), so no unique commit
  would be lost by archiving them after the release PR merges.

## Archive candidates (after owner approval)

`review/cto-10i`, `review/final-mvp-blocker-closure`,
`review/final-production-readiness`, `review/release-candidate`,
`review/release-candidate-v2`, `review/release-candidate-v3`,
`review/remediation-mvp-blockers`, `review/task-10j-r1`,
`review/task-10j-real-api`, `review/task-10m-notifications`,
`review/task-10n-real-http-e2e`, `review/task-11-hardening`.

Keep `review/final-production-release` as the base branch for PR #1 until it
is merged/closed.

## Local task branches

All are merged into `release/v2.1.0-uat` and pushed to origin as PR heads:
`fix/S1-*`, `fix/S4-*`, `perf/M4-chat-polling`, `test/T1-*`, `fix/S3-*`,
`fix/S2-*`, `fix/M1-*`, `fix/M2-*`, `fix/S5-*`, `fix/B1-*`, `fix/M3-*`,
`feat/M4-*`, `fix/A1-*`, `feat/I2-*`, `fix/I1-*`.

Archive only after the PR chain and release PR are merged, and only with an
explicit owner instruction.
