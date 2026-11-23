# 📋 Business Requirements (Draft)

**Status:** Draft; an Ubuntu MVP is implemented but not acceptance-tested on
a real runner.

## 🎯 Objective

Develop a GitHub Action that temporarily connects a workflow job to a private
network using WireGuard, then removes the connection and any DNS changes at the
end of the job.

## 🧭 Intended Users

- Repository maintainers whose workflows need controlled access to private
  infrastructure.
- Platform teams that want to provide a reusable, auditable VPN connection step.

## 📌 Proposed Functional Requirements

| ID    | Requirement                                                            | Acceptance evidence                                                   |
| :---- | :--------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| FR-01 | Validate required tunnel inputs before making system changes.          | Unit tests cover valid and invalid input cases.                       |
| FR-02 | Establish a WireGuard tunnel on explicitly supported runner platforms. | Integration tests pass on each declared platform and architecture.    |
| FR-03 | Optionally route selected DNS suffixes to a private DNS server.        | Integration tests demonstrate setup and restoration of DNS behaviour. |
| FR-04 | Tear down tunnel and temporary configuration after the job.            | Tests cover normal completion and partial setup or cleanup failures.  |
| FR-05 | Optionally verify access to a caller-provided internal target.         | Tests cover successful and failed verification.                       |

## 🔐 Non-Functional Requirements

- Private keys must never appear in logs and temporary configuration must have
  restrictive permissions.
- User-controlled values must be validated and passed to commands as separate
  arguments, not interpolated into shell strings.
- Teardown must attempt all independent cleanup steps and report failures.
- Bundled action output must remain synchronised with its TypeScript source.
- Documentation must distinguish verified behaviour from planned behaviour.

## 🚫 Out of Scope

- Provisioning or managing the remote WireGuard server.
- Secret rotation, peer allocation, and organisation-specific policy management.
- Claiming full-tunnel routing or platform support before those behaviours are
  separately specified and tested.

## 🚧 Current Status

This document records project intent. The Ubuntu MVP implements the intended
lifecycle with best-effort cleanup, but no platform has yet been accepted
through real runner integration testing.
