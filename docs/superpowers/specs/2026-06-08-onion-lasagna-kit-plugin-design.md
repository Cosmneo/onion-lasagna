# Onion Lasagna Kit Plugin Design

## Context

Onion Lasagna needs an installable agent plugin ecosystem for Claude Code and Codex. The
plugin should teach agents how to create projects using the opinionated Onion Lasagna
structure proven by Omninode: explicit bounded contexts, clean domain/app/infra boundaries,
thin presentation handlers, bootstrap composition roots, read/write separation, and workflows
where cross-context compensation is needed.

The plugin will live in this repository, but it must remain an installable product boundary.
Claude Code copies installed plugins into a local plugin cache, and installed plugins cannot
depend on files outside their plugin root. Therefore every skill, reference, script, and agent
needed at runtime must be contained under `plugins/onion-lasagna-kit/`.

## Goals

- Provide a dual Claude Code and Codex plugin that can be installed from this repository.
- Include a router skill that decides which Onion Lasagna skill should be loaded for a task.
- Encode the good Omninode patterns without turning the plugin into a copy of the app or docs.
- Keep the plugin outside Bun/Turbo/package publishing workflows.
- Create skills using the `superpowers:writing-skills` RED/GREEN/REFACTOR process.

## Non-Goals

- Do not create an npm package for the plugin.
- Do not place the plugin under `packages/` or `apps/`.
- Do not make skills reference `../packages`, `../starters`, `../CLAUDE.md`, or Omninode files at
  runtime.
- Do not build every possible Onion Lasagna skill in v1.
- Do not use the plugin as a general documentation dump.

## Repository Layout

```text
onion-lasagna/
├── .claude-plugin/
│   └── marketplace.json
├── .agents/
│   └── plugins/
│       └── marketplace.json
└── plugins/
    └── onion-lasagna-kit/
        ├── .claude-plugin/
        │   └── plugin.json
        ├── .codex-plugin/
        │   └── plugin.json
        ├── skills/
        │   ├── onion-lasagna/
        │   │   └── SKILL.md
        │   ├── onion-lasagna-architect/
        │   │   └── SKILL.md
        │   ├── onion-lasagna-bounded-context/
        │   │   └── SKILL.md
        │   ├── onion-lasagna-domain/
        │   │   └── SKILL.md
        │   ├── onion-lasagna-use-case/
        │   │   └── SKILL.md
        │   ├── onion-lasagna-adapter/
        │   │   └── SKILL.md
        │   ├── onion-lasagna-route/
        │   │   └── SKILL.md
        │   └── onion-lasagna-review/
        │       └── SKILL.md
        ├── agents/
        │   ├── onion-investigator.md
        │   ├── onion-architect.md
        │   └── onion-reviewer.md
        ├── scripts/
        │   ├── check-boundaries.ts
        │   └── inspect-onion-project.ts
        └── references/
            ├── omninode-patterns.md
            ├── architecture-rules.md
            ├── layer-checklist.md
            └── package-entrypoints.md
```

## Marketplace Design

Claude Code will use a repository-level marketplace catalog:

```json
{
  "name": "onion-lasagna",
  "owner": {
    "name": "Cosmneo"
  },
  "plugins": [
    {
      "name": "onion-lasagna-kit",
      "source": "./plugins/onion-lasagna-kit",
      "description": "Opinionated Onion Lasagna architecture and implementation skills"
    }
  ]
}
```

Codex will use the repo/team marketplace location expected by the Codex plugin creator:
`.agents/plugins/marketplace.json`.

```json
{
  "name": "onion-lasagna",
  "interface": {
    "displayName": "Onion Lasagna"
  },
  "plugins": [
    {
      "name": "onion-lasagna-kit",
      "source": {
        "source": "local",
        "path": "./plugins/onion-lasagna-kit"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Development"
    }
  ]
}
```

