# Changesets

This folder stores changeset files that describe unreleased changes.

## Adding a changeset

When you make a user-facing change, run:

```bash
bun run changeset
```

Choose the semver bump (patch / minor / major), write a short summary, and commit the generated file with your PR.

## Release flow

1. Merge PRs with changeset files to `main`.
2. The **Release** workflow opens a **Version Packages** PR that bumps `package.json` and updates `CHANGELOG.md`.
3. Merge that PR — the workflow publishes to npm automatically.

## First-time npm setup

1. Create an [npm](https://www.npmjs.com/signup) account and verify the `rollterm` package name is available (or use a scoped name like `@divinprince/rollterm`).
2. Create an **Automation** token at [npmjs.com/settings/~/tokens](https://www.npmjs.com/settings/~/tokens).
3. Add it as the `NPM_TOKEN` secret in your GitHub repo (**Settings → Secrets and variables → Actions**).
4. Add a changeset for your first release, merge to `main`, then merge the Version Packages PR.
