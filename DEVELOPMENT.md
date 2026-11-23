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

Unit tests mock platform commands and filesystem operations. Passing checks
does not verify real WireGuard or DNS behaviour.

CI runs lint, tests, and builds on Node.js 24 and 26. It also checks that both
action bundles are tracked and match the build output. It runs on pushes to
`main` and `v*` tags, and when pull requests targeting `main` are opened,
updated, or reopened. Tag pushes do not publish a release or deploy the action.
Tags pushed by a workflow using `GITHUB_TOKEN` generally do not trigger this
workflow.

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

New validation and platform behaviour should have focused unit tests. Network
interface and DNS changes require integration testing on each platform before
that platform can be described as supported. The current CI workflow does not
perform privileged networking tests.

## 🧭 Spec Kit

The repository includes Spec Kit templates, scripts, and Copilot skills. For
feature work, start with `/speckit-specify`; use `/speckit-plan`,
`/speckit-tasks`, and `/speckit-implement` to continue the workflow. Update the
constitution through `/speckit-constitution` when project principles change.

Spec Kit requires its managed workflow to retain the `workflow.yml` filename;
do not rename it to `.yaml`.

## 🚫 Releases

There are no production releases or supported versions yet. Do not publish a
version or recommend this action for production use until its behaviour,
security controls, platform coverage, and cleanup have been implemented and
validated.
