# `main` branch protection — proposed configuration

Current state (read-only check, 2026-10-20):
`GET /repos/emmara518/el-khaber/branches/main/protection` → **404 Branch not
protected**. Nothing was applied.

## Proposed policy

- Require a pull request before merging.
- Require **1** approving review; dismiss stale approvals on new commits.
- Require the CI checks (`validate`, `web-export`) and strict up-to-date branch.
- Require conversation resolution.
- Block force pushes and branch deletion.
- Do **not** enforce on admins by default during the UAT window; the owner can
  enable it after the release process stabilizes.

## Apply (owner approval required)

Save as `protection.json`:

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["validate", "web-export"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
```

```sh
gh api --method PUT \
  repos/emmara518/el-khaber/branches/main/protection \
  --input protection.json
```

## Notes

- The check names must match the workflow jobs in `.github/workflows/ci.yml`.
- Applying protection will prevent direct pushes to `main`; confirm the owner
  is ready before enabling it.
- No protection, merge, or branch deletion was performed by the agent.
