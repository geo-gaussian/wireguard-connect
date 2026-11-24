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

| Command                | Purpose                                               |
| :--------------------- | :---------------------------------------------------- |
| `pnpm run lint`        | Check formatting, spelling, and TypeScript types.     |
| `pnpm test`            | Run the Jest tests.                                   |
| `pnpm run build`       | Bundle the main and post actions into `dist/`.        |
| `pnpm run format`      | Apply Prettier formatting to supported project files. |
| `pnpm run setup-hooks` | Configure the local Git pre-commit hook.              |

Unit tests mock platform commands and filesystem operations. CI runs lint,
unit tests, and builds on Node.js 24 and 26, checks the committed bundles,
audits production dependencies, and runs CodeQL analysis.

CI runs on pushes to `main` and `v*` tags, and when pull requests targeting
`main` are opened, updated, or reopened. Integration tests run automatically
on those pushes. For pull requests, they wait for approval in the
`integration-approval` environment; the `Integration gate` check fails if
either scenario does not pass. Maintainers can also run the workflow manually
or call it as a reusable workflow with the Boolean `run_integration_tests`
input. When that input is false, those runs skip integration tests.

Tag pushes do not publish a release or deploy the action. Tags pushed by a
workflow using `GITHUB_TOKEN` generally do not trigger this workflow.

The Actions toolkit is pinned to its latest CommonJS-compatible major version.
TypeScript is pinned below version 7 because the current Jest transformer does
not yet support it. Node.js type definitions match the action runtime rather
than the latest development runtime.

## 📦 Bundling

GitHub Actions executes the committed JavaScript in `dist/` directly. After
changing `src/`, run `pnpm run build` and include the corresponding generated
bundle changes. CI checks that the build output is synchronised with the
committed files.

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
Publishing it does not verify real-runner tunnel, DNS, or cleanup behaviour.
Do not recommend production use until behaviour, security controls, platform
coverage, and cleanup have been validated.

To publish the MVP:

1. Merge the release preparation changes into `main`. Confirm lint, tests,
   builds, security checks, and integration tests pass in CI for the exact
   commit to be released. Complete a security review before production use.
2. From the repository's `action.yaml` on GitHub, select **Draft a release**.
   Choose the verified commit as the target and create the `v0.1.0` tag.
3. Mark the release as a pre-release and explain in its notes that the MVP is
   experimental, targets GitHub-hosted Ubuntu, and has only runner-local
   integration coverage. Do not move or reuse the version tag.
4. To list the action on GitHub Marketplace, select **Publish this Action to
   the GitHub Marketplace** and follow GitHub's prompts. The action name must
   be available, the repository owner must accept the Marketplace Developer
   Agreement, and the publisher must use two-factor authentication. See
   [GitHub's publishing guidance](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace).
5. Publish the release and check the `v0.1.0` tag workflow. A tag push runs
   checks but does not itself publish a release or Marketplace listing.

The package version tracks the intended release, but consumers use the Git
tag, not the package version, to reference the action. The Marketplace name is
`Geo Gaussian WireGuard Connect`; GitHub checks its availability when
publishing.
