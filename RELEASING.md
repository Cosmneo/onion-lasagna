# Releasing

`@cosmneo/*` is a **lockstep** monorepo (all packages share one version) published to npm with two
channels via **dist-tags**:

| Channel | npm dist-tag | git tag shape   | install                               |
| ------- | ------------ | --------------- | ------------------------------------- |
| stable  | `latest`     | `vX.Y.Z`        | `bun add @cosmneo/onion-lasagna`      |
| beta    | `beta`       | `vX.Y.Z-beta.N` | `bun add @cosmneo/onion-lasagna@beta` |

There are **no release branches** — channels are dist-tags, and the **git tag drives the publish**
(`.github/workflows/publish.yml` runs on `v*` tags). `scripts/publish-all.ts` picks `beta` vs
`latest` automatically based on whether the version is a prerelease.

## Day-to-day (every PR)

1. Branch off `main`, make your change.
2. Add a changeset: `bun changeset` → choose bump type + summary → commit the `.changeset/*.md`.
3. Open the PR. **CI** (`.github/workflows/ci.yml`) must pass: build (typecheck) + tests + format.
4. Squash-merge to `main`.

## Cutting a stable release

```bash
git switch main && git pull
bun changeset version          # bumps all @cosmneo/* in lockstep + writes CHANGELOGs
git commit -am "release: vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags    # publish.yml → npm @latest + GitHub Release
```

## Cutting / iterating a beta

```bash
bun changeset pre enter beta   # enter prerelease mode (once per beta cycle)
bun changeset version          # produces X.Y.Z-beta.0 (then .1, .2, … on repeat)
git commit -am "release: vX.Y.Z-beta.0"
git tag vX.Y.Z-beta.0
git push origin main --tags    # publish.yml → npm @beta (marked prerelease on GitHub)
```

QA installs `@cosmneo/onion-lasagna@beta` and validates.

### Promoting beta → stable

```bash
bun changeset pre exit         # leave prerelease mode
bun changeset version          # finalizes X.Y.Z
git commit -am "release: vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags    # publish.yml → npm @latest
```

Or promote the exact already-published beta build without rebuilding:

```bash
npm dist-tag add @cosmneo/onion-lasagna@X.Y.Z-beta.N latest   # (repeat per package, or script it)
```

## Manual / emergency path

`workflow_dispatch` on the publish workflow still supports a manual `version` input and `dry_run`,
and `scripts/bump-version.ts` can set versions directly if you ever need to bypass changesets.

## Prerequisites (one-time)

- Repo secret `NPM_TOKEN` (npm automation token with publish rights to the `@cosmneo` scope).
- Branch protection on `main`: require PR + the `CI / Build · typecheck · test` check + ≥1 review.
