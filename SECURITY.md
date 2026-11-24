# 🔐 Security Policy

## 🚧 Project Status

This project is in early development and is not suitable for production use.
The Ubuntu MVP has runner-local integration coverage, but has not been
independently security reviewed. There are no supported releases.

## 🛡️ Security Requirements

The implementation is expected to:

- Mask private keys immediately after reading them and never log secrets or
  rendered private configuration.
- Validate user inputs and pass values as discrete command arguments rather
  than interpolating them into shell commands.
- Restrict configuration-file permissions before writing secrets.
- Attempt all independent teardown operations and remove temporary files.
- Add tests for secret handling, input validation, command construction, and
  partial cleanup failures.

Unit tests mock system operations; integration tests exercise tunnel, DNS, and
cleanup against a disposable peer. Neither is a security certification.

CI also audits production dependencies. GitHub-managed CodeQL scans the
default branch and eligible pull requests; GitHub secret scanning and push
protection are enabled for the repository. These checks do not detect every
vulnerability or replace an independent security review.

## 📦 Dependency Installation

The repository disables install lifecycle scripts for pnpm and npm by default.
Do not override this setting. This reduces install-time risk but does not stop
malicious code from running when a dependency is executed or imported, and
pnpm's configuration hooks are not covered by this setting. Review dependency
changes and use the committed lockfile with frozen installs in CI.

## 📣 Reporting a Vulnerability

Please do not report suspected vulnerabilities in a public issue. If private
vulnerability reporting is enabled for this repository, use the repository's
**Security** tab. Otherwise, contact the repository maintainers through a
private channel listed in the repository's owner profile.

## ✅ Consumer Guidance

Do not pass production secrets to this MVP. When a verified release is
available, pin dependencies and action references according to your
organisation's security policy, and use the least network access the workflow
requires.
