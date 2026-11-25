# 🏗️ Architecture

> **Status:** An Ubuntu MVP implements the lifecycle below and has limited
> runner-local integration coverage; it is not production-ready.

## 🎯 Design Goal

The action is intended to create a temporary WireGuard connection for one
workflow job and remove the tunnel and any related DNS configuration afterward.
The implementation keeps shared input validation separate from
operating-system-specific commands.

## 🔄 MVP Lifecycle

1. Read and validate action inputs, masking secret values before any logging.
2. Detect the runner operating system and ensure required WireGuard tooling is
   available.
3. Create a restricted-permission configuration file and bring up the tunnel.
4. Optionally configure split-DNS and verify connectivity.
5. During the GitHub Actions `post` phase, attempt to revert DNS changes, stop
   the tunnel, and remove temporary configuration, including when an earlier
   workflow step fails.

A post step cannot guarantee cleanup if the runner terminates before it can
run. If tunnel startup fails before it is recorded as active, the action relies
on `wg-quick` to undo its partial setup.
The configuration is created exclusively under `/etc/wireguard`, restricted
before secrets are written, and overwritten and removed during teardown.

## 🧩 Components

| Area             | Intended responsibility                         | Current state                    |
| :--------------- | :---------------------------------------------- | :------------------------------- |
| `src/main.ts`    | Validate inputs and start the tunnel            | Ubuntu MVP                       |
| `src/post.ts`    | Revert DNS and tear down the tunnel             | Best-effort cleanup              |
| `src/config.ts`  | Parse inputs and render WireGuard configuration | Implemented                      |
| `src/platforms/` | Isolate operating-system operations             | Linux MVP; other platforms empty |
| `dist/`          | Compiled Node.js action bundles                 | Generated; committed on tags     |

## 🖥️ Platform Strategy

The MVP targets GitHub-hosted Ubuntu and rejects self-hosted and non-Ubuntu
runners. macOS and Windows are future candidates. Architectures, runner images,
and external connectivity require further testing before production support
can be claimed.

## 🔐 Security Invariants

The implementation must mask private keys, avoid interpolating inputs into
shell commands, restrict configuration-file permissions before writing
secrets, and attempt independent cleanup operations even if one cleanup step
fails. Unit tests exercise these paths with mocks, but they are not a security
certification.

## ✅ Validation

Unit tests cover input validation and platform command construction. Integration
tests exercise privileged networking, DNS, and teardown against a peer isolated
on the same GitHub-hosted Ubuntu runner. An external-peer test runs on `main`
and can be requested on a trusted branch; its availability alone does not
establish external connectivity or production readiness.
