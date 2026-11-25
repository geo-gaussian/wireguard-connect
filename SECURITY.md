# 🔐 Security Policy

## 🚧 Project Status

The action has runner-local integration tests and a successful external-peer
test on a development branch. It has not been independently security reviewed.
Cleanup is best-effort and may not run if a runner terminates unexpectedly.

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

Tunnel unit tests mock system operations; integration tests exercise tunnel,
DNS, and cleanup against a disposable runner-local peer. A separate test can
exercise a configured external peer. None is a security certification.

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

Assess the action and its test coverage against your security requirements
before providing credentials. Pin dependencies and action references according
to your organisation's security policy, and use the least network access the
workflow requires.
