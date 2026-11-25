# 🛠️ Development Guide

## 🧰 Prerequisites

- Node.js 24 or later for development; Node.js 26 LTS is recommended. The
  GitHub Action runtime is Node.js 24.
- pnpm 12.21.0, as pinned in `package.json`.
- Git.

## 🚀 Setup

```sh
pnpm install
pnpm run setup-hooks
```

The setup command configures this checkout to run `.githooks/pre-commit`.
The hook runs the lint script, which checks formatting, spelling, and
TypeScript types.

Install lifecycle scripts are disabled in `pnpm-workspace.yaml` and `.npmrc`.
Do not override this protection. Run project scripts explicitly, for example
with `pnpm run` or `pnpm test`; the Git hook is installed only when
`pnpm run setup-hooks` is invoked. Use pnpm for dependencies and commit
`pnpm-lock.yaml`; CI installs it with `--frozen-lockfile`. This is a project
convention and CI uses pnpm; install-script protection does not prevent someone
from running another package manager.

## 📋 Common Commands

| Command                  | Purpose                                               |
| :----------------------- | :---------------------------------------------------- |
| `pnpm run lint`          | Check formatting, spelling, and TypeScript types.     |
| `pnpm test`              | Run the Jest tests.                                   |
| `pnpm run test:coverage` | Generate unit test coverage in `coverage/`.           |
| `pnpm run build`         | Bundle the main and post actions into `dist/`.        |
| `pnpm run format`        | Apply Prettier formatting to supported project files. |
| `pnpm run setup-hooks`   | Configure the local Git pre-commit hook.              |

`pnpm run test:coverage` runs the same Jest suite as `pnpm test`, so use it
instead when a local coverage report is needed.

Spelling checks enforce British English in project prose. Add narrowly scoped
exceptions to `ignoreRegExpList` in `cspell.config.yaml` for external
identifiers that must retain their published spelling.

Tests in `tests/` cover tunnel platform commands with mocks, local HTTP
responses, and release scripts using temporary local Git repositories. CI runs
lint, unit tests, and builds on Node.js 24, and audits production dependencies.
Other development Node.js versions are not tested in CI. On release tag
pushes, CI also verifies that the committed bundles match a fresh build.

