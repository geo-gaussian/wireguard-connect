# 🏗️ Architecture

> **Testing:** The lifecycle below has runner-local integration coverage and
> has been tested against a configured external peer on a development branch.

## 🎯 Design Goal

The action is intended to create a temporary WireGuard connection for one
workflow job and remove the tunnel and any related DNS configuration afterward.
The implementation keeps shared input validation separate from
operating-system-specific commands.

## 🔄 Action Lifecycle

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

| Area             | Intended responsibility                         | Current state                      |
| :--------------- | :---------------------------------------------- | :--------------------------------- |
| `src/main.ts`    | Validate inputs and start the tunnel            | Ubuntu implementation              |
| `src/post.ts`    | Revert DNS and tear down the tunnel             | Best-effort cleanup                |
| `src/config.ts`  | Parse inputs and render WireGuard configuration | Implemented                        |
| `src/platforms/` | Isolate operating-system operations             | Linux implementation; others empty |
| `dist/`          | Compiled Node.js action bundles                 | Generated; committed on tags       |

## 🖥️ Platform Strategy

The action targets GitHub-hosted Ubuntu and rejects self-hosted and non-Ubuntu
runners. macOS and Windows are future candidates. Architectures, runner images,
and external connectivity require further testing.

## 🔐 Security Invariants

The implementation must mask private keys, avoid interpolating inputs into
shell commands, restrict configuration-file permissions before writing
secrets, and attempt independent cleanup operations even if one cleanup step
fails. Unit tests exercise these paths with mocks, but they are not a security
certification.

## ✅ Validation

Unit tests cover input validation and platform command construction. Integration
tests exercise privileged networking, DNS, and teardown against a peer isolated
on the same GitHub-hosted Ubuntu runner. A manual external-peer test has passed
on a development branch; the workflow is configured to run it on `main` once
merged.
