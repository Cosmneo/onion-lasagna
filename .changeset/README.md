# Changesets

This folder holds [changesets](https://github.com/changesets/changesets) — one Markdown file
per pull request describing what changed and how it should bump the version.

All `@cosmneo/*` packages are versioned **in lockstep** (`fixed` in `config.json`): any changeset
bumps every package to the same new version.

## When you open a PR

Run:

```bash
bun changeset
```

Pick the bump type (patch / minor / major) and write a one-line summary. Commit the generated
`.changeset/*.md` file with your PR. PRs without a changeset are fine for non-published changes
(CI, docs, tests) — just choose "no bump".

## Releasing

See [`RELEASING.md`](../RELEASING.md). In short: `bun changeset version` computes the next version
and changelogs; pushing the resulting `vX.Y.Z` (or `vX.Y.Z-beta.N`) tag publishes via CI.
