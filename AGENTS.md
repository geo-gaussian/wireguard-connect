# 🤖 AGENTS.md — AI Coding Assistant Guidelines

## 🎯 Project Stage

This repository is in early development. An Ubuntu MVP implements WireGuard,
optional split DNS, connectivity checking, and best-effort cleanup, but its
real runner behaviour has not yet been validated. Do not describe it as
production ready or claim verified platform support.

## 🧰 Tooling

- Use pnpm 12.21.0 and Node.js 24 or later for repository development.
  Node.js 26 LTS is recommended.
- Do not use npm or yarn for dependency management.
- Install lifecycle scripts are disabled; do not override this protection.
  Run project scripts explicitly, for example with `pnpm run` or `pnpm test`.
- Use the scripts in `package.json` for linting, tests, builds, and hooks.

## 🔐 Security Requirements

When implementing tunnel support:

1. Mask a private key with `core.setSecret()` immediately after reading it.
   Never log a private key or rendered WireGuard configuration.
2. Validate user-controlled inputs with strict allowlist patterns. Pass command
   arguments as arrays to `@actions/exec` and never interpolate inputs into
   `sh -c` or `bash -c` strings.
3. Before writing secrets, restrict `.conf` permissions to `0600` on POSIX or
   an Administrator-only ACL on Windows. Overwrite and unlink configuration
   files during teardown.
4. Wrap independent teardown operations in `try/catch` blocks so a failure to
   revert DNS does not prevent tunnel teardown or configuration-file cleanup.
5. Report failures explicitly; do not silently default or return success when
   setup or cleanup has failed.

## 🧱 Code Organisation

- Keep shared input validation and configuration rendering in `src/config.ts`.
- Keep operating-system-specific commands in `src/platforms/`.
- Use strict TypeScript and avoid `any`.
- Check for installed WireGuard tools with `io.which` before invoking package
  managers, including on self-hosted runners.
- Use POSIX shell syntax and `#!/bin/sh` for project-owned shell scripts.
  Spec Kit-managed scripts are temporarily exempt.
- Store executable code, program configuration, and test fixtures in standalone
  files in their own language. Pass dynamic values as arguments, environment
  variables, or supported configuration variables. Do not embed programs in
  shell commands, workflow blocks, other languages' strings, or agent terminal
  commands, including interpreter `-c` or `-e` code and inline AWK, sed, or jq
  programs. Spec Kit-managed scripts under `.specify/scripts/` are exempt;
  obtain explicit user approval before adding any other exception. Short,
  syntax-highlighted documentation examples may explain a concept.
- Treat support for each operating system and architecture as unverified until
  appropriate tests pass.

## 🧪 Tests and Bundles

- Add focused tests for new behaviour and its failure cases.
- Add unit tests for every new platform command or validation rule, mocking
  `@actions/exec` and filesystem operations as appropriate.
- Run `pnpm run lint`, `pnpm test`, and `pnpm run build` for code changes.
- Keep release-tag `dist/` output synchronised with the TypeScript source.
- Do not claim real-runner integration coverage based on mocked unit tests.

## 📝 Documentation

- Project-authored Markdown headings at levels 1–3 must include a relevant
  emoji.
- Use two-space indentation in Markdown and preserve rendered list and code
  block structure.
- Use British English (en-GB) in project-authored prose. Preserve external
  names, identifiers, and licence text as published.
- Use the `.yaml` extension for project-authored YAML files.
- Preserve the `.yml` filenames required by Spec Kit-managed assets.
- Update docs when behaviour or development workflows change, and run cspell.
- Spec Kit-managed skills, scripts, templates, and workflows are generated
  assets; do not reformat or hand-edit them unless the Spec Kit workflow
  requires it.
- Keep examples free of credentials and other sensitive information.

## 🤖 Spec-Driven Workflow

Use `/speckit-specify` for new feature work before planning or implementation.
Keep specifications, plans, and tasks in the Spec Kit structure and update
this guidance when project-wide conventions change.
