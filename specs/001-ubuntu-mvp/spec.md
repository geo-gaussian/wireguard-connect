# 🔌 Ubuntu WireGuard MVP

**Status:** Implemented; live runner acceptance remains unverified.

## 🎯 User Scenarios

1. A GitHub-hosted Ubuntu job supplies a client key, address, server key,
   endpoint, and allowed networks to connect to a private WireGuard peer.
2. A job optionally routes selected DNS suffixes to a private DNS server.
3. A job optionally checks connectivity to an internal host after setup.
4. At the end of the job, the action attempts to revert DNS, stop the tunnel,
   and remove the temporary configuration, including after setup failures.

## 📋 Requirements

- Accept structured inputs and validate them before system changes.
- Mask the private key before reading other inputs or emitting diagnostics.
- Install WireGuard tools only when they are not already available.
- Create the configuration with restrictive permissions before writing secrets.
- Pass command arguments separately without interpolating user-controlled values.
- Make split DNS and connectivity checking optional.
- Record setup state as early as necessary for best-effort cleanup.
- Attempt independent cleanup operations even when an earlier operation fails.
- Report setup and cleanup failures without logging private configuration.
- Reject unsupported platforms rather than implying support.

## 🧪 Acceptance

- Unit tests cover input validation, command construction, secret handling,
  optional features, and partial failures in setup and cleanup.
- A GitHub-hosted Ubuntu integration test demonstrates tunnel connectivity,
  split DNS, and cleanup before platform support is claimed.
- The committed action bundles match the TypeScript source.

## 🚫 Scope and Limitations

This MVP targets GitHub-hosted Ubuntu runners. macOS, Windows, and self-hosted
runners are not supported. The remote WireGuard peer is provisioned separately.
Cleanup cannot be guaranteed if the runner stops before the post step runs.
