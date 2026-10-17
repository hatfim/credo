# Main and nightly workflows, and the `next` channel

Workflows: `.github/workflows/main.yml` and `.github/workflows/nightly.yml` (PRD 11.3, DST-07,
TST-07). Shared setup is `.github/actions/setup`, which takes an optional `node-version` input; empty
keeps the default (the version in `.nvmrc`), so the pull request workflows are unchanged.

## Main (push to `main`)

| Job | Runs |
| --- | --- |
| `main-check` | `pnpm check`, everything, not `--affected` |
| `main-visual` | Same commands as `visual.yml`: Playwright snapshots against the committed baselines, diff artifact on failure. It fails with the existing "No visual baselines" message if none are committed (a green run without baselines would prove nothing) |
| `main-consumers` | `pnpm test:consumers` (loopback registry, never npmjs.org) |
| `publish-next` | Needs the three above. Off by default, see below |

Job names differ from the pull request ones so required-check names stay unambiguous. A failed run
notifies the person who pushed, through GitHub's default notifications. The deploy of the next docs
and Storybook is a later task (P1-25 and after).

## The `next` channel

`publish-next` writes snapshot versions of `@usecredo/tokens`, `tailwind-config`, `ui` and `icons`
(`changeset version --snapshot next`, for example `0.0.0-next-20261017061315`) and publishes them with
`changeset publish --tag next --no-git-tag` and npm provenance. Install with
`npm i @usecredo/ui@next`.

**Warning: the first publish of a package also sets `latest`.** When a package has never been published, npm gives its first version the `latest` tag as well, even with `--tag next` (seen on a local Verdaccio registry; assumed the same on npmjs.org). So after the first `next` publish, `npm i @usecredo/ui` resolves to a `0.0.0-next-*` snapshot. Accept that, or publish a deliberate first stable version before setting `PUBLISH_NEXT=true`. Later `next` publishes are expected to leave `latest` alone; that is unverified until it has run. The workflow does not remove tags automatically (that needs more privilege) and logs a notice before publishing.

Safety properties:

- The workflow triggers only on `push` to `main`. It has no `pull_request` trigger, and the job
  also checks `github.repository == 'hatfim/credo'`, `github.ref == 'refs/heads/main'` and
  `vars.PUBLISH_NEXT == 'true'`. A fork's push runs in the fork, without this repository's secrets.
- Nothing is published until the owner sets the repository variable `PUBLISH_NEXT` to `true`. Unset,
  the job is skipped.
- Permissions are `contents: read` and, on this job only, `id-token: write`. Checkout does not persist
  credentials. The snapshot version bump exists only in the runner's working tree: it is never
  committed, pushed or tagged.
- With no changesets pending, the job succeeds and logs "No changesets to snapshot".
- Every version is checked to be `0.0.0-next-*` before publishing, and `--tag next` is always passed.
- The npm token (if used) is read from `secrets.NPM_TOKEN` through `env:` in the one publish step.

`TODO(decision: npm-publish-auth)`: two ways to authenticate. Prefer trusted publishing (OIDC, no stored
secret); fall back to the `NPM_TOKEN` secret. The step uses the secret when it exists and OIDC (after
installing `npm@11.5.1`, the first version with trusted publishing) when it does not.

## Owner steps (by hand; the workflow changes none of this)

1. Create the npm organisation `@usecredo` and make sure the owner account can publish to it. The
   packages are public (`publishConfig.access`, and `access: public` in `.changeset/config.json`).
2. First publish: a trusted publisher can only be configured for a package that exists. Create a
   granular access token (publish only, scope `@usecredo`, shortest expiry), add it as the repository
   secret `NPM_TOKEN`. Provenance needs a public repository and the `id-token` permission, both present.
3. After the first publish, for each of the four packages on npmjs.com: Settings, Trusted
   Publisher, GitHub Actions, organisation `hatfim`, repository `credo`, workflow `main.yml`. Then delete
   the `NPM_TOKEN` secret so the OIDC path is used.
4. Decide about `latest` first (see the warning above): publish a deliberate first stable version of each package, or accept that the first snapshot becomes `latest`.
5. Repository Settings, Secrets and variables, Actions, Variables: add `PUBLISH_NEXT` = `true`.
6. Merge a pull request that has a changeset. Verify: `npm view @usecredo/ui dist-tags` (for all four packages) shows `next`, and if `latest` points at a snapshot and you do not want that, fix it by hand with `npm dist-tag add @usecredo/ui@<stable> latest` (or `npm dist-tag rm @usecredo/ui latest`),
   and the package page on npmjs.com shows a provenance badge. Set the variable back to anything else
   to stop publishing.

Not verified by the author: the actual publish, the OIDC path (whether `changeset publish` through
pnpm hands the OIDC exchange to npm 11.5.1), and provenance. Only a real run on GitHub and npm can
show these. If the OIDC path fails, use the `NPM_TOKEN` path.

## Nightly (02:17 UTC, and manual)

| Job | Runs |
| --- | --- |
| `nightly-visual` | The full Playwright snapshot run (all listed stories, light and dark). Fails without baselines, like main. Uploads `nightly-visual-diff` on failure |
| `nightly-consumers` | Install-from-tarballs consumer flow in a small matrix, `fail-fast: false` |

Matrix:

| Node | React | Consumers |
| --- | --- | --- |
| 22 (`.nvmrc`, the floor) | 19 | `vite-app`, `next-app` |
| 24 | 19 | `vite-app`, `next-app` |
| 22 | 18 | `vite-app` |

React 18 is applied by `CONSUMER_REACT_MAJOR=18`, which `scripts/consumers/run.mjs` writes into the
temporary catalog (react, react-dom and their types). `next-app` is not run on React 18 because the
Next.js App Router requires React 19. Tailwind versions and extra React minors are not in the matrix:
`TODO(decision: consumer-version-matrix)`. The PRD's nightly full accessibility crawl and dependency
audit are not part of this task.

Failure reporting: a scheduled workflow that fails emails the user who last changed the cron
schedule, and shows red under Actions. Options for the owner: watch the repository with "Custom,
Actions" notifications, or add a Slack or issue-opening step later. The PRD says nightly failures
open issues; this is not implemented, to keep the workflow free of `issues: write`.
`TODO(decision: nightly-failure-alerts)`.

GitHub disables scheduled workflows after 60 days without repository activity. Run
`gh workflow run nightly.yml` by hand to check it before relying on the schedule.
