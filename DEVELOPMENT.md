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

Spelling checks enforce British English in project prose. Add narrowly scoped
exceptions to `ignoreRegExpList` in `cspell.config.yaml` for external
identifiers that must retain their published spelling.

Tests in `tests/` mock tunnel platform commands and filesystem operations; the
release-script tests use temporary local Git repositories. CI runs lint, unit
tests, and builds on Node.js 24 and 26, and audits production dependencies.
On release tag pushes, CI also verifies that the committed bundles match a
fresh build.

For direct pull requests and pushes to `main`, a separate Node.js 24 job
reports unit test coverage for `src/` to Codecov. It does not report integration
coverage. To enable uploads, install the [Codecov GitHub app](https://github.com/apps/codecov)
for this repository, activate it in Codecov, and disable token authentication
for public repositories in the organisation's Codecov settings. This
organisation-wide setting permits unauthenticated uploads, including forged
reports. The coverage badge appears after the first successful upload to
`main`; upload failures fail the coverage job, not the required lint, test,
and build checks.

GitHub-managed CodeQL default setup separately scans the default branch and
eligible pull requests, and runs scheduled scans. It does not scan pull
requests from forks, nor does the release workflow trigger a new scan. Check
the default-branch scan and its alerts before preparing a release.

CI runs on pushes to `main` and `v*` tags, and when pull requests targeting
`main` are opened, updated, or reopened. Integration tests run automatically
on those pushes. For pull requests, they wait for approval in the
`integration-approval` environment; the `Integration gate` check fails if
either scenario does not pass. Maintainers can also run the workflow manually
or call it as a reusable workflow with the Boolean `run_integration_tests`
input. When that input is false, those runs skip integration tests.
The workflow distinguishes direct runs from reusable calls using its
repository and workflow path; update that comparison if either changes.

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
no persistent WireGuard credentials.

Review changes to the workflow and test harness before approving a run. Do
not pass production secrets to pull requests or run untrusted pull request code
with privileged credentials. Required checks are configured in GitHub's
mainline ruleset, not solely by the workflow. The `Integration gate` must
remain a required check. The current ruleset does not require independent
review of workflow and test changes, which could bypass the gate; review them
carefully. GitHub treats skipped required checks as successful.

Network and DNS behaviour require integration testing on each platform before
that platform can be described as supported. Passing automated checks does not
replace a security review or establish production readiness.

## 🧭 Spec Kit

The repository includes Spec Kit templates, scripts, and Copilot skills. For
feature work, start with `/speckit-specify`; use `/speckit-plan`,
`/speckit-tasks`, and `/speckit-implement` to continue the workflow. Update the
constitution through `/speckit-constitution` when project principles change.

Spec Kit requires its managed workflow to retain the `workflow.yml` filename;
do not rename it to `.yaml`.

## 📦 Experimental MVP Release

The planned `v0.1.0` release is experimental and unsupported for production.
Runner-local integration tests do not verify external peer connectivity or
establish production readiness. Do not recommend production use until
behaviour, security controls, platform coverage, and cleanup have been validated.

To publish the MVP:

1. Merge the release preparation changes into `main` and confirm its checks
   pass. Verify the GitHub-managed CodeQL scan succeeded for that exact commit
   and review its alerts; the release workflow does not enforce this check.
   Complete a security review before production use.
2. Run **Prepare release tag** from `main`, specifying `v0.1.0`. The workflow
   runs checks, tests the generated bundles against a disposable peer, and
   pushes a tag pointing to a separate commit containing those bundles. It
   refuses existing tags and checks that `main` has not changed before tagging.
3. From the repository's `action.yaml` on GitHub, select **Draft a release**
   and select the existing `v0.1.0` tag. Do not create a tag directly from
   `main`: it would not contain the action bundles.
4. Mark the release as a pre-release and explain in its notes that the MVP is
   experimental, targets GitHub-hosted Ubuntu, and has only runner-local
   integration coverage. Do not move or reuse the version tag.
5. To list the action on GitHub Marketplace, select **Publish this Action to
   the GitHub Marketplace** and follow GitHub's prompts. The action name must
   be available, the repository owner must accept the Marketplace Developer
   Agreement, and the publisher must use two-factor authentication. See
   [GitHub's publishing guidance](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace).
6. Publish the release. A tag created with `GITHUB_TOKEN` does not trigger
   the tag workflow; the preparation workflow performs its own checks. The
   tag itself does not publish a release or Marketplace listing.

The package version tracks the intended release, but consumers use the Git
tag, not the package version, to reference the action. The Marketplace name is
`Geo Gaussian WireGuard Connect`; GitHub checks its availability when
publishing.