The plugin folder itself will contain both manifests. The Claude manifest defines the plugin
identity for Claude Code. The Codex manifest defines the same plugin identity for Codex and must
follow the local Codex plugin validation contract: strict semver `version`, `author.name`, a
`skills` path, and the required `interface` fields such as `displayName`, `shortDescription`,
`longDescription`, `developerName`, `category`, `capabilities`, and starter prompts.

Claude runtime scripts should use Claude's plugin-root mechanism when referencing bundled files.
For Claude Code, that means `${CLAUDE_PLUGIN_ROOT}`. Codex scripts must not assume a
Claude-specific environment variable exists. Shared scripts should prefer resolving paths relative
to their own file or accept an explicit plugin-root argument.

## Plugin Manifest Minimums

The Claude manifest at `plugins/onion-lasagna-kit/.claude-plugin/plugin.json` should include:

- `name`: `onion-lasagna-kit`
- `version`: strict semver
- `description`: short plugin purpose
- `author.name`: `Cosmneo`
- `license`: `MIT`
- useful `keywords`

The Codex manifest at `plugins/onion-lasagna-kit/.codex-plugin/plugin.json` should include the
same identity plus:

- `skills`: `./skills/`
- `interface.displayName`
- `interface.shortDescription`
- `interface.longDescription`
- `interface.developerName`
- `interface.category`
- `interface.capabilities`
- `interface.defaultPrompt`

Codex validation should reject unsupported manifest fields and missing local assets. Do not include
`apps` or `mcpServers` unless `.app.json` or `.mcp.json` exist in the plugin root.

## Skill Architecture

The entrypoint skill is `onion-lasagna`, the router. It should stay small and load before deeper
skills when a user asks for Onion Lasagna design, implementation, migration, or review work.
Its responsibility is to inspect the task and choose the focused skill.

Initial v1 skills:

- `onion-lasagna`: routes tasks and enforces the inspect-before-assume rule.
- `onion-lasagna-architect`: designs bounded contexts, package choices, read/write shape, and
  workflow boundaries.
- `onion-lasagna-bounded-context`: creates the Omninode-style bounded context skeleton and
  bootstrap flow.
- `onion-lasagna-domain`: creates aggregates, entities, value objects, events, and invariants.
- `onion-lasagna-use-case`: creates `BaseInboundAdapter` use cases, app ports, and two-phase
  authorization/handling.
- `onion-lasagna-adapter`: creates outbound ports, repository/external-service adapters, and
  `BaseOutboundAdapter` error-wrapping boundaries.
- `onion-lasagna-route`: creates HTTP or GraphQL schema and handler surfaces with Onion Lasagna
  route builders.
- `onion-lasagna-review`: audits an existing project for layering, dependency direction, error
  handling, validation placement, and test gaps.

Future skills may include `onion-lasagna-read-model`, `onion-lasagna-workflow`,
`onion-lasagna-client`, and `onion-lasagna-migrate`, but the router must not route to skills that
do not exist.

## Router Decision Rules

The router should choose skills by task shape:

- New project or system design: use `onion-lasagna-architect`.
- New module or bounded context: use `onion-lasagna-bounded-context`.
- Domain model, aggregate, value object, or event: use `onion-lasagna-domain`.
- Use case, command, query, permission check, or application port: use `onion-lasagna-use-case`.
- Repository adapter, external API adapter, persistence adapter, or outbound port: use
  `onion-lasagna-adapter`.
- HTTP, GraphQL, event route, schema adapter, handler, or mapper: use `onion-lasagna-route`.
- Existing code assessment, refactor advice, or "by the book" check: use `onion-lasagna-review`.

The router must tell the agent to inspect actual code and exports before changing anything.
It should prefer `rg`, `find`, and file reads over assumptions.

## Reference Design

References should be compact and loaded only when needed:

- `omninode-patterns.md`: distilled good patterns from Omninode, including bounded-context
  layout, bootstrap flow, thin GraphQL handlers, read/write separation, and saga usage.
- `architecture-rules.md`: dependency direction, layer responsibilities, validation placement,
  and error-flow rules.
