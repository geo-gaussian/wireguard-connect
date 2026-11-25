# 🔌 WireGuard Connect Action

[![Build and test](https://github.com/geo-gaussian/wireguard-connect/actions/workflows/build-and-test.yaml/badge.svg?branch=main)](https://github.com/geo-gaussian/wireguard-connect/actions/workflows/build-and-test.yaml)
[![Coverage](https://codecov.io/github/geo-gaussian/wireguard-connect/graph/badge.svg?branch=main)](https://app.codecov.io/github/geo-gaussian/wireguard-connect)

> **Testing:** Integration tests cover a runner-local peer and a configured
> external peer. Cleanup is best-effort and may not run if a runner terminates
> unexpectedly.

The coverage badge reports unit tests, not integration tests.

## 🎯 Project Goal

WireGuard Connect is a GitHub Action that gives workflow jobs temporary access
to private network resources through a WireGuard tunnel. It supports optional
split DNS and attempts to clean up the tunnel and configuration after the job.

The implementation targets GitHub-hosted Ubuntu runners; macOS, Windows, and
self-hosted runners are not supported. See the [draft requirements](./BRD.md)
and [architecture](./ARCHITECTURE.md).

## 🚧 Current State

The action implements tunnel setup, optional split DNS and connectivity
checking, and best-effort post-job cleanup. Integration tests exercise a
disposable runner-local peer, DNS, and cleanup. The external-peer test runs on
pushes to `main` and can be requested on a trusted branch. A manual
external-peer test passed on a development branch.

## 🚀 Usage

This example uses the published `v0.2.0` release from another repository on a
GitHub-hosted Ubuntu runner. Review the [security policy](./SECURITY.md) before
providing credentials.

Before running it:

- Configure a separate WireGuard peer that accepts the client public key and
  address. Its endpoint must be reachable from the GitHub-hosted runner and
  any endpoint hostname must resolve before the tunnel is established.
- Add `WG_PRIVATE_KEY`, `WG_ENDPOINT`, and `PRIVATE_SERVICE_URL` as secrets in
  the consuming repository. The URL must identify a service reachable through
  the tunnel.
- Add `WG_ADDRESS`, `WG_SERVER_PUBLIC_KEY`, and `WG_ALLOWED_IPS` as repository
  variables.
- If the action repository is private, enable
  [access from the consuming repository](https://docs.github.com/en/actions/how-tos/reuse-automations/share-across-private-repositories).

```yaml
name: WireGuard connection

on: workflow_dispatch

jobs:
  connect:
    runs-on: ubuntu-latest
    steps:
      - name: Connect to WireGuard
        uses: geo-gaussian/wireguard-connect@v0.2.0
        with:
          private-key: ${{ secrets.WG_PRIVATE_KEY }}
          address: ${{ vars.WG_ADDRESS }}
          server-public-key: ${{ vars.WG_SERVER_PUBLIC_KEY }}
          endpoint: ${{ secrets.WG_ENDPOINT }}
          allowed-ips: ${{ vars.WG_ALLOWED_IPS }}
      - name: Reach a private service
        env:
          PRIVATE_SERVICE_URL: ${{ secrets.PRIVATE_SERVICE_URL }}
        run: curl --fail -- "$PRIVATE_SERVICE_URL"
```

Use a published version tag: `@main` does not contain the compiled action and
cannot be used directly. Maintainers must not move or reuse tags.

### 📥 Inputs and Output

| Input               | Required | Description                                                                                            |
| :------------------ | :------- | :----------------------------------------------------------------------------------------------------- |
| `private-key`       | Yes      | Base64-encoded 32-byte client private key; use a GitHub secret.                                        |
| `address`           | Yes      | Single client IP address with a CIDR prefix.                                                           |
| `server-public-key` | Yes      | Base64-encoded 32-byte server public key.                                                              |
| `endpoint`          | Yes      | Server hostname or IP address and port from 1 to 65535; IPv6 addresses use brackets.                   |
| `allowed-ips`       | Yes      | Comma-separated CIDR networks routed through the tunnel.                                               |
| `dns-server`        | No       | Private DNS server IP address; requires `dns-domains`.                                                 |
| `dns-domains`       | No       | Space-separated route-only DNS suffixes; requires `dns-server`.                                        |
| `verify-host`       | No       | IP address or hostname to ping after setup; targets that block ICMP may fail despite a working tunnel. |

The optional DNS server must be reachable through the configured routes.
If the private service URL needs private DNS, supply both DNS inputs.
After successful setup, the `interface` output contains the generated
WireGuard interface name.

### 🧹 Tunnel Lifecycle

Specify only necessary `allowed-ips`: routing all traffic through the tunnel
may interrupt the runner's connection to GitHub. The action requires `sudo`,
`apt-get` if installation is needed, and `resolvectl` for split DNS. Subsequent
steps in the same job can use the tunnel. At job end, the action attempts to
revert DNS, stop the tunnel, and remove its temporary configuration. Cleanup is
best-effort and may not run if the runner terminates before the post step.

### 🛠️ Testing a Checkout

For local development, build a checked-out copy with `pnpm install` and
`pnpm run build` before using `uses: ./` with the same inputs. This is not a
substitute for a published release tag in consuming repositories.

## 🧰 Development

Use Node.js 24 or later (Node.js 26 LTS recommended) and pnpm 12.21.0 for
development:

```sh
pnpm install
pnpm run setup-hooks
pnpm run lint
pnpm test
pnpm run build
```

CI tests Node.js 24, the action runtime; other development versions are not
tested in CI.

See the [development guide](./DEVELOPMENT.md) and
[contribution guide](./CONTRIBUTING.md) for details.

## 🧭 Spec-Driven Development

This repository is initialised with GitHub Spec Kit and its Copilot skills.
Start new work with `/speckit-specify`, then use `/speckit-plan`,
`/speckit-tasks`, and `/speckit-implement` as appropriate. The project
principles are in the [Spec Kit constitution](./.specify/memory/constitution.md).

## 📚 Project Documents

- [Architecture](./ARCHITECTURE.md)
- [Draft requirements](./BRD.md)
- [Development guide](./DEVELOPMENT.md)
- [Security policy](./SECURITY.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Documentation index](./docs/README.md)

## ⚖️ Licence

This project is licensed under the [BSD 3-Clause License](./LICENSE).
