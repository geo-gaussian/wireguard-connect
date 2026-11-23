# 🤝 Contributing

Thanks for helping build WireGuard Connect. The project is currently an
unverified Ubuntu MVP, so contributions should distinguish implemented
behaviour from behaviour that has been tested on real runners.

## 🚀 Getting Started

Use Node.js 24 or later (Node.js 26 LTS recommended) and pnpm 12.21.0:

```sh
pnpm install
pnpm run setup-hooks
```

Open or create a Spec Kit feature specification before starting substantial
feature work.

## ✅ Before Submitting

Run the checks that apply to your change:

```sh
pnpm run lint
pnpm test
pnpm run build
```

Changes to `src/` must include the updated bundle in `dist/`. Keep tests and
documentation in step with the behaviour they describe.

## 🧪 Tests and Platform Claims

Add focused unit tests for new logic and failure cases. Network setup, split
DNS, and cleanup need platform integration tests before any OS or architecture
is described as verified. The current MVP does not provide those tests.

## 🔐 Security

Never add secrets or live private keys to source code, fixtures, logs, or
examples. Follow the security requirements in [AGENTS.md](./AGENTS.md) and the
[security policy](./SECURITY.md).

## 📝 Documentation Style

Use British English (en-GB) spelling, emojis in project-authored Markdown
headings at levels 1–3, and two-space indentation. Run cspell and keep the
README, development guide, architecture, and requirements consistent with the
actual implementation. Preserve external names, identifiers, and licence
text as published.

Use the `.yaml` extension for project-authored YAML files. Preserve filenames
required by Spec Kit-managed assets.

## 📬 Pull Requests

Describe the change and its verification clearly. Mark tests or platform
behaviour that remains unverified; do not describe the MVP as production
ready.
