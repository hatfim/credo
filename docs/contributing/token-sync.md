# Token sync workflow

Workflow: `.github/workflows/tokens-sync.yml` (PRD 6.7, TOK-15, TOK-16).

It runs when the Tokens Studio plugin pushes `packages/tokens/generated/tokens.json` to the
`tokens-sync` branch, or when started by hand (Actions, Tokens sync, Run workflow; it always
checks out `tokens-sync`). One run at a time (`concurrency: tokens-sync`).

Steps, in order, each stopping the run on failure: `credo-tokens validate`, `credo-tokens build`,
`credo-tokens contrast` (all through `@usecredo/tokens`), then open or update the pull request
from `tokens-sync` into `main`, and post or update one comment with the resolved-value changes
(`credo-tokens diff`). The pull request is skipped when the branch has nothing that differs from
`main`. The workflow never edits the token file and commits nothing; generated output stays in
the runner. The build, test and visual checks are the pull request's own required checks.

The diff compares with the previous commit on `tokens-sync` (`github.event.before`). With no
previous commit (manual run, first push, unreadable file) it compares with `origin/main`. The
comment says which one it used and is found again through the hidden marker
`<!-- credo-token-diff -->`.

## Owner steps (by hand)

1. Create a fine-grained personal access token limited to this repository with Contents and Pull
   requests set to read and write, and store it as the repository secret `GH_PAT`. The workflow
   stops with a clear error if it is missing.
2. Why not the default token: events caused by `GITHUB_TOKEN` do not start new workflow runs, so a
   pull request it opened would never get the required checks (PRD 6.7, TOK-15). The repository
   setting "Allow GitHub Actions to create and approve pull requests" is therefore not needed.
   A PAT belongs to a person; consider a machine user or a GitHub App later and set a rotation
   date. Decision 0008: keep the owner's fine-grained `GH_PAT`; rotate it before it expires on 14 January 2027 (owner reminder on 1 January).
3. Make sure the plugin pushes to a branch named `tokens-sync`, and that the `protect-main`
   ruleset does not restrict that branch.
4. Open a manual run once to confirm the secret works.
5. Keep `tokens-sync` current. A push run reads the workflow file from the pushed commit, so
   `tokens-sync` itself must contain the workflow, the setup action and the `diff` command.
   Merge `main` into `tokens-sync` once before the first run and again after every merge to
   `main` that changes them (the plugin only adds commits that touch the token file, so a merge
   commit is safe). Manual runs: Actions, Tokens sync, Run workflow, "Use workflow from:
   `tokens-sync`". If the tooling is missing, the first step fails with a message saying so.
   Decision 0008: a workflow on `main` will automate this merge (conflicts in
   `packages/tokens/generated/` keep the `tokens-sync` side; any other conflict stops and fails). Until it
   lands, the manual merge above is the interim.
6. Anyone with write access to `tokens-sync` can change the workflow on that branch, and it runs
   with `GH_PAT`. Limit write access to that branch, and do not let the ruleset block pushes to it.

The checkout uses the default read-only token (it works for private repositories too) and fetches
all branches, so `origin/main` is available without the PAT. The PAT is only used by `gh`.
The comment shows the change since the previous commit and a one-line total against `main`.

## Troubleshooting

`GraphQL: Resource not accessible by personal access token (addComment)` in the step "Open or
update the pull request". Cause: `gh pr comment` and `gh pr create` call GraphQL mutations
(`addComment`, `createPullRequest`) that a fine-grained PAT may be refused, while the REST
endpoints accept it. The workflow now uses only REST through `gh api` (list, create and comment on
pull requests; update the marker comment). Required PAT permissions: Contents read/write and Pull
requests read/write. Only if the comment call still returns 403, also add Issues read/write; that
is an owner change to the token.
