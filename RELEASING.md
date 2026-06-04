# Releasing

`@cosmneo/*` is a **lockstep** monorepo (all packages share one version) published to npm with two
channels via **dist-tags**:

| Channel | npm dist-tag | install                               |
| ------- | ------------ | ------------------------------------- |
| stable  | `latest`     | `bun add @cosmneo/onion-lasagna`      |
| beta    | `beta`       | `bun add @cosmneo/onion-lasagna@beta` |

Releases are driven by the **Changesets bot** (`.github/workflows/release.yml`) — there are **no
release branches**, and you **don't cut tags by hand**. Beta vs stable is decided by Changesets
**pre-mode**; the bot publishes prereleases to `@beta` and normal releases to `@latest`.

## Day-to-day (every PR)

1. Branch off `main`, make your change.
2. Add a changeset: `bun changeset` → choose bump type + summary → commit the `.changeset/*.md`.
   (Non-publishing PRs — CI, docs, tests — can use `bun changeset add --empty`.)
3. Open the PR. **CI** (`.github/workflows/ci.yml`) must pass: build (typecheck) + tests + format.
4. Squash-merge to `main`.

## How a release happens (automatic)

On every push to `main`, the bot does one of two things:

1. **Unreleased changesets exist** → it opens / updates a **`chore: version packages`** PR that
   bumps every `@cosmneo/*` package in lockstep and writes the `CHANGELOG.md` files.
2. **That version PR has just merged** (no pending changesets) → it **builds and publishes** all
   packages to npm and creates GitHub Releases.

So a stable release is simply: **merge feature PRs → merge the bot's `version packages` PR.** Done.

## Beta releases (pre-mode)

```bash
# Enter beta mode (once per beta cycle) — via a PR to main:
bun changeset pre enter beta      # commits .changeset/pre.json
# → merge that PR. From now on the bot's version PR produces X.Y.Z-beta.N
#   and publishes to the `beta` dist-tag automatically.

# Iterate: keep merging PRs (each with a changeset) → merge the bot's version PR → new beta.
```

QA installs `@cosmneo/onion-lasagna@beta` and validates.

**Promote beta → stable:**

```bash
bun changeset pre exit            # leave beta mode (via a PR to main)
# → merge it; the next version PR finalizes X.Y.Z → publishes to `latest`.
```

Or promote an already-published beta build without rebuilding:

```bash
npm dist-tag add @cosmneo/onion-lasagna@X.Y.Z-beta.N latest   # (repeat per package, or script it)
```

## Manual / emergency path

`.github/workflows/publish.yml` is kept for manual publishing — run it from the **Actions** tab
(`workflow_dispatch`) with a `version` input (or `dry_run`). `scripts/bump-version.ts` can set
versions directly if you ever need to bypass changesets.

## Prerequisites (one-time)

- Repo secret **`NPM_TOKEN`** — npm automation token with publish rights to the `@cosmneo` scope. ✅
- Branch protection on `main` — require PR + the `Build · typecheck · test` check. ✅
- _Optional_ secret **`RELEASE_PAT`** — a repo-scoped token so the bot's `version packages` PR
  triggers CI (PRs opened with the default `GITHUB_TOKEN` don't run workflows). Without it, an admin
  can merge that PR directly (branch protection does not `enforce_admins`).
