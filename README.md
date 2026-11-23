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

The following example uses a checked-out copy of the action. It is intended for
testing only, with an independently configured WireGuard peer and GitHub
repository secret and variables:

```yaml
steps:
  - uses: actions/checkout@v7
  - uses: ./
    with:
      private-key: ${{ secrets.WG_PRIVATE_KEY }}
      address: ${{ vars.WG_ADDRESS }}
      server-public-key: ${{ vars.WG_SERVER_PUBLIC_KEY }}
      endpoint: ${{ vars.WG_ENDPOINT }}
      allowed-ips: ${{ vars.WG_ALLOWED_IPS }}
      dns-server: ${{ vars.WG_DNS_SERVER }}
      dns-domains: ${{ vars.WG_DNS_DOMAINS }}
      verify-host: ${{ vars.WG_VERIFY_HOST }}
```

`private-key` and `server-public-key` must each be a base64-encoded 32-byte
WireGuard key. Store the private key as a GitHub secret. The `endpoint` must
be a hostname or IP address followed by a port from 1 to 65535; IPv6 endpoints
use brackets.

`dns-server` and `dns-domains` are optional but must be supplied together.
`dns-domains` is a space-separated list of suffixes; `allowed-ips` is a
comma-separated list of CIDR networks. `address` is a single IP address with a
CIDR prefix. The DNS server must be an IP address reachable through the
configured routes. DNS suffixes are configured as route-only domains.
`verify-host` optionally performs an ICMP ping, which may fail if the target
blocks ICMP even when the tunnel is working. The `interface` output contains
the generated interface name.

Specify only necessary `allowed-ips`: routing all traffic through the tunnel
may interrupt the runner's connection to GitHub. The action requires `sudo`,
`apt-get` if installation is needed, and `resolvectl` for split DNS. Cleanup
is best-effort and cannot run if the runner terminates unexpectedly.

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
