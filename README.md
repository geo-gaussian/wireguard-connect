# 🔌 WireGuard Connect Action

> **Early development:** An Ubuntu MVP is implemented, but has not yet been
> validated end-to-end on a GitHub-hosted runner. Do not use it in production.

## 🎯 Project Goal

WireGuard Connect is intended to become a GitHub Action that gives workflow jobs
temporary access to private network resources through a WireGuard tunnel. The
project aims to support split-DNS and reliable teardown without exposing tunnel
secrets in logs or leaving runner configuration behind.

The implementation targets GitHub-hosted Ubuntu runners; macOS, Windows, and
self-hosted runners are not supported. See the [draft requirements](./BRD.md)
and [architecture](./ARCHITECTURE.md).

## 🚧 Current State

The MVP implements tunnel setup, optional split DNS and connectivity checking,
and best-effort post-job cleanup. Unit tests mock operating-system commands;
real tunnel and DNS behaviour still requires integration testing. No supported
release is available yet.

## 🚀 Trial Usage

This example is for testing the experimental `v0.1.0` MVP from another
repository on a GitHub-hosted Ubuntu runner. It works once that tag has been
published. Do not use production secrets with this unverified MVP.

Before running it:

- Configure a separate WireGuard peer that accepts the client public key and
  address. Its endpoint must be reachable from the GitHub-hosted runner.
- Add `WG_PRIVATE_KEY` as a secret in the consuming repository. Add
  `WG_ADDRESS`, `WG_SERVER_PUBLIC_KEY`, `WG_ENDPOINT`, and `WG_ALLOWED_IPS`
  as repository variables.
- Add `PRIVATE_SERVICE_URL` as a repository variable containing the URL of a
  service reachable through the tunnel.
- If the action repository is private, enable
  [access from the consuming repository](https://docs.github.com/en/actions/how-tos/reuse-automations/share-across-private-repositories).

```yaml
name: Trial WireGuard connection

on: workflow_dispatch

jobs:
  connect:
    runs-on: ubuntu-latest
    steps:
      - name: Connect to WireGuard
        uses: geo-gaussian/wireguard-connect@v0.1.0
        with:
          private-key: ${{ secrets.WG_PRIVATE_KEY }}
          address: ${{ vars.WG_ADDRESS }}
          server-public-key: ${{ vars.WG_SERVER_PUBLIC_KEY }}
          endpoint: ${{ vars.WG_ENDPOINT }}
          allowed-ips: ${{ vars.WG_ALLOWED_IPS }}
      - name: Reach a private service
        env:
          PRIVATE_SERVICE_URL: ${{ vars.PRIVATE_SERVICE_URL }}
        run: curl --fail -- "$PRIVATE_SERVICE_URL"
```

This version is intended only for trials and is not a supported production
release. Unlike `@main`, the version tag identifies the intended release;
maintainers must not move or reuse it.

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
best-effort and cannot run if the runner terminates unexpectedly.

### 🛠️ Testing a Checkout

To try a checked-out copy of this action instead, use `actions/checkout@v7`
followed by `uses: ./` with the same inputs.

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