For direct pull requests and pushes to `main`, the Node.js 24 test run generates
unit test coverage for `src/` without running the suite twice. The checks job
uploads it to Codecov after the other checks pass; it does not report
integration coverage. When the checks job runs for other events, it executes
the tests without coverage. To enable uploads, install the
[Codecov GitHub app](https://github.com/apps/codecov)
for this repository, activate it in Codecov, and disable token authentication
for public repositories in the organisation's Codecov settings. This
organisation-wide setting permits unauthenticated uploads, including forged
reports. The coverage badge appears after the first successful upload to
`main`; upload failures fail the separate coverage job, not the required lint,
test, and build checks. The coverage job is skipped if the checks job fails.
An upload failure still fails the workflow run and prevents release
preparation from using that run.

GitHub-managed CodeQL default setup separately scans the default branch and
eligible pull requests, and runs scheduled scans. It does not scan pull
requests from forks, nor does the release workflow trigger a new scan. Check
the default-branch scan and its alerts before preparing a release.

CI runs on pushes to `main` and `v*` tags, and when pull requests targeting
`main` are opened, updated, or reopened. Runner-local integration tests run on
every workflow invocation, including manual runs and reusable calls. For pull
requests, the `Integration gate` check fails if either scenario does not pass.
GitHub's fork workflow approval settings may still require approval for some
pull requests.

Once this workflow is merged into `main`, the external peer test runs
automatically on pushes to `main`. Maintainers can also run it manually on a
trusted branch using the `run-external-integration-tests` input. The release
workflow runs both runner-local scenarios and requests the external test
against its built bundles. The workflow distinguishes direct runs from reusable
calls using its repository and workflow path; update that comparison if either
changes.

Tag pushes do not publish a release or deploy the action. Tags pushed by a
workflow using `GITHUB_TOKEN` generally do not trigger this workflow.

The Actions toolkit is pinned to its latest CommonJS-compatible major version.
TypeScript is pinned below version 7 because the current Jest transformer does
not yet support it. Node.js type definitions match the action runtime rather
than the latest development runtime.

## 📦 Bundling

GitHub Actions runs the compiled Node.js bundles in `dist/`. Source branches
ignore this directory; run `pnpm run build` to generate it locally. Release
tags point to separate commits containing tested bundles. Direct references
to `@main` do not work without a local build. Node.js 24 and later run the
repository's `.mts` helper scripts directly using built-in TypeScript type
stripping.

## 🧪 Testing Expectations

New validation and platform behaviour should have focused unit tests. The
integration scenarios create an isolated, temporary WireGuard peer and DNS
server on a GitHub-hosted Ubuntu runner. They check connectivity, DNS, a
deliberate setup failure, and post-job cleanup. The peer is on the same runner,
so these checks do not verify reachability to an external server. They require
no persistent WireGuard credentials. The failure scenario logs its expected
ping failure without creating an error annotation; unexpected failures still
fail the scenario.

Review changes to the workflow and test harness. Do not pass production secrets
to pull requests or run untrusted pull request code with privileged credentials.
Required checks are configured in GitHub's
mainline ruleset, not solely by the workflow. The `Integration gate` must
remain a required check. The current ruleset does not require independent
review of workflow and test changes, which could bypass the gate; review them
carefully. GitHub treats skipped required checks as successful.

Network and DNS behaviour require integration testing on each platform before
that platform can be described as supported. Passing automated checks does not
replace a security review or establish production readiness.

### 🌐 External Peer Test

The **Build and test WireGuard Connect** workflow builds the checked-out
action, connects to a separately configured peer, requests a private HTTP
service through the tunnel interface, and checks for remaining action interfaces
and configuration files after the action's post step. It does not replace the
runner-local scenarios, test DNS restoration, or establish production readiness.
A terminated runner may not execute either post step.

Before running it, create a GitHub Actions environment named
`external-integration`. Allow deployments from `main` and the trusted
repository branches used for manual tests, without required reviewers.
Protect `main` and review workflow and dependency changes: code that can run
with these credentials can expose them. Keep the credentials in this
environment, not repository-wide secrets. Never run the external test on
untrusted code or a fork pull request. The repository currently restricts pull
request creation to collaborators.

Configure these environment secrets:

| Secret                | Value                                                   |
| :-------------------- | :------------------------------------------------------ |
| `WG_PRIVATE_KEY`      | Client private key for the dedicated test peer.         |
| `WG_ENDPOINT`         | External server hostname or IP and UDP port.            |
| `PRIVATE_SERVICE_URL` | HTTP or HTTPS URL of the isolated private test service. |

Configure these environment variables:

| Variable               | Value                                                      |
| :--------------------- | :--------------------------------------------------------- |
| `WG_ADDRESS`           | Unique client tunnel address with CIDR prefix.             |
| `WG_SERVER_PUBLIC_KEY` | Server WireGuard public key.                               |
| `WG_ALLOWED_IPS`       | CIDR networks containing the test service and DNS if used. |
| `WG_DNS_SERVER`        | Optional private DNS server IP; requires `WG_DNS_DOMAINS`. |
| `WG_DNS_DOMAINS`       | Optional space-separated suffixes; requires DNS server.    |

Use a dedicated peer with access restricted to the test service, and configure
the server with its client public key and tunnel address. The endpoint must be
reachable from the runner, and an endpoint hostname must resolve before the
tunnel is established; tunnel DNS cannot resolve the endpoint during setup.
The service must return an HTTP 2xx or 3xx response; redirects are not
followed, so a 3xx response does not verify its destination. The test logs the
status and response body, including for unsuccessful HTTP responses, so use a
service that does not return sensitive information. If its URL uses private DNS,
configure both DNS variables and ensure the DNS server is reachable through the
permitted routes.
Allow inbound WireGuard UDP traffic to the peer. Keep tunnel routes narrow:
full-tunnel routing can disrupt the runner's connection to GitHub.

After merging the workflow into `main`, the external test runs on every push to
`main`. To test a trusted pull request, select its repository branch in the
Actions tab, run **Build and test WireGuard Connect**, and enable
`run-external-integration-tests`. This tests the selected branch revision, not
GitHub's pull request merge commit; the branch must include this workflow
change. Runs share a concurrency group because the same peer cannot safely be
used by concurrent runners. GitHub may replace a pending run when another is
queued. Other workflows must not use that peer concurrently. The cleanup
observer checks the runner before and after the action, but cannot verify
cleanup when the runner terminates unexpectedly.

A [manual run](https://github.com/geo-gaussian/wireguard-connect/actions/runs/45606245819)
passed against the dedicated external peer on a development branch. This is
evidence for that run only, not a guarantee for other peers, runners, or
future runs.

## 🧭 Spec Kit

The repository includes Spec Kit templates, scripts, and Copilot skills. For
feature work, start with `/speckit-specify`; use `/speckit-plan`,
`/speckit-tasks`, and `/speckit-implement` to continue the workflow. Update the
constitution through `/speckit-constitution` when project principles change.

Spec Kit requires its managed workflow to retain the `workflow.yml` filename;
do not rename it to `.yaml`.

## 📦 Release Preparation

There is no supported production release yet. Do not recommend production use
until behaviour, security controls, platform coverage, and cleanup have been
validated.

To prepare a release:

1. Ensure the release preparation workflow and intended changes are merged
   into `main` and confirm its checks pass. Verify the GitHub-managed CodeQL
   scan succeeded for that exact commit and review its alerts; the release
   workflow does not enforce this check. Complete a security review before
   production use.
2. Run **Prepare release tag** from `main` with the intended version. The
   workflow requires the latest push-triggered CI run for that exact commit to
   have succeeded, including the Node.js 24 check and the runner-local and
   external integration jobs. It then tests the generated bundles against both
   peers and pushes a tag pointing to a separate commit containing those
   bundles. It refuses existing tags and checks that `main` has not changed
   before tagging. If CI has not completed, failed, or cannot be verified,
   release preparation fails.
3. From the repository's `action.yaml` on GitHub, select **Draft a release**
   and select the tag created in the previous step. Do not create a tag
   directly from `main`: it would not contain the action bundles.
4. Describe the verified platform scope and remaining limitations in the
   release notes. Do not move or reuse the version tag.
5. To list the action on GitHub Marketplace, select **Publish this Action to
   the GitHub Marketplace** and follow GitHub's prompts. The action name must
   be available, the repository owner must accept the Marketplace Developer
   Agreement, and the publisher must use two-factor authentication. See
   [GitHub's publishing guidance](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace).
6. Publish the release. A tag created with `GITHUB_TOKEN` does not trigger
   the tag workflow; the preparation workflow performs its own checks. The
   tag itself does not publish a release or Marketplace listing.

Consumers use the Git tag, not the package version, to reference the action.
Release preparation does not update `package.json`. The Marketplace name is
`Geo Gaussian WireGuard Connect`; GitHub checks its availability when
publishing.