- `layer-checklist.md`: review checklist for each layer.
- `package-entrypoints.md`: known package entry points and a reminder to verify exports in code.

References must not require Omninode or this repository to exist after installation.

## Agents

The plugin should include three optional specialized agents:

- `onion-investigator`: read-only scanner for actual exports, project shape, and current usage.
- `onion-architect`: design-focused agent for bounded context and flow decisions.
- `onion-reviewer`: strict reviewer for layer violations, hidden infra dependencies, and
  missing verification.

Agents should be helpful accelerators, not required for basic skill usage.

## Scripts

`scripts/check-boundaries.ts` should scan for common boundary violations:

- domain importing infra, presentation, HTTP, GraphQL, Drizzle, framework adapters, or external API
  code.
- app use cases importing concrete infra instead of ports.
- route handlers importing repositories directly.
- plugin runtime files referencing paths outside `plugins/onion-lasagna-kit/`.

`scripts/inspect-onion-project.ts` should summarize an Onion Lasagna project:

- packages in use.
- bounded contexts discovered.
- entry points used.
- route surfaces.
- read/write/orchestration directories.

Scripts are supporting tools. Skills should tell agents when to run them but not rely on them as
the only source of truth. Scripts should be zero-dependency or explicitly document their runtime,
because installed plugin users may not have this monorepo's dependencies installed.

## Skill Creation Workflow

Every skill must be created with the `superpowers:writing-skills` process:

1. Write a pressure scenario for the skill.
2. Run the scenario without the skill and capture baseline failure.
3. Write the smallest useful `SKILL.md`.
4. Run the same scenario with the skill.
5. Tighten the skill only for observed failures.

Each `SKILL.md` must use a search-optimized frontmatter description that starts with `Use when`
and describes triggering conditions only. Descriptions must not summarize the workflow, because
agents may follow the description without reading the full skill.

Leaf skills should be tested before the router. A router has meaningful behavior only after at
least two real destination skills exist, so the first implementation pass should create and test
`onion-lasagna-review` and `onion-lasagna-adapter`, then create and test the router against those
real choices.

## Validation

Initial validation should include:

- Claude manifest shape check with `claude plugin validate` when available.
- Codex plugin validation using the local Codex plugin validation script when available.
- A self-containment check that no plugin file refers to runtime paths outside
  `plugins/onion-lasagna-kit/`.
- A reference drift check that entry points listed in `package-entrypoints.md` still exist under
  `packages/`.
- An end-to-end install smoke test for the Claude marketplace and a matching Codex marketplace or
  local plugin-loading smoke test.
- Boundary script smoke tests against this repository and, optionally, Omninode.
- One pressure-test transcript per skill before it is considered deployable.

## Risks

- Skills may become too broad. Keep each skill focused on one layer or decision surface.
- The router may become a documentation dump. Keep it as a decision tree.
- References may drift from actual package exports. Include reminders and scripts that force
  export verification.
- Repo-wide `prettier --write .` and `eslint . --fix` may touch plugin files. Default to keeping
  hand-written plugin Markdown and scripts compatible with repo formatting. Ignore only generated
  artifacts or assets that formatting tools cannot safely handle.
- The plugin may accidentally enter release tooling. Keep it under `plugins/`, not `packages/` or
  `apps/`.
- Plugin versioning is independent from package changesets. Bump the plugin manifest version when
  released plugin behavior changes, even when package versions do not change.

## Implementation Order

1. Scaffold `plugins/onion-lasagna-kit/` with both plugin manifests.
2. Add repository-level Claude and Codex marketplace catalogs.
3. Create and test `onion-lasagna-review`.
4. Create and test `onion-lasagna-adapter`.
5. Add references needed by the first two skills.
6. Create and test the router skill against the real review and adapter destinations.
7. Create and test architect, bounded-context, domain, use-case, and route skills one at a time.
8. Add scripts after at least one skill test shows they would reduce repeated manual checking.
