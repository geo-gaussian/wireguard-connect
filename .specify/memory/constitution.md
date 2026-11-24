# 📜 WireGuard Connect Constitution

## 🛡️ Core Principles

### 🔐 I. Security Is a Release Requirement

Handle private keys as secrets from input to cleanup. Validate untrusted values,
avoid shell interpolation, restrict temporary-file permissions, and make
teardown resilient. Security controls must be tested; documentation alone is
not evidence that they work.

### 🔎 II. Verify Before Claiming Support

Treat every operating system, architecture, DNS mechanism, and runner image as
unsupported until its behaviour has been tested. Clearly distinguish planned,
implemented, and verified behaviour in code, CI, and documentation.

### 🧪 III. Test Behaviour and Failure Paths

Add focused tests for new functionality, invalid inputs, command construction,
and partial failures. Privileged networking behaviour requires integration
tests on the platform where support is claimed.

### 🧩 IV. Keep the Action Small and Explicit

Prefer direct, typed implementations and narrow platform abstractions. Avoid
unnecessary dependencies and configuration. Surface failures instead of
silently converting them into apparent success.

### 📚 V. Keep Source, Bundles, and Documentation Consistent

GitHub Actions executes release-tag files from `dist/`; source changes require
rebundling for testing and releases. Documentation must reflect the current
implementation and identify unverified behaviour.

## 🧰 Technical Constraints

- Use strict TypeScript and the Node.js 24 GitHub Actions runtime.
- Use pnpm 12.21.0 for repository development and dependency management.
- Disable install lifecycle scripts; run project tooling explicitly.
- Keep OS-specific commands under `src/platforms/`.
- Pass dynamic command arguments as arrays, never interpolated shell programs.
- Keep secrets out of logs, fixtures, and documentation.

## 🔄 Development Workflow

Use Spec Kit for substantial feature work: specify behaviour, review the plan,
generate tasks, implement, and validate. Run `pnpm run lint`, `pnpm test`, and
`pnpm run build` before submitting code changes. Update related documentation
in the same change; release preparation generates and commits the bundles.

## ⚖️ Governance

This constitution defines project-wide engineering expectations. Amend it when
the project direction or a core invariant changes, and keep `AGENTS.md` and
contributor documentation consistent with it.

**Version:** 1.0.0 | **Ratified:** 2026-11-23 | **Last Amended:** 2026-11-23
